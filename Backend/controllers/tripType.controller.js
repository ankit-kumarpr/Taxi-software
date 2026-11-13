const mongoose = require("mongoose");
const TripType = require("../models/TripType");
const Lead = require("../models/Lead");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");

const createTripType = async (req, res, next) => {
    try {
        const { name, description, durationType } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: "Trip type name is required" });
        }

        const duration = String(durationType || "SINGLE_DAY").toUpperCase();
        if (!["SINGLE_DAY", "MULTI_DAY"].includes(duration)) {
            return res.status(400).json({
                success: false,
                message: "Invalid duration type. Use SINGLE_DAY or MULTI_DAY",
            });
        }

        const tripType = await TripType.create({
            name: String(name).trim(),
            description: description ? String(description).trim() : "",
            durationType: duration,
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: "Trip type created successfully",
            data: tripType,
        });
    } catch (error) {
        next(error);
    }
};

const getTripTypes = async (req, res, next) => {
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
            const types = await TripType.find({ status: "ACTIVE" })
                .select("name status durationType")
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
            TripType.countDocuments(filter),
            TripType.find(filter)
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

const getTripTypeById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip type ID format" });
        }

        const tripType = await TripType.findById(req.params.id)
            .populate("createdBy", "name email")
            .lean();

        if (!tripType) {
            return res.status(404).json({ success: false, message: "Trip type not found" });
        }

        res.status(200).json({ success: true, data: tripType });
    } catch (error) {
        next(error);
    }
};

const updateTripType = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip type ID format" });
        }

        const tripType = await TripType.findById(req.params.id);
        if (!tripType) {
            return res.status(404).json({ success: false, message: "Trip type not found" });
        }

        const { name, description, durationType } = req.body;
        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ success: false, message: "Trip type name cannot be empty" });
            }
            tripType.name = String(name).trim();
        }
        if (description !== undefined) {
            tripType.description = String(description).trim();
        }
        if (durationType !== undefined) {
            const duration = String(durationType).toUpperCase();
            if (!["SINGLE_DAY", "MULTI_DAY"].includes(duration)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid duration type. Use SINGLE_DAY or MULTI_DAY",
                });
            }
            tripType.durationType = duration;
        }

        await tripType.save();
        res.status(200).json({
            success: true,
            message: "Trip type updated successfully",
            data: tripType,
        });
    } catch (error) {
        next(error);
    }
};

const changeTripTypeStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip type ID format" });
        }

        const { status } = req.body;
        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
        }

        const tripType = await TripType.findById(req.params.id);
        if (!tripType) {
            return res.status(404).json({ success: false, message: "Trip type not found" });
        }

        tripType.status = status;
        await tripType.save();

        res.status(200).json({
            success: true,
            message: `Trip type marked as ${status}`,
            data: tripType,
        });
    } catch (error) {
        next(error);
    }
};

const deleteTripType = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip type ID format" });
        }

        const inUse = await Lead.countDocuments({ tripType: req.params.id });
        if (inUse > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete — ${inUse} lead(s) are using this type. Mark it INACTIVE instead.`,
            });
        }

        const tripType = await TripType.findByIdAndDelete(req.params.id);
        if (!tripType) {
            return res.status(404).json({ success: false, message: "Trip type not found" });
        }

        res.status(200).json({ success: true, message: "Trip type deleted successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTripType,
    getTripTypes,
    getTripTypeById,
    updateTripType,
    changeTripTypeStatus,
    deleteTripType,
};
