const mongoose = require("mongoose");
const Package = require("../models/Package");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");
const { withPackageSchema } = require("../utils/packageSchema");

const sanitizeMainContent = (html) =>
    String(html || "")
        .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
        .replace(/\u00a0/g, " ")
        .replace(/<p>\s*<\/p>/gi, "")
        .replace(/<p><br\s*\/?><\/p>/gi, "")
        .replace(/ {2,}/g, " ")
        .trim();

const slugify = (value) =>
    String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

const parseJsonField = (raw, fallback) => {
    if (raw == null || raw === "") return fallback;
    if (typeof raw === "object") return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

const normalizeFaqs = (raw) => {
    const list = parseJsonField(raw, []);
    if (!Array.isArray(list)) return [];
    return list
        .map((item) => ({
            question: String(item?.question || "").trim(),
            answer: String(item?.answer || "").trim(),
        }))
        .filter((item) => item.question || item.answer);
};

const normalizeStringList = (raw) => {
    const list = parseJsonField(raw, Array.isArray(raw) ? raw : []);
    if (!Array.isArray(list)) return [];
    return list.map((item) => String(item || "").trim()).filter(Boolean);
};

const parsePriceFrom = (raw) => {
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
};

const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
    let slug = slugify(baseSlug) || `package-${Date.now()}`;
    let n = 0;
    while (true) {
        const candidate = n === 0 ? slug : `${slug}-${n}`;
        const filter = { slug: candidate };
        if (excludeId) filter._id = { $ne: excludeId };
        const exists = await Package.exists(filter);
        if (!exists) return candidate;
        n += 1;
    }
};

const createPackage = async (req, res, next) => {
    try {
        const {
            shortHeading,
            mainHeading,
            shortDescription,
            mainContent,
            duration,
            destinations,
            priceFrom,
            metaTitle,
            slug,
            canonical,
            metaKeywords,
            metaDescription,
            status,
            faqs,
            includes,
            excludes,
        } = req.body;

        if (!mainHeading || !String(mainHeading).trim()) {
            return res.status(400).json({ success: false, message: "Main heading is required" });
        }

        const mainFile = req.files?.mainImage?.[0];
        const otherFiles = req.files?.otherImages || [];
        const finalSlug = await ensureUniqueSlug(slug || mainHeading);

        const pkg = await Package.create({
            shortHeading: shortHeading ? String(shortHeading).trim() : "",
            mainHeading: String(mainHeading).trim(),
            shortDescription: shortDescription ? String(shortDescription).trim() : "",
            mainContent: mainContent != null ? sanitizeMainContent(mainContent) : "",
            duration: duration ? String(duration).trim() : "",
            destinations: normalizeStringList(destinations),
            priceFrom: parsePriceFrom(priceFrom),
            mainImage: mainFile ? toDocumentMeta(mainFile, "packages") : null,
            otherImages: otherFiles.map((f) => toDocumentMeta(f, "packages")),
            faqs: normalizeFaqs(faqs),
            includes: normalizeStringList(includes),
            excludes: normalizeStringList(excludes),
            metaTitle: metaTitle ? String(metaTitle).trim() : "",
            slug: finalSlug,
            canonical: canonical ? String(canonical).trim() : "",
            metaKeywords: metaKeywords ? String(metaKeywords).trim() : "",
            metaDescription: metaDescription ? String(metaDescription).trim() : "",
            status: ["DRAFT", "PUBLISHED", "INACTIVE"].includes(status) ? status : "DRAFT",
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: "Package created successfully",
            data: withPackageSchema(pkg),
        });
    } catch (error) {
        next(error);
    }
};

