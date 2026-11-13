const express = require("express");
const router = express.Router();
const {
    createPackage,
    getPackages,
    getPackageById,
    updatePackage,
    changePackageStatus,
    deletePackage,
} = require("../controllers/package.controller");
const { receivePackageMedia } = require("../config/upload");
const { requirePermission } = require("../middlewares/auth.middleware");

router.post(
    "/create",
    requirePermission("packages.create", "packages.manage"),
    receivePackageMedia,
    createPackage
);
router.get("/list", requirePermission("packages.view", "packages.manage"), getPackages);
router.get("/details/:id", requirePermission("packages.view", "packages.manage"), getPackageById);
router.patch(
    "/update/:id",
    requirePermission("packages.edit", "packages.manage"),
    receivePackageMedia,
    updatePackage
);
router.patch(
    "/status/:id",
    requirePermission("packages.status", "packages.manage"),
    changePackageStatus
);
router.delete("/:id", requirePermission("packages.delete", "packages.manage"), deletePackage);

module.exports = router;
