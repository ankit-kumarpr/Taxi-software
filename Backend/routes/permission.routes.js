const express = require("express");
const router = express.Router();
const { requirePermission } = require("../middlewares/auth.middleware");
const {
    listPermissions,
    getCatalog,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission,
    seedPermissions,
} = require("../controllers/permission.controller");

router.get("/catalog", requirePermission("staff.view", "staff.permissions", "designations.permissions", "permissions.manage"), getCatalog);
router.get("/", requirePermission("permissions.manage", "staff.permissions"), listPermissions);
router.post("/seed", requirePermission("permissions.manage"), seedPermissions);
router.get("/:id", requirePermission("permissions.manage"), getPermissionById);
router.post("/", requirePermission("permissions.manage"), createPermission);
router.patch("/:id", requirePermission("permissions.manage"), updatePermission);
router.delete("/:id", requirePermission("permissions.manage"), deletePermission);

module.exports = router;
