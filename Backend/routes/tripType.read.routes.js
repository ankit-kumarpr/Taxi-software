const express = require("express");
const router = express.Router();

const { getTripTypes, getTripTypeById } = require("../controllers/tripType.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

/**
 * Shared read access for Trip Types (Admin + Vendor) — needed on rate card forms.
 * Mutations remain under /api/v1/admin/trip-types.
 */
router.get("/list", authenticate, authorize("ADMIN", "VENDOR"), getTripTypes);
router.get("/details/:id", authenticate, authorize("ADMIN", "VENDOR"), getTripTypeById);

module.exports = router;
