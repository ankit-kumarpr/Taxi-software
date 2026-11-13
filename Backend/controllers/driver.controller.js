const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const Vendor = require("../models/Vendor");
const Lead = require("../models/Lead");
const { generateDriverId } = require("../utils/generateDriverId");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");

const DOC_FIELDS = ["aadhaarDocument", "drivingLicenceDocument", "profilePhoto"];

const isAdmin = (req) => req.accountRole === "ADMIN" || req.user?.userType === "ADMIN";
const isVendor = (req) => req.accountRole === "VENDOR" || req.user?.userType === "VENDOR";

const applyDocs = (driver, files) => {
    if (!files) return false;
    let changedRequired = false;
    for (const field of DOC_FIELDS) {
        const file = files[field]?.[0];
        if (!file) continue;
        if (driver[field]) removeLocalFile(driver[field]);
        driver[field] = toDocumentMeta(file, "drivers");
        if (field === "aadhaarDocument" || field === "drivingLicenceDocument") {
            changedRequired = true;
        }
    }
    return changedRequired;
};

const applyOtherDocuments = (driver, files, body) => {
    const uploaded = files?.otherDocuments || [];
    if (!uploaded.length) return;

    let names = body?.otherDocumentNames;
    if (typeof names === "string") names = [names];
    if (!Array.isArray(names)) names = [];

    const extras = uploaded.map((file, idx) => {
        const meta = toDocumentMeta(file, "drivers");
        return {
            name: String(names[idx] || file.originalname || "Document").trim() || "Document",
            url: meta.url,
            originalName: meta.originalName,
            mimeType: meta.mimeType,
            size: meta.size,
            uploadedAt: meta.uploadedAt,
        };
    });

    const replaceAll =
        body?.replaceOtherDocuments === true ||
        body?.replaceOtherDocuments === "true" ||
        body?.replaceOtherDocuments === "1";

    if (replaceAll) {
        (driver.otherDocuments || []).forEach((doc) => removeLocalFile(doc));
        driver.otherDocuments = extras;
    } else {
        driver.otherDocuments = [...(driver.otherDocuments || []), ...extras];
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
            const error = new Error("Only verified active vendors can register drivers");
            error.status = 403;
            throw error;
        }
        return vendor;
    }

    // Admin: optional assignedVendor
    const vendorId = req.body.assignedVendor;
    if (!vendorId || String(vendorId).trim() === "" || vendorId === "null" || vendorId === "unassigned") {
        return null;
    }
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        const error = new Error("Invalid assigned vendor ID");
        error.status = 400;
        throw error;
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
        const error = new Error("Assigned vendor not found");
        error.status = 404;
        throw error;
    }
    return vendor;
};

const assertDriverAccess = (req, driver) => {
    if (isAdmin(req)) return;
    const vendorId = driver.assignedVendor?._id || driver.assignedVendor;
    if (isVendor(req) && String(vendorId) === String(req.user._id)) return;
    const error = new Error("You do not have access to this driver");
    error.status = 403;
    throw error;
};

