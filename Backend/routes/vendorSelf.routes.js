const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
    listMyOffers,
    getMyOffer,
    acceptOffer,
    rejectOffer,
} = require("../controllers/vendorOffer.controller");
const {
    listOpenBidsForVendor,
    placeBid,
    listVendorNotifications,
    markVendorNotificationsRead,
    markVendorNotificationRead,
} = require("../controllers/bid.controller");
const {
    listManagedTrips,
    driverTripStats,
    getTripInvoice,
} = require("../controllers/trip.controller");

router.use(authenticate, authorize("VENDOR"));

router.get("/trips", listManagedTrips);
router.get("/trips/driver-stats", driverTripStats);
router.get("/trips/:id/invoice", getTripInvoice);

router.get("/offers", listMyOffers);
router.get("/offers/:id", getMyOffer);
router.post("/offers/:id/accept", acceptOffer);
router.post("/offers/:id/reject", rejectOffer);

router.get("/bids/open", listOpenBidsForVendor);
router.post("/bids/rounds/:roundId/place", placeBid);
router.get("/notifications", listVendorNotifications);
router.patch("/notifications/:id/read", markVendorNotificationRead);
router.post("/notifications/read-all", markVendorNotificationsRead);

module.exports = router;
