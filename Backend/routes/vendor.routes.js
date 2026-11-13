const express = require("express");
const router = express.Router();

const {
    createVendor,
    getVendors,
    getVendorStatusCounts,
    getVendorById,
    updateVendor,
    changeVendorStatus,
    verifyVendor,
    getFixedShareSettings,
    updateFixedShareSettings,
    listPendingDocuments,
    triggerDocumentReminders,
    setVendorBusinessModel,
    deleteVendor,
    getWalletHistory,
    addWalletTransaction,
} = require("../controllers/vendor.controller");
const { receiveVendorDocuments } = require("../config/upload");

/**
 * @swagger
 * tags:
 *   name: Admin - Vendors
 *   description: Vendor CRUD with documents, wallet, filters & pagination
 */

/**
 * @swagger
 * /api/v1/admin/vendors/create:
 *   post:
 *     summary: Create Vendor (vendorId auto TWven001). multipart/form-data supported for docs.
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/create", receiveVendorDocuments, createVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/list:
 *   get:
 *     summary: List Vendors with filters + pagination
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: vendorType
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE] }
 *       - in: query
 *         name: documentVerificationStatus
 *         schema: { type: string, enum: [PENDING, VERIFIED, REJECTED] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *       - in: query
 *         name: mobileNumber
 *         schema: { type: string }
 *       - in: query
 *         name: email
 *         schema: { type: string }
 *       - in: query
 *         name: gstNumber
 *         schema: { type: string }
 *       - in: query
 *         name: panNumber
 *         schema: { type: string }
 *       - in: query
 *         name: ratingMin
 *         schema: { type: number }
 *       - in: query
 *         name: ratingMax
 *         schema: { type: number }
 *       - in: query
 *         name: walletMin
 *         schema: { type: number }
 *       - in: query
 *         name: walletMax
 *         schema: { type: number }
 *       - in: query
 *         name: createdFrom
 *         schema: { type: string, example: 2026-01-01 }
 *       - in: query
 *         name: createdTo
 *         schema: { type: string, example: 2026-12-31 }
 *       - in: query
 *         name: createdBy
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: List
 */
router.get("/list", getVendors);
router.get("/status-counts", getVendorStatusCounts);
router.get("/fixed-share-settings", getFixedShareSettings);
router.patch("/fixed-share-settings", updateFixedShareSettings);
router.get("/pending-documents", listPendingDocuments);
router.post("/pending-documents/send-reminders", triggerDocumentReminders);

/**
 * @swagger
 * /api/v1/admin/vendors/details/{id}:
 *   get:
 *     summary: Get Vendor by Mongo ID (includes wallet history)
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Details
 */
router.get("/details/:id", getVendorById);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/wallet:
 *   get:
 *     summary: Vendor wallet transaction history (paginated)
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [CREDIT, DEBIT] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Wallet history
 *   post:
 *     summary: Add wallet CREDIT / DEBIT
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount]
 *             properties:
 *               type: { type: string, enum: [CREDIT, DEBIT] }
 *               amount: { type: number }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Transaction added
 */
router.get("/:id/wallet", getWalletHistory);
router.post("/:id/wallet", addWalletTransaction);

/**
 * @swagger
 * /api/v1/admin/vendors/update/{id}:
 *   patch:
 *     summary: Update Vendor (multipart supported)
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch("/update/:id", receiveVendorDocuments, updateVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/status/{id}:
 *   patch:
 *     summary: Change Vendor Status Active / Inactive
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Status changed
 */
router.patch("/status/:id", changeVendorStatus);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/verify:
 *   patch:
 *     summary: Admin verify / reject vendor (required before vendor login)
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentVerificationStatus]
 *             properties:
 *               documentVerificationStatus:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED, PENDING]
 *               internalNotes: { type: string }
 *     responses:
 *       200:
 *         description: Verification updated
 */
router.patch("/:id/verify", verifyVendor);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/business-model:
 *   patch:
 *     summary: Set vendor business model FIXED (with company %) or BID
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 */
router.patch("/:id/business-model", setVendorBusinessModel);

/**
 * @swagger
 * /api/v1/admin/vendors/{id}:
 *   delete:
 *     summary: Delete Vendor
 *     tags: [Admin - Vendors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/:id", deleteVendor);

module.exports = router;
