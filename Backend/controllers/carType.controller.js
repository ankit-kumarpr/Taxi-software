const mongoose = require("mongoose");
const CarType = require("../models/CarType");
const Vehicle = require("../models/Vehicle");
const Lead = require("../models/Lead");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");

const createCarType = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: "Car type name is required" });
        }

        const carType = await CarType.create({
            name: String(name).trim(),
            description: description ? String(description).trim() : "",
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: "Car type created successfully",
            data: carType,
        });
    } catch (error) {
        next(error);
    }
};

const getCarTypes = async (req, res, next) => {
    try {
        const {
            search,
            status,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
            dropdown,
        } = req.query;

        if (dropdown === "1" || dropdown === "true") {
            const types = await CarType.find({ status: "ACTIVE" })
                .select("name status")
                .sort({ name: 1 })
                .lean();
            return res.status(200).json({ success: true, data: types });
        }

        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = {};

        if (status) {
            if (!["ACTIVE", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
            }
            filter.status = status;
        }

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { name: { $regex: safe, $options: "i" } },
                { description: { $regex: safe, $options: "i" } },
            ];
        }

        const allowedSort = new Set(["createdAt", "name", "status", "updatedAt"]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            CarType.countDocuments(filter),
            CarType.find(filter)
                .populate("createdBy", "name email")
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getCarTypeById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid car type ID format" });
        }

        const carType = await CarType.findById(req.params.id)
            .populate("createdBy", "name email")
            .lean();

        if (!carType) {
            return res.status(404).json({ success: false, message: "Car type not found" });
        }

        res.status(200).json({ success: true, data: carType });
    } catch (error) {
        next(error);
    }
};

const updateCarType = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid car type ID format" });
        }

        const carType = await CarType.findById(req.params.id);
        if (!carType) {
            return res.status(404).json({ success: false, message: "Car type not found" });
        }

        const { name, description } = req.body;
        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ success: false, message: "Car type name cannot be empty" });
            }
            carType.name = String(name).trim();
        }
        if (description !== undefined) {
            carType.description = String(description).trim();
        }

        await carType.save();
        res.status(200).json({
            success: true,
            message: "Car type updated successfully",
            data: carType,
        });
    } catch (error) {
        next(error);
    }
};

const changeCarTypeStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid car type ID format" });
        }

        const { status } = req.body;
        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
        }

        const carType = await CarType.findById(req.params.id);
        if (!carType) {
            return res.status(404).json({ success: false, message: "Car type not found" });
        }

        carType.status = status;
        await carType.save();

        res.status(200).json({
            success: true,
            message: `Car type marked as ${status}`,
            data: carType,
        });
    } catch (error) {
        next(error);
    }
};

const deleteCarType = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid car type ID format" });
        }

        const [vehicleCount, leadCount] = await Promise.all([
            Vehicle.countDocuments({ vehicleType: req.params.id }),
            Lead.countDocuments({ cabType: req.params.id }),
        ]);
        if (vehicleCount > 0 || leadCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete — ${vehicleCount} vehicle(s) and ${leadCount} lead(s) use this type. Mark it INACTIVE instead.`,
            });
        }

        const carType = await CarType.findByIdAndDelete(req.params.id);
        if (!carType) {
            return res.status(404).json({ success: false, message: "Car type not found" });
        }

        res.status(200).json({ success: true, message: "Car type deleted successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCarType,
    getCarTypes,
    getCarTypeById,
    updateCarType,
    changeCarTypeStatus,
    deleteCarType,
};
