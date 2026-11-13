const express = require("express");
const rateLimit = require("express-rate-limit");
const {
    getInquiryOptions,
    createWebsiteInquiry,
} = require("../controllers/websiteInquiry.controller");

const router = express.Router();

const inquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many inquiries from this IP. Please try again later.",
    },
});

router.get("/options", getInquiryOptions);
router.post("/create", inquiryLimiter, createWebsiteInquiry);

module.exports = router;
