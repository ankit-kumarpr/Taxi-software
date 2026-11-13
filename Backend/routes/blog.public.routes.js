const express = require("express");
const router = express.Router();
const {
    getPublishedBlogs,
    getPublishedBlogBySlug,
} = require("../controllers/blog.controller");

router.get("/list", getPublishedBlogs);
router.get("/slug/:slug", getPublishedBlogBySlug);

module.exports = router;
