const express = require("express");
const router = express.Router();

const {
    lookupVehicleByNumber,
    createVehicle,
    getVehicles,
    getVehicleById,
    updateVehicle,
    changeVehicleStatus,
    deleteVehicle,
} = require("../controllers/vehicle.controller");
const { receiveVehicleDocuments } = require("../config/upload");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle CRUD — Admin (any vendor) or Vendor (own vehicles only)
 */

router.use(authenticate, authorize("ADMIN", "VENDOR"));

router.post("/lookup-rc", lookupVehicleByNumber);

/**
 * @swagger
 * /api/v1/vehicles/create:
 *   post:
 *     summary: Register vehicle. Vendor auto-assigns self; Admin must pick vendor.
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 */
router.post("/create", receiveVehicleDocuments, createVehicle);
router.get("/list", getVehicles);
router.get("/details/:id", getVehicleById);
router.patch("/update/:id", receiveVehicleDocuments, updateVehicle);
router.patch("/status/:id", changeVehicleStatus);
router.delete("/:id", deleteVehicle);

module.exports = router;
