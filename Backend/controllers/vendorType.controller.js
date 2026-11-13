const mongoose = require("mongoose");
const VendorType = require("../models/VendorType");
const Vendor = require("../models/Vendor");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");

const createVendorType = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: "Vendor type name is required" });
        }

        const vendorType = await VendorType.create({
            name: String(name).trim(),
            description: description ? String(description).trim() : "",
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: "Vendor type created successfully",
            data: vendorType,
        });
    } catch (error) {
        next(error);
    }
};

const getVendorTypes = async (req, res, next) => {
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

        // Lightweight list for vendor form dropdown
        if (dropdown === "1" || dropdown === "true") {
            const types = await VendorType.find({ status: "ACTIVE" })
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
            VendorType.countDocuments(filter),
            VendorType.find(filter)
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

const getVendorTypeById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor type ID format" });
        }

        const vendorType = await VendorType.findById(req.params.id)
            .populate("createdBy", "name email")
            .lean();

        if (!vendorType) {
            return res.status(404).json({ success: false, message: "Vendor type not found" });
        }

        res.status(200).json({ success: true, data: vendorType });
    } catch (error) {
        next(error);
    }
};

const updateVendorType = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor type ID format" });
        }

        const vendorType = await VendorType.findById(req.params.id);
        if (!vendorType) {
            return res.status(404).json({ success: false, message: "Vendor type not found" });
        }

        const { name, description } = req.body;
        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ success: false, message: "Vendor type name cannot be empty" });
            }
            vendorType.name = String(name).trim();
        }
        if (description !== undefined) {
            vendorType.description = String(description).trim();
        }

        await vendorType.save();
        res.status(200).json({
            success: true,
            message: "Vendor type updated successfully",
            data: vendorType,
        });
    } catch (error) {
        next(error);
    }
};

const changeVendorTypeStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor type ID format" });
        }

        const { status } = req.body;
        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
        }

        const vendorType = await VendorType.findById(req.params.id);
        if (!vendorType) {
            return res.status(404).json({ success: false, message: "Vendor type not found" });
        }

        vendorType.status = status;
        await vendorType.save();

        res.status(200).json({
            success: true,
            message: `Vendor type marked as ${status}`,
            data: vendorType,
        });
    } catch (error) {
        next(error);
    }
};

const deleteVendorType = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor type ID format" });
        }

        const inUse = await Vendor.countDocuments({ vendorType: req.params.id });
        if (inUse > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete — ${inUse} vendor(s) are using this type. Mark it INACTIVE instead.`,
            });
        }

        const vendorType = await VendorType.findByIdAndDelete(req.params.id);
        if (!vendorType) {
            return res.status(404).json({ success: false, message: "Vendor type not found" });
        }

        res.status(200).json({ success: true, message: "Vendor type deleted successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createVendorType,
    getVendorTypes,
    getVendorTypeById,
    updateVendorType,
    changeVendorTypeStatus,
    deleteVendorType,
};