const getPackages = async (req, res, next) => {
    try {
        const {
            search,
            status,
            page = 1,
            limit = 12,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = {};

        if (status) {
            if (!["DRAFT", "PUBLISHED", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            filter.status = status;
        }

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { mainHeading: { $regex: safe, $options: "i" } },
                { shortHeading: { $regex: safe, $options: "i" } },
                { slug: { $regex: safe, $options: "i" } },
                { metaTitle: { $regex: safe, $options: "i" } },
                { metaKeywords: { $regex: safe, $options: "i" } },
                { duration: { $regex: safe, $options: "i" } },
                { destinations: { $regex: safe, $options: "i" } },
            ];
        }

        const allowedSort = new Set(["createdAt", "updatedAt", "mainHeading", "status", "slug", "priceFrom"]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Package.countDocuments(filter),
            Package.find(filter)
                .populate("createdBy", "name email")
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data: data.map(withPackageSchema),
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getPackageById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid package ID format" });
        }

        const pkg = await Package.findById(req.params.id)
            .populate("createdBy", "name email")
            .lean();
        if (!pkg) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        res.status(200).json({ success: true, data: withPackageSchema(pkg) });
    } catch (error) {
        next(error);
    }
};

const updatePackage = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid package ID format" });
        }

        const pkg = await Package.findById(req.params.id);
        if (!pkg) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        const {
            shortHeading,
            mainHeading,
            shortDescription,
            mainContent,
            duration,
            destinations,
            priceFrom,
            metaTitle,
            slug,
            canonical,
            metaKeywords,
            metaDescription,
            status,
            faqs,
            includes,
            excludes,
            removeMainImage,
            keepOtherImageUrls,
        } = req.body;

        if (mainHeading !== undefined) {
            if (!String(mainHeading).trim()) {
                return res.status(400).json({ success: false, message: "Main heading cannot be empty" });
            }
            pkg.mainHeading = String(mainHeading).trim();
        }
        if (shortHeading !== undefined) pkg.shortHeading = String(shortHeading).trim();
        if (shortDescription !== undefined) pkg.shortDescription = String(shortDescription).trim();
        if (mainContent !== undefined) pkg.mainContent = sanitizeMainContent(mainContent);
        if (duration !== undefined) pkg.duration = String(duration).trim();
        if (destinations !== undefined) pkg.destinations = normalizeStringList(destinations);
        if (priceFrom !== undefined) pkg.priceFrom = parsePriceFrom(priceFrom);
        if (metaTitle !== undefined) pkg.metaTitle = String(metaTitle).trim();
        if (metaKeywords !== undefined) pkg.metaKeywords = String(metaKeywords).trim();
        if (metaDescription !== undefined) pkg.metaDescription = String(metaDescription).trim();
        if (canonical !== undefined) pkg.canonical = String(canonical).trim();
        if (faqs !== undefined) pkg.faqs = normalizeFaqs(faqs);
        if (includes !== undefined) pkg.includes = normalizeStringList(includes);
        if (excludes !== undefined) pkg.excludes = normalizeStringList(excludes);
        if (status !== undefined) {
            if (!["DRAFT", "PUBLISHED", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            pkg.status = status;
        }
        if (slug !== undefined && String(slug).trim()) {
            pkg.slug = await ensureUniqueSlug(slug, pkg._id);
        }

        const mainFile = req.files?.mainImage?.[0];
        if (mainFile) {
            if (pkg.mainImage) removeLocalFile(pkg.mainImage);
            pkg.mainImage = toDocumentMeta(mainFile, "packages");
        } else if (removeMainImage === "true" || removeMainImage === true) {
            if (pkg.mainImage) removeLocalFile(pkg.mainImage);
            pkg.mainImage = null;
        }

        if (keepOtherImageUrls !== undefined) {
            const keep = parseJsonField(keepOtherImageUrls, []);
            const keepSet = new Set(Array.isArray(keep) ? keep.map(String) : []);
            const retained = [];
            for (const img of pkg.otherImages || []) {
                if (keepSet.has(img.url)) retained.push(img);
                else removeLocalFile(img);
            }
            pkg.otherImages = retained;
        }

        const otherFiles = req.files?.otherImages || [];
        if (otherFiles.length) {
            pkg.otherImages = [
                ...(pkg.otherImages || []),
                ...otherFiles.map((f) => toDocumentMeta(f, "packages")),
            ];
        }

        await pkg.save();

        res.status(200).json({
            success: true,
            message: "Package updated successfully",
            data: withPackageSchema(pkg),
        });
    } catch (error) {
        next(error);
    }
};

const changePackageStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid package ID format" });
        }

        const { status } = req.body;
        if (!["DRAFT", "PUBLISHED", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const pkg = await Package.findById(req.params.id);
        if (!pkg) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        pkg.status = status;
        await pkg.save();

        res.status(200).json({
            success: true,
            message: `Package marked as ${status}`,
            data: withPackageSchema(pkg),
        });
    } catch (error) {
        next(error);
    }
};

const deletePackage = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid package ID format" });
        }

        const pkg = await Package.findById(req.params.id);
        if (!pkg) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        if (pkg.mainImage) removeLocalFile(pkg.mainImage);
        for (const img of pkg.otherImages || []) removeLocalFile(img);

        await pkg.deleteOne();

        res.status(200).json({ success: true, message: "Package deleted successfully" });
    } catch (error) {
        next(error);
    }
};

const getPublishedPackages = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 48 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = { status: "PUBLISHED" };

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { mainHeading: { $regex: safe, $options: "i" } },
                { shortHeading: { $regex: safe, $options: "i" } },
                { slug: { $regex: safe, $options: "i" } },
                { destinations: { $regex: safe, $options: "i" } },
            ];
        }

        const [total, data] = await Promise.all([
            Package.countDocuments(filter),
            Package.find(filter)
                .select(
                    "shortHeading mainHeading shortDescription duration destinations priceFrom mainImage slug metaTitle metaDescription metaKeywords canonical createdAt updatedAt"
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data: data.map(withPackageSchema),
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getPublishedPackageBySlug = async (req, res, next) => {
    try {
        const slug = slugify(req.params.slug);
        if (!slug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        const pkg = await Package.findOne({ slug, status: "PUBLISHED" }).lean();
        if (!pkg) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        res.status(200).json({ success: true, data: withPackageSchema(pkg) });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPackage,
    getPackages,
    getPackageById,
    updatePackage,
    changePackageStatus,
    deletePackage,
    getPublishedPackages,
    getPublishedPackageBySlug,
};
