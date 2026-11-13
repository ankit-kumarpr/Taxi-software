const express = require("express");
const router = express.Router();
const { requirePermission } = require("../middlewares/auth.middleware");

const {
    createLead,
    getLeads,
    getLeadStatusCounts,
    getLeadById,
    updateLead,
    changeLeadStatus,
    confirmLead,
    verifyAdvancePayment,
    checkSimilarLeads,
    listRepeatCustomers,
    getRepeatCustomer,
    cancelLeadBooking,
    listCancelledLeads,
    deleteLead,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
} = require("../controllers/lead.controller");
const { receiveLeadConfirmDocuments } = require("../config/upload");

/**
 * @swagger
 * tags:
 *   name: Admin - Leads
 *   description: Lead CRUD + Follow-ups (Admin only)
 */

router.post("/create", requirePermission("leads.create"), createLead);
router.get("/list", requirePermission("leads.view"), getLeads);
router.get("/status-counts", requirePermission("leads.view"), getLeadStatusCounts);
router.get("/similar", requirePermission("leads.create", "leads.view", "leads.edit"), checkSimilarLeads);
router.get("/cancelled", requirePermission("leads.view"), listCancelledLeads);
router.get("/repeat-customers", requirePermission("leads.view"), listRepeatCustomers);
router.get("/repeat-customers/:mobile", requirePermission("leads.view"), getRepeatCustomer);
router.get("/details/:id", requirePermission("leads.view"), getLeadById);
router.patch("/update/:id", requirePermission("leads.edit"), updateLead);
router.patch("/status/:id", requirePermission("leads.status"), changeLeadStatus);
router.post("/:id/cancel", requirePermission("leads.cancel"), cancelLeadBooking);
router.post(
    "/:id/confirm",
    requirePermission("leads.confirm"),
    receiveLeadConfirmDocuments,
    confirmLead
);
router.post("/:id/verify-advance", requirePermission("leads.confirm"), verifyAdvancePayment);
router.delete("/:id", requirePermission("leads.delete"), deleteLead);

router.post("/:id/follow-ups", requirePermission("leads.followups"), addFollowUp);
router.patch("/:id/follow-ups/:followUpId", requirePermission("leads.followups"), updateFollowUp);
router.delete("/:id/follow-ups/:followUpId", requirePermission("leads.followups"), deleteFollowUp);

module.exports = router;
