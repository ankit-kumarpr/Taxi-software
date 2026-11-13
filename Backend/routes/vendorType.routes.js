const express = require("express");
const router = express.Router();

const {
    createVendorType,
    getVendorTypes,
    getVendorTypeById,
    updateVendorType,
    changeVendorTypeStatus,
    deleteVendorType,
} = require("../controllers/vendorType.controller");

/**
 * @swagger
 * tags:
 *   name: Admin - Vendor Types
 *   description: Vendor Type CRUD (dropdown source for Vendors)
 */

/**
 * @swagger
 * /api/v1/admin/vendor-types/create:
 *   post:
 *     summary: Create Vendor Type
 *     tags: [Admin - Vendor Types]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Fleet Partner }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/create", createVendorType);

/**
 * @swagger
 * /api/v1/admin/vendor-types/list:
 *   get:
 *     summary: List Vendor Types (filters + pagination). Use dropdown=1 for Active-only dropdown.
 *     tags: [Admin - Vendor Types]
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
 *         name: dropdown
 *         schema: { type: string, example: "1" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, example: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: List
 */
router.get("/list", getVendorTypes);

/**
 * @swagger
 * /api/v1/admin/vendor-types/details/{id}:
 *   get:
 *     summary: Get Vendor Type by ID
 *     tags: [Admin - Vendor Types]
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
router.get("/details/:id", getVendorTypeById);

/**
 * @swagger
 * /api/v1/admin/vendor-types/update/{id}:
 *   patch:
 *     summary: Update Vendor Type
 *     tags: [Admin - Vendor Types]
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
router.patch("/update/:id", updateVendorType);

/**
 * @swagger
 * /api/v1/admin/vendor-types/status/{id}:
 *   patch:
 *     summary: Change Vendor Type Status
 *     tags: [Admin - Vendor Types]
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
router.patch("/status/:id", changeVendorTypeStatus);

/**
 * @swagger
 * /api/v1/admin/vendor-types/{id}:
 *   delete:
 *     summary: Delete Vendor Type (blocked if vendors use it)
 *     tags: [Admin - Vendor Types]
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
router.delete("/:id", deleteVendorType);

module.exports = router;
