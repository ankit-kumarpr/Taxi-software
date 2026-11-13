const express = require("express");
const router = express.Router();
const { requirePermission } = require("../middlewares/auth.middleware");
const {
    listFixedVendors,
    createFixedOffer,
    getOffersByLead,
    getOfferByIdAdmin,
    cancelOffer,
    assignDriver,
} = require("../controllers/vendorOffer.controller");

router.get(
    "/fixed-vendors",
    requirePermission("leads.assign_vendor"),
    listFixedVendors
);
router.post("/create", requirePermission("leads.assign_vendor"), createFixedOffer);
router.get(
    "/by-lead/:leadId",
    requirePermission("leads.view", "leads.assign_vendor", "leads.assign_driver"),
    getOffersByLead
);
router.get(
    "/details/:id",
    requirePermission("leads.view", "leads.assign_vendor", "leads.assign_driver"),
    getOfferByIdAdmin
);
router.post("/:id/cancel", requirePermission("leads.assign_vendor"), cancelOffer);
router.post("/:id/assign-driver", requirePermission("leads.assign_driver"), assignDriver);

module.exports = router;
