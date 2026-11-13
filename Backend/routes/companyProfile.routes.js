const express = require("express");
const router = express.Router();
const {
    getCompanyProfile,
    updateCompanyProfile,
} = require("../controllers/companyProfile.controller");
const { receiveCompanyLogo } = require("../config/upload");

router.get("/", getCompanyProfile);
router.patch("/", receiveCompanyLogo, updateCompanyProfile);

module.exports = router;
