const express = require("express");
const router = express.Router();

const {
    createCarType,
    getCarTypes,
    getCarTypeById,
    updateCarType,
    changeCarTypeStatus,
    deleteCarType,
} = require("../controllers/carType.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Admin - Car Types
 *   description: Car Type CRUD (dropdown source for Vehicles)
 */

// List/dropdown readable by Admin + Vendor (needed on vehicle form)
router.get("/list", authenticate, authorize("ADMIN", "VENDOR"), getCarTypes);
router.get("/details/:id", authenticate, authorize("ADMIN", "VENDOR"), getCarTypeById);

// Mutations: Admin only
router.post("/create", authenticate, authorize("ADMIN"), createCarType);
router.patch("/update/:id", authenticate, authorize("ADMIN"), updateCarType);
router.patch("/status/:id", authenticate, authorize("ADMIN"), changeCarTypeStatus);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteCarType);

module.exports = router;
