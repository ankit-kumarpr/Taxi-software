const express = require("express");
const router = express.Router();
const {
    getPrefillFromLead,
    createQuotation,
    getQuotationsByLead,
    getQuotationById,
    updateQuotation,
    sendQuotation,
    deleteQuotation,
} = require("../controllers/quotation.controller");

router.get("/prefill/:leadId", getPrefillFromLead);
router.get("/by-lead/:leadId", getQuotationsByLead);
router.post("/create", createQuotation);
router.get("/details/:id", getQuotationById);
router.patch("/update/:id", updateQuotation);
router.post("/:id/send", sendQuotation);
router.delete("/:id", deleteQuotation);

module.exports = router;