const createDriver = async (req, res, next) => {
    try {
        const {
            name,
            mobileNumber,
            email,
            password,
            address,
            aadhaarNumber,
            drivingLicenceNumber,
            dlExpiryDate,
            status,
        } = req.body;

        if (!name?.trim()) return res.status(400).json({ success: false, message: "Driver name is required" });
        if (!mobileNumber?.trim()) return res.status(400).json({ success: false, message: "Mobile number is required" });
        if (!address?.trim()) return res.status(400).json({ success: false, message: "Address is required" });
        if (!aadhaarNumber?.trim()) return res.status(400).json({ success: false, message: "Aadhaar number is required" });
        if (!drivingLicenceNumber?.trim()) {
            return res.status(400).json({ success: false, message: "Driving licence number is required" });
        }
        if (!dlExpiryDate) return res.status(400).json({ success: false, message: "DL expiry date is required" });
        if (!password || String(password).trim().length < 6) {
            return res.status(400).json({ success: false, message: "Password is required (min 6 characters)" });
        }

        const expiry = new Date(dlExpiryDate);
        if (Number.isNaN(expiry.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid DL expiry date" });
        }

        const vendor = await resolveVendorForCreate(req);

        const duplicate = await Driver.findOne({ mobileNumber: String(mobileNumber).trim() });
        if (duplicate) {
            return res.status(409).json({ success: false, message: "Driver with this mobile number already exists" });
        }

        if (email?.trim()) {
            const emailClash = await Driver.findOne({ email: String(email).toLowerCase().trim() });
            if (emailClash) {
                return res.status(409).json({ success: false, message: "Driver with this email already exists" });
            }
        }

        const driverId = await generateDriverId(vendor?.companyName);

        if (!req.files?.aadhaarDocument?.[0]) {
            return res.status(400).json({ success: false, message: "Aadhaar document is required" });
        }
        if (!req.files?.drivingLicenceDocument?.[0]) {
            return res.status(400).json({
                success: false,
                message: "Driving licence document is required",
            });
        }

        const driver = new Driver({
            driverId,
            name: name.trim(),
            mobileNumber: mobileNumber.trim(),
            email: email?.trim() ? String(email).toLowerCase().trim() : null,
            password: String(password).trim(),
            address: address.trim(),
            aadhaarNumber: aadhaarNumber.trim(),
            drivingLicenceNumber: drivingLicenceNumber.trim().toUpperCase(),
            dlExpiryDate: expiry,
            assignedVendor: vendor?._id || null,
            status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            documentVerificationStatus: "PENDING",
            createdByRole: isVendor(req) ? "VENDOR" : "ADMIN",
            createdBy: req.user._id,
            createdByModel: isVendor(req) ? "Vendor" : "User",
        });

        applyDocs(driver, req.files);
        applyOtherDocuments(driver, req.files, req.body);
        await driver.save();

        const populated = await Driver.findById(driver._id)
            .select("-password -refreshToken")
            .populate("assignedVendor", "vendorId companyName email mobileNumber status");

        res.status(201).json({
            success: true,
            message: "Driver registered — pending admin document verification",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const getDrivers = async (req, res, next) => {
    try {
        const {
            search,
            status,
            documentVerificationStatus,
            assignedVendor,
            unassigned,
            city,
            dlExpiringBefore,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = {};

        if (
            documentVerificationStatus &&
            ["PENDING", "VERIFIED", "REJECTED"].includes(String(documentVerificationStatus))
        ) {
            filter.documentVerificationStatus = documentVerificationStatus;
        }

        if (isVendor(req)) {
            filter.assignedVendor = req.user._id;
        } else if (unassigned === "1" || unassigned === "true") {
            filter.assignedVendor = null;
        } else if (assignedVendor) {
            if (!mongoose.Types.ObjectId.isValid(assignedVendor)) {
                return res.status(400).json({ success: false, message: "Invalid assignedVendor ID" });
            }
            filter.assignedVendor = assignedVendor;
        }

        if (status) {
            if (!["ACTIVE", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            filter.status = status;
        }

        if (dlExpiringBefore) {
            const before = new Date(dlExpiringBefore);
            if (Number.isNaN(before.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid dlExpiringBefore date" });
            }
            filter.dlExpiryDate = { $lte: before };
        }

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { driverId: { $regex: safe, $options: "i" } },
                { name: { $regex: safe, $options: "i" } },
                { mobileNumber: { $regex: safe, $options: "i" } },
                { email: { $regex: safe, $options: "i" } },
                { drivingLicenceNumber: { $regex: safe, $options: "i" } },
                { aadhaarNumber: { $regex: safe, $options: "i" } },
                { address: { $regex: safe, $options: "i" } },
            ];
        }

        if (city) {
            filter.address = { ...(filter.address || {}), $regex: escapeRegex(city), $options: "i" };
        }

        const allowedSort = new Set(["createdAt", "updatedAt", "name", "driverId", "status", "dlExpiryDate"]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Driver.countDocuments(filter),
            Driver.find(filter)
                .select("-password -refreshToken")
                .populate("assignedVendor", "vendorId companyName email mobileNumber status")
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        const ids = data.map((d) => d._id);
        let countMap = {};
        if (ids.length) {
            const counts = await Lead.aggregate([
                { $match: { assignedDriver: { $in: ids }, status: "COMPLETED" } },
                { $group: { _id: "$assignedDriver", completedTrips: { $sum: 1 } } },
            ]);
            countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.completedTrips]));
        }

        const withStats = data.map((d) => ({
            ...d,
            completedTrips: countMap[String(d._id)] || 0,
        }));

        res.status(200).json({
            success: true,
            data: withStats,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getDriverById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid driver ID format" });
        }

        const driver = await Driver.findById(req.params.id)
            .select("-password -refreshToken")
            .populate("assignedVendor", "vendorId companyName email mobileNumber status documentVerificationStatus");

        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        assertDriverAccess(req, driver);

        const [completedTrips, completedList] = await Promise.all([
            Lead.countDocuments({ assignedDriver: driver._id, status: "COMPLETED" }),
            Lead.find({ assignedDriver: driver._id, status: "COMPLETED" })
                .select(
                    "leadId customerName mobileNumber pickupLocation dropLocation travelDate pickupTime grandTotal pendingAmount status updatedAt invoiceId invoicePdfUrl invoiceGeneratedAt"
                )
                .sort({ updatedAt: -1 })
                .limit(50)
                .lean(),
        ]);

        const payload = driver.toObject();
        payload.completedTrips = completedTrips;
        payload.completedTripList = completedList;

        res.status(200).json({ success: true, data: payload });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const updateDriver = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid driver ID format" });
        }

        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        assertDriverAccess(req, driver);

        const fields = [
            "name",
            "mobileNumber",
            "email",
            "address",
            "aadhaarNumber",
            "drivingLicenceNumber",
        ];

        for (const field of fields) {
            if (req.body[field] !== undefined && req.body[field] !== null) {
                driver[field] = String(req.body[field]).trim();
            }
        }

        if (req.body.email !== undefined) {
            driver.email = req.body.email?.trim()
                ? String(req.body.email).toLowerCase().trim()
                : null;
        }
        if (req.body.drivingLicenceNumber) {
            driver.drivingLicenceNumber = String(req.body.drivingLicenceNumber).trim().toUpperCase();
        }

        if (req.body.dlExpiryDate) {
            const expiry = new Date(req.body.dlExpiryDate);
            if (Number.isNaN(expiry.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid DL expiry date" });
            }
            driver.dlExpiryDate = expiry;
        }

        if (req.body.password && String(req.body.password).trim()) {
            if (String(req.body.password).trim().length < 6) {
                return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
            }
            driver.password = String(req.body.password).trim();
        }

        if (req.body.status) {
            if (!["ACTIVE", "INACTIVE"].includes(req.body.status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            driver.status = req.body.status;
        }

        // Only admin can reassign vendor
        if (isAdmin(req) && Object.prototype.hasOwnProperty.call(req.body, "assignedVendor")) {
            const vendorId = req.body.assignedVendor;
            if (!vendorId || vendorId === "null" || vendorId === "unassigned" || String(vendorId).trim() === "") {
                driver.assignedVendor = null;
            } else {
                if (!mongoose.Types.ObjectId.isValid(vendorId)) {
                    return res.status(400).json({ success: false, message: "Invalid assigned vendor ID" });
                }
                const vendor = await Vendor.findById(vendorId);
                if (!vendor) {
                    return res.status(404).json({ success: false, message: "Assigned vendor not found" });
                }
                driver.assignedVendor = vendor._id;
            }
        }

        if (req.body.mobileNumber) {
            const clash = await Driver.findOne({
                _id: { $ne: driver._id },
                mobileNumber: String(req.body.mobileNumber).trim(),
            });
            if (clash) {
                return res.status(409).json({ success: false, message: "Another driver already uses this mobile" });
            }
        }

        if (driver.email) {
            const emailClash = await Driver.findOne({
                _id: { $ne: driver._id },
                email: driver.email,
            });
            if (emailClash) {
                return res.status(409).json({ success: false, message: "Another driver already uses this email" });
            }
        }

        const requiredDocsChanged = applyDocs(driver, req.files);
        applyOtherDocuments(driver, req.files, req.body);

        if (!driver.aadhaarDocument?.url || !driver.drivingLicenceDocument?.url) {
            return res.status(400).json({
                success: false,
                message: "Aadhaar and driving licence documents are required",
            });
        }

        if (requiredDocsChanged) {
            driver.documentVerificationStatus = "PENDING";
            driver.documentVerifiedAt = null;
            driver.documentVerifiedBy = null;
            driver.documentRejectionReason = "";
        }

        await driver.save();

        const populated = await Driver.findById(driver._id)
            .select("-password -refreshToken")
            .populate("assignedVendor", "vendorId companyName email mobileNumber status");

        res.status(200).json({
            success: true,
            message: requiredDocsChanged
                ? "Driver updated — documents pending admin verification again"
                : "Driver updated successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

/**
 * Admin-only: verify / reject driver documents.
 * @route PATCH /api/v1/drivers/:id/verify
 */
const verifyDriver = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                success: false,
                message: "Only admin can verify driver documents",
            });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid driver ID format" });
        }

        const { documentVerificationStatus, rejectionReason } = req.body;
        if (!["VERIFIED", "REJECTED", "PENDING"].includes(documentVerificationStatus)) {
            return res.status(400).json({
                success: false,
                message: "documentVerificationStatus must be VERIFIED, REJECTED or PENDING",
            });
        }

        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        if (documentVerificationStatus === "VERIFIED") {
            if (!driver.aadhaarDocument?.url || !driver.drivingLicenceDocument?.url) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot verify — Aadhaar and driving licence documents are missing",
                });
            }
            driver.documentVerifiedAt = new Date();
            driver.documentVerifiedBy = req.user._id;
            driver.documentRejectionReason = "";
        } else if (documentVerificationStatus === "REJECTED") {
            const reason = String(rejectionReason || "").trim();
            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: "Rejection reason is required",
                });
            }
            driver.documentVerifiedAt = null;
            driver.documentVerifiedBy = null;
            driver.documentRejectionReason = reason;
            driver.refreshToken = null;
        } else {
            driver.documentVerifiedAt = null;
            driver.documentVerifiedBy = null;
            driver.documentRejectionReason = "";
            driver.refreshToken = null;
        }

        driver.documentVerificationStatus = documentVerificationStatus;
        await driver.save();

        res.status(200).json({
            success: true,
            message:
                documentVerificationStatus === "VERIFIED"
                    ? "KYC verified — driver login allowed"
                    : documentVerificationStatus === "REJECTED"
                      ? "KYC rejected — driver login blocked"
                      : "KYC marked pending",
            data: {
                id: driver._id,
                driverId: driver.driverId,
                name: driver.name,
                documentVerificationStatus: driver.documentVerificationStatus,
                documentRejectionReason: driver.documentRejectionReason || "",
                documentVerifiedAt: driver.documentVerifiedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

const changeDriverStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid driver ID format" });
        }

        const { status } = req.body;
        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
        }

        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        assertDriverAccess(req, driver);

        driver.status = status;
        await driver.save();

        res.status(200).json({
            success: true,
            message: `Driver marked as ${status}`,
            data: { id: driver._id, driverId: driver.driverId, status: driver.status },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const deleteDriver = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid driver ID format" });
        }

        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        assertDriverAccess(req, driver);

        for (const field of DOC_FIELDS) {
            if (driver[field]) removeLocalFile(driver[field]);
        }

        await driver.deleteOne();

        res.status(200).json({ success: true, message: "Driver deleted successfully" });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

module.exports = {
    createDriver,
    getDrivers,
    getDriverById,
    updateDriver,
    verifyDriver,
    changeDriverStatus,
    deleteDriver,
};
