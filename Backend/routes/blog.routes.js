const express = require("express");
const router = express.Router();
const {
    createBlog,
    getBlogs,
    getBlogById,
    updateBlog,
    changeBlogStatus,
    deleteBlog,
} = require("../controllers/blog.controller");
const { receiveBlogMedia } = require("../config/upload");
const { requirePermission } = require("../middlewares/auth.middleware");

router.post(
    "/create",
    requirePermission("blogs.create", "blogs.manage"),
    receiveBlogMedia,
    createBlog
);
router.get("/list", requirePermission("blogs.view", "blogs.manage"), getBlogs);
router.get("/details/:id", requirePermission("blogs.view", "blogs.manage"), getBlogById);
router.patch(
    "/update/:id",
    requirePermission("blogs.edit", "blogs.manage"),
    receiveBlogMedia,
    updateBlog
);
router.patch(
    "/status/:id",
    requirePermission("blogs.status", "blogs.manage"),
    changeBlogStatus
);
router.delete("/:id", requirePermission("blogs.delete", "blogs.manage"), deleteBlog);

module.exports = router;
