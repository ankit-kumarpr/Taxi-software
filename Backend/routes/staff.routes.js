const express = require("express");
const router = express.Router();
const { requirePermission } = require("../middlewares/auth.middleware");
const { receiveEmployeeDocuments } = require("../config/upload");
const {
    getPermissionCatalog,
    listStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    setStaffPermissions,
} = require("../controllers/staff.controller");

router.get(
    "/permissions/catalog",
    requirePermission("staff.view", "staff.permissions", "designations.permissions"),
    getPermissionCatalog
);
router.get("/", requirePermission("staff.view"), listStaff);
router.get("/:id", requirePermission("staff.view"), getStaffById);
router.post("/", requirePermission("staff.create"), receiveEmployeeDocuments, createStaff);
router.patch("/:id", requirePermission("staff.edit"), receiveEmployeeDocuments, updateStaff);
router.delete("/:id", requirePermission("staff.delete"), deleteStaff);
router.put("/:id/permissions", requirePermission("staff.permissions"), setStaffPermissions);

module.exports = router;
