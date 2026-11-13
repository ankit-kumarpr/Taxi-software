const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const Vendor = require("../models/Vendor");
const Driver = require("../models/Driver");
const CarType = require("../models/CarType");
const { generateVehicleId } = require("../utils/generateVehicleId");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");
const {
    lookupIndiaVehicle,
    normalizeRegistrationNumber,
    normalizeRegCheckForSave,
} = require("../services/regCheck.service");

const DOC_FIELDS = [
    "rcDocument",
    "insuranceDocument",
    "pucDocument",
    "fitnessCertificate",
    "permitDocument",
    "vehiclePhoto",
];

const FUEL_TYPES = ["PETROL", "DIESEL", "CNG", "ELECTRIC"];
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"];

const isAdmin = (req) => req.accountRole === "ADMIN" || req.user?.userType === "ADMIN";
const isVendor = (req) => req.accountRole === "VENDOR" || req.user?.userType === "VENDOR";

const applyDocs = (vehicle, files) => {
    if (!files) return;
    for (const field of DOC_FIELDS) {
        const file = files[field]?.[0];
        if (!file) continue;
        if (vehicle[field]) removeLocalFile(vehicle[field]);
        vehicle[field] = toDocumentMeta(file, "vehicles");
    }
    const extras = files.otherImages || [];
    if (extras.length) {
        if (!Array.isArray(vehicle.otherImages)) vehicle.otherImages = [];
        for (const file of extras) {
            vehicle.otherImages.push(toDocumentMeta(file, "vehicles"));
        }
    }
};

const parseRegCheckPayload = (raw) => {
    if (raw == null || raw === "") return null;
    return normalizeRegCheckForSave(raw);
};

const lookupVehicleByNumber = async (req, res, next) => {
    try {
        const number = req.body?.registrationNumber || req.query?.registrationNumber || req.body?.vehicleNumber;
        const result = await lookupIndiaVehicle(number);
        res.status(200).json({
            success: true,
            message: "Vehicle details fetched from RegCheck",
            data: result,
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                success: false,
                message: error.message,
                details: error.details || undefined,
            });
        }
        next(error);
    }
};

const resolveVendorForCreate = async (req) => {
    if (isVendor(req)) {
        const vendor = await Vendor.findById(req.user._id);
        if (!vendor) {
            const error = new Error("Vendor account not found");
            error.status = 404;
            throw error;
        }
        if (vendor.status !== "ACTIVE" || vendor.documentVerificationStatus !== "VERIFIED") {
            const error = new Error("Only verified active vendors can register vehicles");
            error.status = 403;
            throw error;
        }
        return vendor;
    }

    const vendorId = req.body.vendor;
    if (!vendorId || String(vendorId).trim() === "") {
        const error = new Error("Vendor is required");
        error.status = 400;
        throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        const error = new Error("Invalid vendor ID");
        error.status = 400;
        throw error;
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
        const error = new Error("Vendor not found");
        error.status = 404;
        throw error;
    }
    return vendor;
};

const assertVehicleAccess = (req, vehicle) => {
    if (isAdmin(req)) return;
    const vendorId = vehicle.vendor?._id || vehicle.vendor;
    if (isVendor(req) && String(vendorId) === String(req.user._id)) return;
    const error = new Error("You do not have access to this vehicle");
    error.status = 403;
    throw error;
};

const assertActiveCarType = async (vehicleTypeId) => {
    if (!mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
        const error = new Error("Invalid vehicle type ID");
        error.status = 400;
        throw error;
    }
    const type = await CarType.findById(vehicleTypeId);
    if (!type) {
        const error = new Error("Vehicle type not found");
        error.status = 404;
        throw error;
    }
    if (type.status !== "ACTIVE") {
        const error = new Error("Selected vehicle type is inactive");
        error.status = 400;
        throw error;
    }
    return type;
};

