const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");
const VendorType = require("../models/VendorType");
const User = require("../models/User");
const generateVendorId = require("../utils/generateVendorId");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");
const { getOrCreateProfile } = require("./companyProfile.controller");
const {
    getPendingVendorDocuments,
    getUploadedVendorDocuments,
    VENDOR_DOCUMENT_FIELDS,
} = require("../utils/vendorDocuments");
const { runVendorDocumentReminders } = require("../jobs/vendorDocumentReminder.job");

const SINGLE_DOC_FIELDS = [
    "cancelledCheque",
    "aadhaarDocument",
    "panDocument",
    "companyRegistrationDocument",
    "gstCertificate",
];

const TEXT_FIELDS = [
    "companyName",
    "companyRegistrationNumber",
    "gstNumber",
    "contactPersonName",
    "ownerName",
    "mobileNumber",
    "alternateContactNumber",
    "email",
    "aadhaarNumber",
    "panNumber",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "pinCode",
    "country",
    "bankAccountHolderName",
    "bankName",
    "bankAccountNumber",
    "ifscCode",
    "emergencyContactName",
    "emergencyContactRelationship",
    "emergencyContactNumber",
    "internalNotes",
];

const assertActiveVendorType = async (vendorTypeId) => {
    if (!mongoose.Types.ObjectId.isValid(vendorTypeId)) {
        const error = new Error("Invalid vendor type ID format");
        error.status = 400;
        throw error;
    }
    const type = await VendorType.findById(vendorTypeId);
    if (!type) {
        const error = new Error("Vendor type not found");
        error.status = 404;
        throw error;
    }
    if (type.status !== "ACTIVE") {
        const error = new Error("Cannot assign an INACTIVE vendor type");
        error.status = 400;
        throw error;
    }
    return type;
};

const applyUploadedDocs = (vendor, files, { replaceOther = false } = {}) => {
    if (!files) return;

    for (const field of SINGLE_DOC_FIELDS) {
        const file = files[field]?.[0];
        if (!file) continue;
        if (vendor[field]) removeLocalFile(vendor[field]);
        vendor[field] = toDocumentMeta(file);
    }

    if (files.otherDocuments?.length) {
        const extras = files.otherDocuments.map(toDocumentMeta);
        vendor.otherDocuments = replaceOther
            ? extras
            : [...(vendor.otherDocuments || []), ...extras];
    }
};

