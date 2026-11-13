const express = require("express");
const router = express.Router();

const {
    createTripType,
    getTripTypes,
    getTripTypeById,
    updateTripType,
    changeTripTypeStatus,
    deleteTripType,
} = require("../controllers/tripType.controller");

/**
 * @swagger
 * tags:
 *   name: Admin - Trip Types
 *   description: Trip Type CRUD (Admin only)
 */

router.post("/create", createTripType);
router.get("/list", getTripTypes);
router.get("/details/:id", getTripTypeById);
router.patch("/update/:id", updateTripType);
router.patch("/status/:id", changeTripTypeStatus);
router.delete("/:id", deleteTripType);

module.exports = router;
