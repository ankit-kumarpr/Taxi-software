const express = require("express");
const router = express.Router();
const {
    getAccountsSummary,
    getAccountsNavCounts,
    getAccountsTrips,
    getAccountsPayments,
    getAccountsQuotations,
    getAccountsVendorPayouts,
} = require("../controllers/accounts.controller");

router.get("/summary", getAccountsSummary);
router.get("/nav-counts", getAccountsNavCounts);
router.get("/trips", getAccountsTrips);
router.get("/payments", getAccountsPayments);
router.get("/quotations", getAccountsQuotations);
router.get("/vendor-payouts", getAccountsVendorPayouts);

module.exports = router;
