const express = require("express");
const router = express.Router();
const { getPublishedVehicles } = require("../controllers/vehicle.controller");

router.get("/list", getPublishedVehicles);

module.exports = router;