const resolveAssignedDriver = async (driverId, vendorId) => {
    if (!driverId || driverId === "null" || driverId === "unassigned" || String(driverId).trim() === "") {
        return null;
    }
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
        const error = new Error("Invalid assigned driver ID");
        error.status = 400;
        throw error;
    }
    const driver = await Driver.findById(driverId);
    if (!driver) {
        const error = new Error("Assigned driver not found");
        error.status = 404;
        throw error;
    }
    if (String(driver.assignedVendor) !== String(vendorId)) {
        const error = new Error("Driver must belong to the same vendor as the vehicle");
        error.status = 400;
        throw error;
    }
    if (driver.status !== "ACTIVE") {
        const error = new Error("Assigned driver must be ACTIVE");
        error.status = 400;
        throw error;
    }
    return driver;
};

const createVehicle = async (req, res, next) => {
    try {
        const {
            vehicleNumber,
            vehicleName,
            vehicleType,
            assignedDriver,
            fuelType,
            transmission,
            seatingCapacity,
            status,
            regCheckData,
        } = req.body;

        if (!vehicleNumber?.trim()) {
            return res.status(400).json({ success: false, message: "Vehicle number is required" });
        }
        if (!vehicleType) {
            return res.status(400).json({ success: false, message: "Vehicle type is required" });
        }

        const parsedRegCheck = parseRegCheckPayload(regCheckData);
        if (!parsedRegCheck?.details && !parsedRegCheck?.raw) {
            return res.status(400).json({
                success: false,
                message: "Fetch RC details first (RegCheck), then register",
            });
        }

        const details = parsedRegCheck.details || {};
        const resolvedName =
            String(vehicleName || "").trim() ||
            String(details.description || "").trim() ||
            [details.make, details.model].filter(Boolean).join(" ").trim();
        if (!resolvedName) {
            return res.status(400).json({ success: false, message: "Vehicle name missing from RC response" });
        }

        const { mapFuelType, mapTransmission, textValue } = require("../services/regCheck.service");
        // Prefer explicit body, else RC, else safe defaults
        let resolvedFuel = fuelType ? String(fuelType).toUpperCase() : null;
        if (!resolvedFuel || !FUEL_TYPES.includes(resolvedFuel)) {
            resolvedFuel = mapFuelType(details.fuelTypeApi || details.flat?.FuelType) || "PETROL";
        }
        let resolvedTransmission = transmission ? String(transmission).toUpperCase() : null;
        if (!resolvedTransmission || !TRANSMISSIONS.includes(resolvedTransmission)) {
            resolvedTransmission =
                mapTransmission(details.transmissionApi || details.flat?.Transmission) || "MANUAL";
        }
        let seats = Number(seatingCapacity);
        if (!Number.isInteger(seats) || seats < 1) {
            seats = Number.parseInt(String(details.seats || textValue(details.flat?.NumberOfSeats) || "4"), 10);
        }
        if (!Number.isInteger(seats) || seats < 1) seats = 4;

        const vendor = await resolveVendorForCreate(req);
        await assertActiveCarType(vehicleType);
        const driver = await resolveAssignedDriver(assignedDriver, vendor._id);

        const number = normalizeRegistrationNumber(vehicleNumber);
        const duplicate = await Vehicle.findOne({ vehicleNumber: number });
        if (duplicate) {
            return res.status(409).json({ success: false, message: "Vehicle with this number already exists" });
        }

        const vehicleId = await generateVehicleId(vendor.companyName);

        const vehicle = new Vehicle({
            vehicleId,
            vehicleNumber: number,
            vehicleName: resolvedName,
            vehicleType,
            vendor: vendor._id,
            assignedDriver: driver?._id || null,
            fuelType: resolvedFuel,
            transmission: resolvedTransmission,
            seatingCapacity: seats,
            status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            regCheckData: parsedRegCheck?.raw || null,
            rcDetails: parsedRegCheck?.details || undefined,
            regCheckFetchedAt: parsedRegCheck ? new Date() : null,
            createdByRole: isVendor(req) ? "VENDOR" : "ADMIN",
            createdBy: req.user._id,
            createdByModel: isVendor(req) ? "Vendor" : "User",
        });

        applyDocs(vehicle, req.files);
        await vehicle.save();

        const populated = await Vehicle.findById(vehicle._id)
            .populate("vehicleType", "name status")
            .populate("vendor", "vendorId companyName email mobileNumber status")
            .populate("assignedDriver", "driverId name mobileNumber status");

        res.status(201).json({
            success: true,
            message: "Vehicle registered successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const getVehicles = async (req, res, next) => {
    try {
        const {
            search,
            status,
            vendor,
            vehicleType,
            fuelType,
            transmission,
            assignedDriver,
            unassignedDriver,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = {};

        if (isVendor(req)) {
            filter.vendor = req.user._id;
        } else if (vendor) {
            if (!mongoose.Types.ObjectId.isValid(vendor)) {
                return res.status(400).json({ success: false, message: "Invalid vendor ID" });
            }
            filter.vendor = vendor;
        }

        if (vehicleType) {
            if (!mongoose.Types.ObjectId.isValid(vehicleType)) {
                return res.status(400).json({ success: false, message: "Invalid vehicle type ID" });
            }
            filter.vehicleType = vehicleType;
        }

        if (status) {
            if (!["ACTIVE", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            filter.status = status;
        }

        if (fuelType) {
            if (!FUEL_TYPES.includes(String(fuelType).toUpperCase())) {
                return res.status(400).json({ success: false, message: "Invalid fuel type" });
            }
            filter.fuelType = String(fuelType).toUpperCase();
        }

        if (transmission) {
            if (!TRANSMISSIONS.includes(String(transmission).toUpperCase())) {
                return res.status(400).json({ success: false, message: "Invalid transmission" });
            }
            filter.transmission = String(transmission).toUpperCase();
        }

        if (unassignedDriver === "1" || unassignedDriver === "true") {
            filter.assignedDriver = null;
        } else if (assignedDriver) {
            if (!mongoose.Types.ObjectId.isValid(assignedDriver)) {
                return res.status(400).json({ success: false, message: "Invalid assignedDriver ID" });
            }
            filter.assignedDriver = assignedDriver;
        }

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { vehicleId: { $regex: safe, $options: "i" } },
                { vehicleNumber: { $regex: safe, $options: "i" } },
                { vehicleName: { $regex: safe, $options: "i" } },
            ];
        }

        const allowedSort = new Set([
            "createdAt",
            "updatedAt",
            "vehicleNumber",
            "vehicleName",
            "vehicleId",
            "status",
            "seatingCapacity",
        ]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Vehicle.countDocuments(filter),
            Vehicle.find(filter)
                .populate("vehicleType", "name status")
                .populate("vendor", "vendorId companyName email mobileNumber status")
                .populate("assignedDriver", "driverId name mobileNumber status")
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

const getVehicleById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vehicle ID format" });
        }

        const vehicle = await Vehicle.findById(req.params.id)
            .populate("vehicleType", "name status")
            .populate("vendor", "vendorId companyName email mobileNumber status documentVerificationStatus")
            .populate("assignedDriver", "driverId name mobileNumber email status");

        if (!vehicle) {
            return res.status(404).json({ success: false, message: "Vehicle not found" });
        }

        assertVehicleAccess(req, vehicle);

        res.status(200).json({ success: true, data: vehicle });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const updateVehicle = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vehicle ID format" });
        }

        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ success: false, message: "Vehicle not found" });
        }

        assertVehicleAccess(req, vehicle);

        if (req.body.vehicleNumber !== undefined) {
            const number = normalizeRegistrationNumber(req.body.vehicleNumber);
            if (!number) {
                return res.status(400).json({ success: false, message: "Vehicle number cannot be empty" });
            }
            const clash = await Vehicle.findOne({ _id: { $ne: vehicle._id }, vehicleNumber: number });
            if (clash) {
                return res.status(409).json({ success: false, message: "Another vehicle already uses this number" });
            }
            vehicle.vehicleNumber = number;
        }

        if (req.body.vehicleName !== undefined) {
            if (!String(req.body.vehicleName).trim()) {
                return res.status(400).json({ success: false, message: "Vehicle name cannot be empty" });
            }
            vehicle.vehicleName = String(req.body.vehicleName).trim();
        }

        if (req.body.vehicleType) {
            await assertActiveCarType(req.body.vehicleType);
            vehicle.vehicleType = req.body.vehicleType;
        }

        if (req.body.fuelType) {
            if (!FUEL_TYPES.includes(String(req.body.fuelType).toUpperCase())) {
                return res.status(400).json({ success: false, message: "Invalid fuel type" });
            }
            vehicle.fuelType = String(req.body.fuelType).toUpperCase();
        }

        if (req.body.transmission) {
            if (!TRANSMISSIONS.includes(String(req.body.transmission).toUpperCase())) {
                return res.status(400).json({ success: false, message: "Invalid transmission" });
            }
            vehicle.transmission = String(req.body.transmission).toUpperCase();
        }

        if (req.body.seatingCapacity !== undefined) {
            const seats = Number(req.body.seatingCapacity);
            if (!Number.isInteger(seats) || seats < 1) {
                return res.status(400).json({ success: false, message: "Seating capacity must be a positive integer" });
            }
            vehicle.seatingCapacity = seats;
        }

        if (req.body.status) {
            if (!["ACTIVE", "INACTIVE"].includes(req.body.status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            vehicle.status = req.body.status;
        }

        // Only admin can reassign vendor
        if (isAdmin(req) && Object.prototype.hasOwnProperty.call(req.body, "vendor")) {
            const vendorId = req.body.vendor;
            if (!vendorId || String(vendorId).trim() === "") {
                return res.status(400).json({ success: false, message: "Vendor is required" });
            }
            if (!mongoose.Types.ObjectId.isValid(vendorId)) {
                return res.status(400).json({ success: false, message: "Invalid vendor ID" });
            }
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) {
                return res.status(404).json({ success: false, message: "Vendor not found" });
            }
            if (String(vehicle.vendor) !== String(vendor._id)) {
                vehicle.vendor = vendor._id;
                // Clear driver if vendor changes (unless new driver provided below)
                if (!Object.prototype.hasOwnProperty.call(req.body, "assignedDriver")) {
                    vehicle.assignedDriver = null;
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "assignedDriver")) {
            const driver = await resolveAssignedDriver(req.body.assignedDriver, vehicle.vendor);
            vehicle.assignedDriver = driver?._id || null;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "regCheckData")) {
            const parsedRegCheck = parseRegCheckPayload(req.body.regCheckData);
            vehicle.regCheckData = parsedRegCheck?.raw || null;
            vehicle.rcDetails = parsedRegCheck?.details || undefined;
            vehicle.regCheckFetchedAt = parsedRegCheck ? new Date() : null;
        }

        applyDocs(vehicle, req.files);
        await vehicle.save();

        const populated = await Vehicle.findById(vehicle._id)
            .populate("vehicleType", "name status")
            .populate("vendor", "vendorId companyName email mobileNumber status")
            .populate("assignedDriver", "driverId name mobileNumber status");

        res.status(200).json({
            success: true,
            message: "Vehicle updated successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const changeVehicleStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vehicle ID format" });
        }

        const { status } = req.body;
        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
        }

        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ success: false, message: "Vehicle not found" });
        }

        assertVehicleAccess(req, vehicle);

        vehicle.status = status;
        await vehicle.save();

        res.status(200).json({
            success: true,
            message: `Vehicle marked as ${status}`,
            data: { id: vehicle._id, vehicleId: vehicle.vehicleId, status: vehicle.status },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const deleteVehicle = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vehicle ID format" });
        }

        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ success: false, message: "Vehicle not found" });
        }

        assertVehicleAccess(req, vehicle);

        for (const field of DOC_FIELDS) {
            if (vehicle[field]) removeLocalFile(vehicle[field]);
        }

        await vehicle.deleteOne();

        res.status(200).json({ success: true, message: "Vehicle deleted successfully" });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

/** Public website — ACTIVE vehicles only, safe fields */
const getPublishedVehicles = async (req, res, next) => {
    try {
        const { page = 1, limit = 48 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = { status: "ACTIVE" };

        const [total, data] = await Promise.all([
            Vehicle.countDocuments(filter),
            Vehicle.find(filter)
                .select(
                    "vehicleId vehicleName fuelType transmission seatingCapacity vehiclePhoto otherImages status createdAt updatedAt"
                )
                .populate("vehicleType", "name")
                .sort({ createdAt: -1 })
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

module.exports = {
    lookupVehicleByNumber,
    createVehicle,
    getVehicles,
    getVehicleById,
    updateVehicle,
    changeVehicleStatus,
    deleteVehicle,
    getPublishedVehicles,
};
