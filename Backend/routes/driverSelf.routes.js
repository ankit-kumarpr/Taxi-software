const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
    listMyTrips,
    getMyTrip,
    startTrip,
    sendCompleteOtp,
    completeTrip,
    verifyFinalPayment,
    getTripInvoice,
} = require("../controllers/trip.controller");

router.use(authenticate, authorize("DRIVER"));

router.get("/trips", listMyTrips);
router.get("/trips/:id", getMyTrip);
router.get("/trips/:id/invoice", getTripInvoice);
router.post("/trips/:id/start", startTrip);
router.post("/trips/:id/send-complete-otp", sendCompleteOtp);
router.post("/trips/:id/complete", completeTrip);
router.post("/trips/:id/verify-payment", verifyFinalPayment);

module.exports = router;
