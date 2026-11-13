const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");
const { withBlogSchema } = require("../utils/blogSchema");

/** Quill often stores normal spaces as &nbsp; which breaks wrapping on the website. */
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

const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
    let slug = slugify(baseSlug) || `blog-${Date.now()}`;
    let n = 0;
    while (true) {
        const candidate = n === 0 ? slug : `${slug}-${n}`;
        const filter = { slug: candidate };
        if (excludeId) filter._id = { $ne: excludeId };
        const exists = await Blog.exists(filter);
        if (!exists) return candidate;
        n += 1;
    }
};

const createBlog = async (req, res, next) => {
    try {
        const {
            shortHeading,
            mainHeading,
            shortContent,
            mainContent,
            metaTitle,
            slug,
            metaKeywords,
            metaDescription,
            status,
            faqs,
        } = req.body;

        if (!mainHeading || !String(mainHeading).trim()) {
            return res.status(400).json({ success: false, message: "Main heading is required" });
        }

        const mainFile = req.files?.mainImage?.[0];
        const otherFiles = req.files?.otherImages || [];

        const finalSlug = await ensureUniqueSlug(slug || mainHeading);

        const blog = await Blog.create({
            shortHeading: shortHeading ? String(shortHeading).trim() : "",
            mainHeading: String(mainHeading).trim(),
            shortContent: shortContent ? String(shortContent).trim() : "",
            mainContent: mainContent != null ? sanitizeMainContent(mainContent) : "",
            mainImage: mainFile ? toDocumentMeta(mainFile, "blogs") : null,
            otherImages: otherFiles.map((f) => toDocumentMeta(f, "blogs")),
            faqs: normalizeFaqs(faqs),
            metaTitle: metaTitle ? String(metaTitle).trim() : "",
            slug: finalSlug,
            metaKeywords: metaKeywords ? String(metaKeywords).trim() : "",
            metaDescription: metaDescription ? String(metaDescription).trim() : "",
            status: ["DRAFT", "PUBLISHED", "INACTIVE"].includes(status) ? status : "DRAFT",
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: withBlogSchema(blog),
        });
    } catch (error) {
        next(error);
    }
};

const getBlogs = async (req, res, next) => {
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
            Blog.countDocuments(filter),
            Blog.find(filter)
                .populate("createdBy", "name email")
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data: data.map(withBlogSchema),
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getBlogById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid blog ID format" });
        }

        const blog = await Blog.findById(req.params.id).populate("createdBy", "name email").lean();
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        res.status(200).json({ success: true, data: withBlogSchema(blog) });
    } catch (error) {
        next(error);
    }
};

const updateBlog = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid blog ID format" });
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        const {
            shortHeading,
            mainHeading,
            shortContent,
            mainContent,
            metaTitle,
            slug,
            metaKeywords,
            metaDescription,
            status,
            faqs,
            removeMainImage,
            keepOtherImageUrls,
        } = req.body;

        if (mainHeading !== undefined) {
            if (!String(mainHeading).trim()) {
                return res.status(400).json({ success: false, message: "Main heading cannot be empty" });
            }
            blog.mainHeading = String(mainHeading).trim();
        }
        if (shortHeading !== undefined) blog.shortHeading = String(shortHeading).trim();
        if (shortContent !== undefined) blog.shortContent = String(shortContent).trim();
        if (mainContent !== undefined) blog.mainContent = sanitizeMainContent(mainContent);
        if (metaTitle !== undefined) blog.metaTitle = String(metaTitle).trim();
        if (metaKeywords !== undefined) blog.metaKeywords = String(metaKeywords).trim();
        if (metaDescription !== undefined) blog.metaDescription = String(metaDescription).trim();
        if (faqs !== undefined) blog.faqs = normalizeFaqs(faqs);
        if (status !== undefined) {
            if (!["DRAFT", "PUBLISHED", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            blog.status = status;
        }
        if (slug !== undefined && String(slug).trim()) {
            blog.slug = await ensureUniqueSlug(slug, blog._id);
        }

        const mainFile = req.files?.mainImage?.[0];
        if (mainFile) {
            if (blog.mainImage) removeLocalFile(blog.mainImage);
            blog.mainImage = toDocumentMeta(mainFile, "blogs");
        } else if (removeMainImage === "true" || removeMainImage === true) {
            if (blog.mainImage) removeLocalFile(blog.mainImage);
            blog.mainImage = null;
        }

        if (keepOtherImageUrls !== undefined) {
            const keep = parseJsonField(keepOtherImageUrls, []);
            const keepSet = new Set(Array.isArray(keep) ? keep.map(String) : []);
            const retained = [];
            for (const img of blog.otherImages || []) {
                if (keepSet.has(img.url)) retained.push(img);
                else removeLocalFile(img);
            }
            blog.otherImages = retained;
        }

        const otherFiles = req.files?.otherImages || [];
        if (otherFiles.length) {
            blog.otherImages = [
                ...(blog.otherImages || []),
                ...otherFiles.map((f) => toDocumentMeta(f, "blogs")),
            ];
        }

        await blog.save();

        res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            data: withBlogSchema(blog),
        });
    } catch (error) {
        next(error);
    }
};

const changeBlogStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid blog ID format" });
        }

        const { status } = req.body;
        if (!["DRAFT", "PUBLISHED", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        blog.status = status;
        await blog.save();

        res.status(200).json({
            success: true,
            message: `Blog marked as ${status}`,
            data: withBlogSchema(blog),
        });
    } catch (error) {
        next(error);
    }
};

const deleteBlog = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid blog ID format" });
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        if (blog.mainImage) removeLocalFile(blog.mainImage);
        for (const img of blog.otherImages || []) removeLocalFile(img);

        await blog.deleteOne();

        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        next(error);
    }
};

/** Public website: published blogs only */
const getPublishedBlogs = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 12 } = req.query;
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
            Blog.countDocuments(filter),
            Blog.find(filter)
                .select(
                    "shortHeading mainHeading shortContent mainImage slug metaTitle metaDescription metaKeywords createdAt updatedAt"
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data: data.map(withBlogSchema),
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getPublishedBlogBySlug = async (req, res, next) => {
    try {
        const slug = slugify(req.params.slug);
        if (!slug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        const blog = await Blog.findOne({ slug, status: "PUBLISHED" }).lean();
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        res.status(200).json({ success: true, data: withBlogSchema(blog) });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBlog,
    getBlogs,
    getBlogById,
    updateBlog,
    changeBlogStatus,
    deleteBlog,
    getPublishedBlogs,
    getPublishedBlogBySlug,
};
