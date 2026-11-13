const express = require("express");
const router = express.Router();
const {
    getPublishedPackages,
    getPublishedPackageBySlug,
} = require("../controllers/package.controller");

router.get("/list", getPublishedPackages);
router.get("/slug/:slug", getPublishedPackageBySlug);

module.exports = router;
