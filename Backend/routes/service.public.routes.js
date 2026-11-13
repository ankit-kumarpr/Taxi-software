const express = require("express");
const router = express.Router();
const {
    getPublishedServices,
    getPublishedServiceBySlug,
} = require("../controllers/service.controller");

router.get("/list", getPublishedServices);
router.get("/slug/:slug", getPublishedServiceBySlug);

module.exports = router;