const createVendor = async (req, res, next) => {
    try {
        const {
            companyName,
            vendorType,
            mobileNumber,
            email,
            password,
            addressLine1,
            city,
            state,
            pinCode,
        } = req.body;

        if (!companyName?.trim()) {
            return res.status(400).json({ success: false, message: "Company / Vendor name is required" });
        }
        if (!mobileNumber?.trim()) {
            return res.status(400).json({ success: false, message: "Mobile number is required" });
        }
        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: "Email address is required" });
        }
        if (!password || String(password).trim().length < 6) {
            return res.status(400).json({ success: false, message: "Password is required (min 6 characters)" });
        }
        if (!addressLine1?.trim() || !city?.trim() || !state?.trim() || !pinCode?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Address line 1, city, state and PIN code are required",
            });
        }

        await assertActiveVendorType(vendorType);

        const normalizedEmail = String(email).toLowerCase().trim();

        const adminClash = await User.findOne({ email: normalizedEmail });
        if (adminClash) {
            return res.status(409).json({
                success: false,
                message: "Email already used by an admin account",
            });
        }

        const duplicate = await Vendor.findOne({
            $or: [
                { email: normalizedEmail },
                { mobileNumber: String(mobileNumber).trim() },
            ],
        });
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "Vendor with this email or mobile number already exists",
            });
        }

        const vendorId = await generateVendorId();
        const payload = {
            vendorId,
            createdBy: req.user._id,
            vendorType,
            companyName: companyName.trim(),
            mobileNumber: mobileNumber.trim(),
            email: normalizedEmail,
            password: String(password).trim(),
            addressLine1: addressLine1.trim(),
            city: city.trim(),
            state: state.trim(),
            pinCode: pinCode.trim(),
        };

        for (const field of TEXT_FIELDS) {
            if (["companyName", "mobileNumber", "email", "addressLine1", "city", "state", "pinCode"].includes(field)) {
                continue;
            }
            if (req.body[field] !== undefined && req.body[field] !== null) {
                payload[field] = String(req.body[field]).trim();
            }
        }

        if (req.body.documentVerificationStatus) {
            if (!["PENDING", "VERIFIED", "REJECTED"].includes(req.body.documentVerificationStatus)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid documentVerificationStatus. Use PENDING, VERIFIED or REJECTED",
                });
            }
            payload.documentVerificationStatus = req.body.documentVerificationStatus;
        }

        if (req.body.vendorRating !== undefined && req.body.vendorRating !== "") {
            const rating = Number(req.body.vendorRating);
            if (Number.isNaN(rating) || rating < 0 || rating > 5) {
                return res.status(400).json({ success: false, message: "Vendor rating must be between 0 and 5" });
            }
            payload.vendorRating = rating;
        }

        if (req.body.status) {
            if (!["ACTIVE", "INACTIVE"].includes(req.body.status)) {
                return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
            }
            payload.status = req.body.status;
        }

        const vendor = new Vendor(payload);
        applyUploadedDocs(vendor, req.files);
        await vendor.save();

        const populated = await Vendor.findById(vendor._id)
            .select("-password -refreshToken")
            .populate("vendorType", "name status")
            .populate("createdBy", "name email");

        res.status(201).json({
            success: true,
            message: "Vendor created successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const getVendors = async (req, res, next) => {
    try {
        const {
            search,
            vendorType,
            status,
            documentVerificationStatus,
            businessModel,
            city,
            state,
            country,
            mobileNumber,
            email,
            vendorId,
            gstNumber,
            panNumber,
            ratingMin,
            ratingMax,
            walletMin,
            walletMax,
            createdFrom,
            createdTo,
            createdBy,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = {};

        if (status) {
            if (!["ACTIVE", "INACTIVE"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
            }
            filter.status = status;
        }

        if (documentVerificationStatus) {
            if (!["PENDING", "VERIFIED", "REJECTED"].includes(documentVerificationStatus)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid documentVerificationStatus. Use PENDING, VERIFIED or REJECTED",
                });
            }
            filter.documentVerificationStatus = documentVerificationStatus;
        }

        if (businessModel) {
            if (businessModel === "UNSET") {
                filter.businessModel = null;
            } else if (["FIXED", "BID"].includes(businessModel)) {
                filter.businessModel = businessModel;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid businessModel. Use FIXED, BID or UNSET",
                });
            }
        }

        if (vendorType) {
            if (!mongoose.Types.ObjectId.isValid(vendorType)) {
                return res.status(400).json({ success: false, message: "Invalid vendor type ID format" });
            }
            filter.vendorType = vendorType;
        }

        if (createdBy) {
            if (!mongoose.Types.ObjectId.isValid(createdBy)) {
                return res.status(400).json({ success: false, message: "Invalid createdBy ID format" });
            }
            filter.createdBy = createdBy;
        }

        if (city) filter.city = { $regex: escapeRegex(city), $options: "i" };
        if (state) filter.state = { $regex: escapeRegex(state), $options: "i" };
        if (country) filter.country = { $regex: escapeRegex(country), $options: "i" };
        if (mobileNumber) filter.mobileNumber = { $regex: escapeRegex(mobileNumber), $options: "i" };
        if (email) filter.email = { $regex: escapeRegex(email), $options: "i" };
        if (vendorId) filter.vendorId = { $regex: escapeRegex(vendorId), $options: "i" };
        if (gstNumber) filter.gstNumber = { $regex: escapeRegex(gstNumber), $options: "i" };
        if (panNumber) filter.panNumber = { $regex: escapeRegex(panNumber), $options: "i" };

        if (ratingMin !== undefined || ratingMax !== undefined) {
            filter.vendorRating = {};
            if (ratingMin !== undefined && ratingMin !== "") filter.vendorRating.$gte = Number(ratingMin);
            if (ratingMax !== undefined && ratingMax !== "") filter.vendorRating.$lte = Number(ratingMax);
        }

        if (walletMin !== undefined || walletMax !== undefined) {
            filter.walletBalance = {};
            if (walletMin !== undefined && walletMin !== "") filter.walletBalance.$gte = Number(walletMin);
            if (walletMax !== undefined && walletMax !== "") filter.walletBalance.$lte = Number(walletMax);
        }

        if (createdFrom || createdTo) {
            filter.createdAt = {};
            if (createdFrom) {
                const from = new Date(createdFrom);
                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid createdFrom date" });
                }
                filter.createdAt.$gte = from;
            }
            if (createdTo) {
                const to = new Date(createdTo);
                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid createdTo date" });
                }
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { vendorId: { $regex: safe, $options: "i" } },
                { companyName: { $regex: safe, $options: "i" } },
                { email: { $regex: safe, $options: "i" } },
                { mobileNumber: { $regex: safe, $options: "i" } },
                { contactPersonName: { $regex: safe, $options: "i" } },
                { ownerName: { $regex: safe, $options: "i" } },
                { gstNumber: { $regex: safe, $options: "i" } },
                { panNumber: { $regex: safe, $options: "i" } },
                { city: { $regex: safe, $options: "i" } },
            ];
        }

        const allowedSort = new Set([
            "createdAt",
            "updatedAt",
            "companyName",
            "vendorId",
            "status",
            "vendorRating",
            "walletBalance",
            "documentVerificationStatus",
        ]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Vendor.countDocuments(filter),
            Vendor.find(filter)
                .select("-walletTransactions -password -refreshToken")
                .populate("vendorType", "name status")
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

const getVendorStatusCounts = async (req, res, next) => {
    try {
        const [statusRows, verifyRows, total] = await Promise.all([
            Vendor.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            Vendor.aggregate([
                { $group: { _id: "$documentVerificationStatus", count: { $sum: 1 } } },
            ]),
            Vendor.countDocuments({}),
        ]);

        const byStatus = { ACTIVE: 0, INACTIVE: 0 };
        for (const row of statusRows) {
            if (Object.prototype.hasOwnProperty.call(byStatus, row._id)) {
                byStatus[row._id] = Number(row.count) || 0;
            }
        }

        const byVerification = { PENDING: 0, VERIFIED: 0, REJECTED: 0 };
        for (const row of verifyRows) {
            const key = row._id || "PENDING";
            if (Object.prototype.hasOwnProperty.call(byVerification, key)) {
                byVerification[key] = Number(row.count) || 0;
            }
        }

        res.status(200).json({
            success: true,
            data: { total, byStatus, byVerification },
        });
    } catch (error) {
        next(error);
    }
};

const getVendorById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const vendor = await Vendor.findById(req.params.id)
            .select("-password -refreshToken")
            .populate("vendorType", "name status")
            .populate("createdBy", "name email")
            .populate("walletTransactions.createdBy", "name email");

        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        next(error);
    }
};

