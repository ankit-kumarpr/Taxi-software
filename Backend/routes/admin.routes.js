const express = require("express");
const router = express.Router();

const {
    createDepartment,
    getDepartments,
    getDepartmentById,
    updateDepartment,
    changeDepartmentStatus,
    deleteDepartment,
} = require("../controllers/department.controller");
const {
    createDesignation,
    getDesignations,
    getDesignationById,
    getDesignationsByDepartment,
    updateDesignation,
    setDesignationPermissions,
    changeDesignationStatus,
    deleteDesignation,
} = require("../controllers/designation.controller");
const { authenticate, authorize, requirePermission } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management APIs (Departments, Designations, Vendor Types, Vendors, Trip Types, Leads)
 */

router.use(authenticate, authorize("ADMIN"));

router.use("/vendor-types", require("./vendorType.routes"));
router.use("/vendors", require("./vendor.routes"));
router.use("/trip-types", require("./tripType.routes"));
router.use("/leads", require("./lead.routes"));
router.use("/notifications", require("./notification.routes"));
router.use("/company-profile", require("./companyProfile.routes"));
router.use("/quotations", require("./quotation.routes"));
router.use("/vendor-offers", require("./vendorOffer.routes"));
router.use("/accounts", require("./accounts.routes"));
router.use("/bids", require("./bid.routes"));
router.use("/staff", require("./staff.routes"));
router.use("/permissions", require("./permission.routes"));
router.use("/trips", require("./adminTrips.routes"));
router.use("/blogs", require("./blog.routes"));
router.use("/services", require("./service.routes"));
router.use("/packages", require("./package.routes"));

// ─── Departments ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/departments/create:
 *   post:
 *     summary: Create a Department
 *     tags: [Admin - Departments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Department created
 */
router.post("/departments/create", createDepartment);

/**
 * @swagger
 * /api/v1/admin/departments/list:
 *   get:
 *     summary: Get all Departments
 *     tags: [Admin - Departments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200:
 *         description: List of Departments
 */
router.get("/departments/list", getDepartments);

/**
 * @swagger
 * /api/v1/admin/departments/details/{id}:
 *   get:
 *     summary: Get Department by ID
 *     tags: [Admin - Departments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Department details
 */
router.get("/departments/details/:id", getDepartmentById);

/**
 * @swagger
 * /api/v1/admin/departments/update/{id}:
 *   patch:
 *     summary: Update Department
 *     tags: [Admin - Departments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Department updated
 */
router.patch("/departments/update/:id", updateDepartment);

/**
 * @swagger
 * /api/v1/admin/departments/status/{id}:
 *   patch:
 *     summary: Change Department Status
 *     tags: [Admin - Departments]
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
router.patch("/departments/status/:id", changeDepartmentStatus);

/**
 * @swagger
 * /api/v1/admin/departments/{id}:
 *   delete:
 *     summary: Delete Department
 *     tags: [Admin - Departments]
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
router.delete("/departments/:id", deleteDepartment);

// ─── Designations ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/designations/create:
 *   post:
 *     summary: Create a Designation
 *     tags: [Admin - Designations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               department: { type: string, description: Department ObjectId }
 *     responses:
 *       201:
 *         description: Designation created
 */
router.post("/designations/create", createDesignation);

/**
 * @swagger
 * /api/v1/admin/designations/list:
 *   get:
 *     summary: Get all Designations
 *     tags: [Admin - Designations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200:
 *         description: List of Designations
 */
router.get("/designations/list", getDesignations);

/**
 * @swagger
 * /api/v1/admin/designations/details/{id}:
 *   get:
 *     summary: Get Designation by ID
 *     tags: [Admin - Designations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Designation details
 */
router.get("/designations/details/:id", getDesignationById);

/**
 * @swagger
 * /api/v1/admin/designations/list/department/{departmentId}:
 *   get:
 *     summary: Get Designations by Department ID
 *     tags: [Admin - Designations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of Designations
 */
router.get("/designations/list/department/:departmentId", getDesignationsByDepartment);

/**
 * @swagger
 * /api/v1/admin/designations/update/{id}:
 *   patch:
 *     summary: Update Designation
 *     tags: [Admin - Designations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Designation updated
 */
router.patch("/designations/update/:id", requirePermission("designations.edit"), updateDesignation);
router.put(
    "/designations/:id/permissions",
    requirePermission("designations.permissions"),
    setDesignationPermissions
);

/**
 * @swagger
 * /api/v1/admin/designations/status/{id}:
 *   patch:
 *     summary: Change Designation Status
 *     tags: [Admin - Designations]
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
router.patch("/designations/status/:id", changeDesignationStatus);

/**
 * @swagger
 * /api/v1/admin/designations/{id}:
 *   delete:
 *     summary: Delete Designation
 *     tags: [Admin - Designations]
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
router.delete("/designations/:id", deleteDesignation);

module.exports = router;
