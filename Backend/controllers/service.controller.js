const mongoose = require("mongoose");
const Service = require("../models/Service");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");
const { withServiceSchema } = require("../utils/serviceSchema");

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

const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
    let slug = slugify(baseSlug) || `service-${Date.now()}`;
    let n = 0;
    while (true) {
        const candidate = n === 0 ? slug : `${slug}-${n}`;
        const filter = { slug: candidate };
        if (excludeId) filter._id = { $ne: excludeId };
        const exists = await Service.exists(filter);
        if (!exists) return candidate;
        n += 1;
    }
};

const createService = async (req, res, next) => {
    try {
        const {
            shortHeading,
            mainHeading,
            shortDescription,
            mainContent,
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

        const service = await Service.create({
            shortHeading: shortHeading ? String(shortHeading).trim() : "",
            mainHeading: String(mainHeading).trim(),
            shortDescription: shortDescription ? String(shortDescription).trim() : "",
            mainContent: mainContent != null ? sanitizeMainContent(mainContent) : "",
            mainImage: mainFile ? toDocumentMeta(mainFile, "services") : null,
            otherImages: otherFiles.map((f) => toDocumentMeta(f, "services")),
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
            message: "Service created successfully",
            data: withServiceSchema(service),
        });
    } catch (error) {
        next(error);
    }
};

const getServices = async (req, res, next) => {
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
            ];
        }

        const allowedSort = new Set(["createdAt", "updatedAt", "mainHeading", "status", "slug"]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Service.countDocuments(filter),
            Service.find(filter)
                .populate("createdBy", "name email")
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data: data.map(withServiceSchema),
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getServiceById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid service ID format" });
        }

        const service = await Service.findById(req.params.id)
            .populate("createdBy", "name email")
            .lean();
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        res.status(200).json({ success: true, data: withServiceSchema(service) });
    } catch (error) {
        next(error);
    }
};

const updateService = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid service ID format" });
        }

        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        const {
            shortHeading,
            mainHeading,
            shortDescription,
            mainContent,
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
            service.mainHeading = String(mainHeading).trim();
        }
        if (shortHeading !== undefined) service.shortHeading = String(shortHeading).trim();
        if (shortDescription !== undefined) service.shortDescription = String(shortDescription).trim();
        if (mainContent !== undefined) service.mainContent = sanitizeMainContent(mainContent);
        if (metaTitle !== undefined) service.metaTitle = String(metaTitle).trim();
        if (metaKeywords !== undefined) service.metaKeywords = String(metaKeywords).trim();
        if (metaDescription !== undefined) service.metaDescription = String(metaDescription).trim();
        if (canonical !== undefined) service.canonical = String(canonical).trim();
        if (faqs !== undefined) service.faqs = normalizeFaqs(faqs);
        if (includes !== undefined) service.includes = normalizeStringList(includes);
        if (excludes !== undefined) service.excludes = normalizeStringList(excludes);
        if (status !== undefined) {
            if (!["DRAFT", "PUBLISHED", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            service.status = status;
        }
        if (slug !== undefined && String(slug).trim()) {
            service.slug = await ensureUniqueSlug(slug, service._id);
        }

        const mainFile = req.files?.mainImage?.[0];
        if (mainFile) {
            if (service.mainImage) removeLocalFile(service.mainImage);
            service.mainImage = toDocumentMeta(mainFile, "services");
        } else if (removeMainImage === "true" || removeMainImage === true) {
            if (service.mainImage) removeLocalFile(service.mainImage);
            service.mainImage = null;
        }

        if (keepOtherImageUrls !== undefined) {
            const keep = parseJsonField(keepOtherImageUrls, []);
            const keepSet = new Set(Array.isArray(keep) ? keep.map(String) : []);
            const retained = [];
            for (const img of service.otherImages || []) {
                if (keepSet.has(img.url)) retained.push(img);
                else removeLocalFile(img);
            }
            service.otherImages = retained;
        }

        const otherFiles = req.files?.otherImages || [];
        if (otherFiles.length) {
            service.otherImages = [
                ...(service.otherImages || []),
                ...otherFiles.map((f) => toDocumentMeta(f, "services")),
            ];
        }

        await service.save();

        res.status(200).json({
            success: true,
            message: "Service updated successfully",
            data: withServiceSchema(service),
        });
    } catch (error) {
        next(error);
    }
};

const changeServiceStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid service ID format" });
        }

        const { status } = req.body;
        if (!["DRAFT", "PUBLISHED", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        service.status = status;
        await service.save();

        res.status(200).json({
            success: true,
            message: `Service marked as ${status}`,
            data: withServiceSchema(service),
        });
    } catch (error) {
        next(error);
    }
};

const deleteService = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid service ID format" });
        }

        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        if (service.mainImage) removeLocalFile(service.mainImage);
        for (const img of service.otherImages || []) removeLocalFile(img);

        await service.deleteOne();

        res.status(200).json({ success: true, message: "Service deleted successfully" });
    } catch (error) {
        next(error);
    }
};

const getPublishedServices = async (req, res, next) => {
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
            ];
        }

        const [total, data] = await Promise.all([
            Service.countDocuments(filter),
            Service.find(filter)
                .select(
                    "shortHeading mainHeading shortDescription mainImage slug metaTitle metaDescription metaKeywords canonical createdAt updatedAt"
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data: data.map(withServiceSchema),
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getPublishedServiceBySlug = async (req, res, next) => {
    try {
        const slug = slugify(req.params.slug);
        if (!slug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        const service = await Service.findOne({ slug, status: "PUBLISHED" }).lean();
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        res.status(200).json({ success: true, data: withServiceSchema(service) });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createService,
    getServices,
    getServiceById,
    updateService,
    changeServiceStatus,
    deleteService,
    getPublishedServices,
    getPublishedServiceBySlug,
};