const updateVendor = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        if (req.body.vendorType) {
            await assertActiveVendorType(req.body.vendorType);
            vendor.vendorType = req.body.vendorType;
        }

        for (const field of TEXT_FIELDS) {
            if (req.body[field] !== undefined && req.body[field] !== null) {
                vendor[field] = String(req.body[field]).trim();
            }
        }

        if (req.body.documentVerificationStatus) {
            if (!["PENDING", "VERIFIED", "REJECTED"].includes(req.body.documentVerificationStatus)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid documentVerificationStatus. Use PENDING, VERIFIED or REJECTED",
                });
            }
            vendor.documentVerificationStatus = req.body.documentVerificationStatus;
        }

        if (req.body.vendorRating !== undefined && req.body.vendorRating !== "") {
            const rating = Number(req.body.vendorRating);
            if (Number.isNaN(rating) || rating < 0 || rating > 5) {
                return res.status(400).json({ success: false, message: "Vendor rating must be between 0 and 5" });
            }
            vendor.vendorRating = rating;
        }

        if (req.body.password !== undefined && req.body.password !== null && String(req.body.password).trim() !== "") {
            if (String(req.body.password).trim().length < 6) {
                return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
            }
            vendor.password = String(req.body.password).trim();
        }

        if (req.body.email || req.body.mobileNumber) {
            if (req.body.email) {
                const adminClash = await User.findOne({ email: String(req.body.email).toLowerCase().trim() });
                if (adminClash) {
                    return res.status(409).json({
                        success: false,
                        message: "Email already used by an admin account",
                    });
                }
            }

            const clash = await Vendor.findOne({
                _id: { $ne: vendor._id },
                $or: [
                    ...(req.body.email ? [{ email: String(req.body.email).toLowerCase().trim() }] : []),
                    ...(req.body.mobileNumber ? [{ mobileNumber: String(req.body.mobileNumber).trim() }] : []),
                ],
            });
            if (clash) {
                return res.status(409).json({
                    success: false,
                    message: "Another vendor already uses this email or mobile number",
                });
            }
        }

        // Optional: clear specific otherDocuments by ids
        if (req.body.removeOtherDocumentIds) {
            let ids = req.body.removeOtherDocumentIds;
            if (typeof ids === "string") {
                try {
                    ids = JSON.parse(ids);
                } catch {
                    return res.status(400).json({ success: false, message: "removeOtherDocumentIds must be a JSON array" });
                }
            }
            if (Array.isArray(ids) && ids.length) {
                const removeSet = new Set(ids.map(String));
                const keep = [];
                for (const doc of vendor.otherDocuments || []) {
                    if (removeSet.has(String(doc._id))) removeLocalFile(doc);
                    else keep.push(doc);
                }
                vendor.otherDocuments = keep;
            }
        }

        applyUploadedDocs(vendor, req.files, {
            replaceOther: req.body.replaceOtherDocuments === "true" || req.body.replaceOtherDocuments === true,
        });

        await vendor.save();

        const populated = await Vendor.findById(vendor._id)
            .select("-password -refreshToken")
            .populate("vendorType", "name status")
            .populate("createdBy", "name email")
            .populate("walletTransactions.createdBy", "name email");

        res.status(200).json({
            success: true,
            message: "Vendor updated successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const changeVendorStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const { status } = req.body;
        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Use ACTIVE or INACTIVE" });
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        vendor.status = status;
        await vendor.save();

        res.status(200).json({
            success: true,
            message: `Vendor marked as ${status}`,
            data: { id: vendor._id, vendorId: vendor.vendorId, status: vendor.status },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin verify / reject vendor documents
// @route   PATCH /api/v1/admin/vendors/:id/verify
const verifyVendor = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const { documentVerificationStatus, internalNotes } = req.body;
        if (!["VERIFIED", "REJECTED", "PENDING"].includes(documentVerificationStatus)) {
            return res.status(400).json({
                success: false,
                message: "documentVerificationStatus must be VERIFIED, REJECTED or PENDING",
            });
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        vendor.documentVerificationStatus = documentVerificationStatus;
        if (internalNotes !== undefined) {
            vendor.internalNotes = String(internalNotes || "").trim();
        }

        // When verified, keep account active so they can login
        if (documentVerificationStatus === "VERIFIED" && vendor.status !== "ACTIVE") {
            vendor.status = "ACTIVE";
        }

        await vendor.save();

        res.status(200).json({
            success: true,
            message:
                documentVerificationStatus === "VERIFIED"
                    ? "Vendor verified — they can now login"
                    : documentVerificationStatus === "REJECTED"
                        ? "Vendor verification rejected"
                        : "Vendor marked as pending verification",
            data: {
                id: vendor._id,
                vendorId: vendor.vendorId,
                companyName: vendor.companyName,
                documentVerificationStatus: vendor.documentVerificationStatus,
                status: vendor.status,
            },
        });
    } catch (error) {
        next(error);
    }
};

const parseSharePercent = (raw) => {
    const num = typeof raw === "string" ? Number(String(raw).trim()) : Number(raw);
    if (!Number.isFinite(num) || num < 0 || num > 100) return null;
    return Math.round(num * 100) / 100;
};

/**
 * Admin list: vendors with at least one missing document + which docs are pending.
 * @route GET /api/v1/admin/vendors/pending-documents
 */
const listPendingDocuments = async (req, res, next) => {
    try {
        const { search, page: pageRaw, limit: limitRaw } = req.query;
        const page = Math.max(1, parseInt(pageRaw, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));

        // Show by missing files — even if admin already marked VERIFIED
        const filter = {};

        if (search) {
            const re = new RegExp(escapeRegex(String(search)), "i");
            filter.$or = [
                { companyName: re },
                { vendorId: re },
                { email: re },
                { mobileNumber: re },
                { contactPersonName: re },
            ];
        }

        const vendors = await Vendor.find(filter)
            .select(
                "vendorId companyName email mobileNumber contactPersonName documentVerificationStatus documentReminderSentAt documentReminderCount status createdAt updatedAt aadhaarDocument panDocument cancelledCheque companyRegistrationDocument gstCertificate"
            )
            .populate("vendorType", "name")
            .sort({ updatedAt: -1 })
            .lean();

        const mapped = vendors
            .map((v) => {
                const pendingDocuments = getPendingVendorDocuments(v);
                const uploadedDocuments = getUploadedVendorDocuments(v);
                return {
                    _id: v._id,
                    vendorId: v.vendorId,
                    companyName: v.companyName,
                    email: v.email,
                    mobileNumber: v.mobileNumber,
                    contactPersonName: v.contactPersonName,
                    vendorType: v.vendorType,
                    status: v.status,
                    documentVerificationStatus: v.documentVerificationStatus || "PENDING",
                    documentReminderSentAt: v.documentReminderSentAt || null,
                    documentReminderCount: v.documentReminderCount || 0,
                    createdAt: v.createdAt,
                    pendingDocuments,
                    uploadedDocuments,
                    pendingCount: pendingDocuments.length,
                    uploadedCount: uploadedDocuments.length,
                };
            })
            .filter((v) => v.pendingCount > 0);

        const total = mapped.length;
        const start = (page - 1) * limit;
        const data = mapped.slice(start, start + limit);

        res.status(200).json({
            success: true,
            data,
            requiredDocuments: VENDOR_DOCUMENT_FIELDS,
            pagination: {
                page,
                limit,
                total,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

/** Manually run the 3-day reminder sweep (admin). */
const triggerDocumentReminders = async (req, res, next) => {
    try {
        const summary = await runVendorDocumentReminders();
        res.status(200).json({
            success: true,
            message: `Reminders done — emailed ${summary.emailed || 0}, failed ${summary.failed || 0}`,
            data: summary,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get default FIXED company share % + FIXED vendor count
// @route   GET /api/v1/admin/vendors/fixed-share-settings
const getFixedShareSettings = async (req, res, next) => {
    try {
        const profile = await getOrCreateProfile();
        const fixedCount = await Vendor.countDocuments({ businessModel: "FIXED" });
        res.status(200).json({
            success: true,
            data: {
                defaultFixedCompanySharePercent:
                    profile.defaultFixedCompanySharePercent != null
                        ? profile.defaultFixedCompanySharePercent
                        : 20,
                fixedVendorCount: fixedCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Save default FIXED company %; optionally apply that % to every FIXED vendor.
 * @route PATCH /api/v1/admin/vendors/fixed-share-settings
 * body: { defaultFixedCompanySharePercent, applyToAllFixed?: boolean }
 */
const updateFixedShareSettings = async (req, res, next) => {
    try {
        const share = parseSharePercent(req.body.defaultFixedCompanySharePercent);
        if (share === null) {
            return res.status(400).json({
                success: false,
                message: "defaultFixedCompanySharePercent must be between 0 and 100",
            });
        }

        const applyToAllFixed =
            req.body.applyToAllFixed === true ||
            req.body.applyToAllFixed === "true" ||
            req.body.applyToAllFixed === 1 ||
            req.body.applyToAllFixed === "1";

        const profile = await getOrCreateProfile();
        profile.defaultFixedCompanySharePercent = share;
        profile.updatedBy = req.user?._id || null;
        await profile.save();

        let updatedCount = 0;
        if (applyToAllFixed) {
            const result = await Vendor.updateMany(
                { businessModel: "FIXED" },
                {
                    $set: {
                        companySharePercent: share,
                        businessModelSetAt: new Date(),
                        businessModelSetBy: req.user?._id || null,
                    },
                }
            );
            updatedCount = result.modifiedCount || 0;
        }

        const fixedCount = await Vendor.countDocuments({ businessModel: "FIXED" });

        res.status(200).json({
            success: true,
            message: applyToAllFixed
                ? `Default FIXED share set to ${share}% and applied to ${updatedCount} FIXED vendor(s)`
                : `Default FIXED company share saved as ${share}%`,
            data: {
                defaultFixedCompanySharePercent: share,
                applyToAllFixed,
                updatedCount,
                fixedVendorCount: fixedCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Set vendor business model: FIXED (% company share) or BID
// @route   PATCH /api/v1/admin/vendors/:id/business-model
const setVendorBusinessModel = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const { businessModel, companySharePercent } = req.body;

        if (!["FIXED", "BID"].includes(businessModel)) {
            return res.status(400).json({
                success: false,
                message: "businessModel must be FIXED or BID",
            });
        }

        let share = null;
        if (businessModel === "FIXED") {
            share = parseSharePercent(companySharePercent);
            if (share === null && (companySharePercent === undefined || companySharePercent === "" || companySharePercent === null)) {
                const profile = await getOrCreateProfile();
                share =
                    profile.defaultFixedCompanySharePercent != null
                        ? Number(profile.defaultFixedCompanySharePercent)
                        : 20;
            }
            if (share === null) {
                return res.status(400).json({
                    success: false,
                    message: "For FIXED model, companySharePercent is required (0–100)",
                });
            }
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        vendor.businessModel = businessModel;
        vendor.companySharePercent = businessModel === "FIXED" ? share : null;
        vendor.businessModelSetAt = new Date();
        vendor.businessModelSetBy = req.user?._id || null;
        await vendor.save();

        const vendorShare =
            businessModel === "FIXED" && share !== null
                ? Math.round((100 - share) * 100) / 100
                : null;

        res.status(200).json({
            success: true,
            message:
                businessModel === "FIXED"
                    ? `Fixed deal saved — company ${share}%, vendor ${vendorShare}%`
                    : "Bid model saved — trips will use bidding / first-accept",
            data: {
                id: vendor._id,
                vendorId: vendor.vendorId,
                companyName: vendor.companyName,
                businessModel: vendor.businessModel,
                companySharePercent: vendor.companySharePercent,
                vendorSharePercent: vendorShare,
                businessModelSetAt: vendor.businessModelSetAt,
            },
        });
    } catch (error) {
        next(error);
    }
};
const deleteVendor = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        for (const field of SINGLE_DOC_FIELDS) {
            if (vendor[field]) removeLocalFile(vendor[field]);
        }
        for (const doc of vendor.otherDocuments || []) {
            removeLocalFile(doc);
        }

        await vendor.deleteOne();

        res.status(200).json({ success: true, message: "Vendor deleted successfully" });
    } catch (error) {
        next(error);
    }
};

const getWalletHistory = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const { type, page = 1, limit = 20 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const vendor = await Vendor.findById(req.params.id).select("vendorId companyName walletBalance walletTransactions");
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        let txs = [...(vendor.walletTransactions || [])].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        if (type) {
            if (!["CREDIT", "DEBIT"].includes(type)) {
                return res.status(400).json({ success: false, message: "Invalid type. Use CREDIT or DEBIT" });
            }
            txs = txs.filter((t) => t.type === type);
        }

        const total = txs.length;
        const data = txs.slice(skip, skip + limitNum);

        res.status(200).json({
            success: true,
            data: {
                vendorId: vendor.vendorId,
                companyName: vendor.companyName,
                walletBalance: vendor.walletBalance,
                transactions: data,
            },
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const addWalletTransaction = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID format" });
        }

        const { type, amount, note } = req.body;
        if (!["CREDIT", "DEBIT"].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid type. Use CREDIT or DEBIT" });
        }

        const value = Number(amount);
        if (Number.isNaN(value) || value <= 0) {
            return res.status(400).json({ success: false, message: "Amount must be a positive number" });
        }

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        let nextBalance = vendor.walletBalance;
        if (type === "CREDIT") nextBalance += value;
        else {
            if (vendor.walletBalance < value) {
                return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
            }
            nextBalance -= value;
        }

        vendor.walletBalance = nextBalance;
        vendor.walletTransactions.push({
            type,
            amount: value,
            balanceAfter: nextBalance,
            note: note ? String(note).trim() : "",
            createdBy: req.user._id,
        });
        await vendor.save();

        const last = vendor.walletTransactions[vendor.walletTransactions.length - 1];

        res.status(201).json({
            success: true,
            message: "Wallet transaction added",
            data: {
                walletBalance: vendor.walletBalance,
                transaction: last,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createVendor,
    getVendors,
    getVendorStatusCounts,
    getVendorById,
    updateVendor,
    changeVendorStatus,
    verifyVendor,
    getFixedShareSettings,
    updateFixedShareSettings,
    listPendingDocuments,
    triggerDocumentReminders,
    setVendorBusinessModel,
    deleteVendor,
    getWalletHistory,
    addWalletTransaction,
};
