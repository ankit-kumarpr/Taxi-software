const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
    listManagedTrips,
    driverTripStats,
    getTripInvoice,
    adminCompleteTrip,
    verifyFinalPayment,
} = require("../controllers/trip.controller");

router.use(authenticate, authorize("ADMIN"));

router.get("/", listManagedTrips);
router.get("/driver-stats", driverTripStats);
router.get("/:id/invoice", getTripInvoice);
router.post("/:id/complete", adminCompleteTrip);
router.post("/:id/verify-payment", verifyFinalPayment);

module.exports = router;
