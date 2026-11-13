const express = require("express");
const router = express.Router();
const { requirePermission } = require("../middlewares/auth.middleware");
const {
    listBidVendorsApi,
    listAdminBidRounds,
    adminBidStatusCounts,
    openBidRound,
    getBidRoundByLead,
    acceptBid,
    cancelBidRound,
} = require("../controllers/bid.controller");

router.get("/vendors", requirePermission("leads.open_bid", "bids.view"), listBidVendorsApi);
router.get("/status-counts", requirePermission("bids.view"), adminBidStatusCounts);
router.get("/rounds", requirePermission("bids.view"), listAdminBidRounds);
router.post("/open", requirePermission("leads.open_bid"), openBidRound);
router.get("/by-lead/:leadId", requirePermission("leads.view", "bids.view"), getBidRoundByLead);
router.post("/bids/:bidId/accept", requirePermission("leads.accept_bid", "bids.accept"), acceptBid);
router.post("/rounds/:roundId/cancel", requirePermission("leads.cancel_bid", "bids.cancel"), cancelBidRound);

module.exports = router;
