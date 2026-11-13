const express = require("express");
const router = express.Router();

const {
    createDriver,
    getDrivers,
    getDriverById,
    updateDriver,
    verifyDriver,
    changeDriverStatus,
    deleteDriver,
} = require("../controllers/driver.controller");
const {
    getBecomeVendorPrefill,
    becomeVendor,
    getPromoteVendorPrefill,
    promoteDriverToVendor,
} = require("../controllers/becomeVendor.controller");
const { receiveDriverDocuments, receiveVendorDocuments } = require("../config/upload");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Drivers
 *   description: Driver CRUD — Admin (any/unassigned) or Vendor (own drivers only)
 */

// Driver self-upgrade (must stay before ADMIN/VENDOR-only middleware)
router.get(
    "/become-vendor/prefill",
    authenticate,
    authorize("DRIVER"),
    getBecomeVendorPrefill
);
router.post(
    "/become-vendor",
    authenticate,
    authorize("DRIVER"),
    receiveVendorDocuments,
    becomeVendor
);

// Admin promote from drivers list
router.get(
    "/:id/promote-vendor/prefill",
    authenticate,
    authorize("ADMIN"),
    getPromoteVendorPrefill
);
router.post(
    "/:id/promote-vendor",
    authenticate,
    authorize("ADMIN"),
    receiveVendorDocuments,
    promoteDriverToVendor
);

router.use(authenticate, authorize("ADMIN", "VENDOR"));

/**
 * @swagger
 * /api/v1/drivers/create:
 *   post:
 *     summary: Register driver. Vendor auto-assigns self; Admin can pick assignedVendor or leave unassigned.
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 */
router.post("/create", receiveDriverDocuments, createDriver);

/**
 * @swagger
 * /api/v1/drivers/list:
 *   get:
 *     summary: List drivers with filters + pagination
 *     tags: [Drivers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE] }
 *       - in: query
 *         name: assignedVendor
 *         schema: { type: string }
 *       - in: query
 *         name: unassigned
 *         schema: { type: string, example: "1" }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 */
router.get("/list", getDrivers);
router.get("/details/:id", getDriverById);
router.patch("/update/:id", receiveDriverDocuments, updateDriver);
router.patch("/:id/verify", authorize("ADMIN"), verifyDriver);
router.patch("/status/:id", changeDriverStatus);
router.delete("/:id", deleteDriver);

module.exports = router;
