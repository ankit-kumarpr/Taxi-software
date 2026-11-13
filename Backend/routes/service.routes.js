const express = require("express");
const router = express.Router();
const {
    createService,
    getServices,
    getServiceById,
    updateService,
    changeServiceStatus,
    deleteService,
} = require("../controllers/service.controller");
const { receiveServiceMedia } = require("../config/upload");
const { requirePermission } = require("../middlewares/auth.middleware");

router.post(
    "/create",
    requirePermission("services.create", "services.manage"),
    receiveServiceMedia,
    createService
);
router.get("/list", requirePermission("services.view", "services.manage"), getServices);
router.get("/details/:id", requirePermission("services.view", "services.manage"), getServiceById);
router.patch(
    "/update/:id",
    requirePermission("services.edit", "services.manage"),
    receiveServiceMedia,
    updateService
);
router.patch(
    "/status/:id",
    requirePermission("services.status", "services.manage"),
    changeServiceStatus
);
router.delete("/:id", requirePermission("services.delete", "services.manage"), deleteService);

module.exports = router;
