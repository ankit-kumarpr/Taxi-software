const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const Vendor = require("../models/Vendor");
const VendorType = require("../models/VendorType");
const User = require("../models/User");
const generateVendorId = require("../utils/generateVendorId");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");

const SINGLE_DOC_FIELDS = [
    "cancelledCheque",
    "aadhaarDocument",
    "panDocument",
    "companyRegistrationDocument",
    "gstCertificate",
];

const OPTIONAL_TEXT = [
    "companyRegistrationNumber",
    "gstNumber",
    "contactPersonName",
    "ownerName",
    "alternateContactNumber",
    "panNumber",
    "addressLine2",
    "country",
    "bankAccountHolderName",
    "bankName",
    "bankAccountNumber",
    "ifscCode",
    "emergencyContactName",
    "emergencyContactRelationship",
    "emergencyContactNumber",
];

const isAdmin = (req) => req.accountRole === "ADMIN" || req.user?.userType === "ADMIN";
const isDriver = (req) => req.accountRole === "DRIVER" || req.user?.userType === "DRIVER";

const assertActiveVendorType = async (vendorTypeId) => {
    if (!mongoose.Types.ObjectId.isValid(vendorTypeId)) {
        const error = new Error("Invalid vendor type ID");
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
        const error = new Error("Selected vendor type is inactive");
        error.status = 400;
        throw error;
    }
    return type;
};

const applyUploadedDocs = (vendor, files) => {
    if (!files) return;
    for (const field of SINGLE_DOC_FIELDS) {
        const file = files[field]?.[0];
        if (!file) continue;
        if (vendor[field]) removeLocalFile(vendor[field]);
        vendor[field] = toDocumentMeta(file, "vendors");
    }
    if (files.otherDocuments?.length) {
        vendor.otherDocuments = [
            ...(vendor.otherDocuments || []),
            ...files.otherDocuments.map((f) => toDocumentMeta(f, "vendors")),
        ];
    }
};

const loadConvertibleDriver = async (driverId) => {
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
        const error = new Error("Invalid driver ID");
        error.status = 400;
        throw error;
    }
    const driver = await Driver.findById(driverId).select("+password");
    if (!driver) {
        const error = new Error("Driver not found");
        error.status = 404;
        throw error;
    }
    if (driver.convertedToVendor) {
        const error = new Error("This driver has already been converted to a vendor");
        error.status = 400;
        error.code = "ALREADY_CONVERTED";
        throw error;
    }
    if (driver.status !== "ACTIVE") {
        const error = new Error("Only active drivers can become a vendor");
        error.status = 400;
        throw error;
    }
    return driver;
};

const buildPrefillPayload = async (driver) => {
    const vendorTypes = await VendorType.find({ status: "ACTIVE" })
        .select("name status")
        .sort({ name: 1 })
        .lean();

    return {
        driver: {
            _id: driver._id,
            driverId: driver.driverId,
            name: driver.name,
            mobileNumber: driver.mobileNumber,
            email: driver.email || "",
            address: driver.address || "",
            aadhaarNumber: driver.aadhaarNumber || "",
            hasAadhaarDocument: Boolean(driver.aadhaarDocument?.url),
        },
        vendorTypes,
    };
};

const convertDriverToVendor = async ({ driver, req, byRole }) => {
    const {
        companyName,
        vendorType,
        email,
        password,
        mobileNumber,
        addressLine1,
        city,
        state,
        pinCode,
        ownerName,
        contactPersonName,
        aadhaarNumber,
    } = req.body;

    if (!companyName?.trim()) {
        const error = new Error("Company / Vendor name is required");
        error.status = 400;
        throw error;
    }
    if (!vendorType) {
        const error = new Error("Vendor type is required");
        error.status = 400;
        throw error;
    }
    if (!email?.trim()) {
        const error = new Error("Email is required for vendor login");
        error.status = 400;
        throw error;
    }
    if (!password || String(password).trim().length < 6) {
        const error = new Error("Password is required (min 6 characters) — used for vendor login");
        error.status = 400;
        throw error;
    }
    if (!addressLine1?.trim() || !city?.trim() || !state?.trim() || !pinCode?.trim()) {
        const error = new Error("Address line 1, city, state and PIN code are required");
        error.status = 400;
        throw error;
    }

    await assertActiveVendorType(vendorType);

    const normalizedEmail = String(email).toLowerCase().trim();
    const mobile = String(mobileNumber || driver.mobileNumber || "").trim();
    if (!mobile) {
        const error = new Error("Mobile number is required");
        error.status = 400;
        throw error;
    }

    const adminClash = await User.findOne({ email: normalizedEmail });
    if (adminClash) {
        const error = new Error("Email already used by an admin account");
        error.status = 409;
        throw error;
    }

    const vendorClash = await Vendor.findOne({
        $or: [{ email: normalizedEmail }, { mobileNumber: mobile }],
    });
    if (vendorClash) {
        const error = new Error("A vendor with this email or mobile already exists");
        error.status = 409;
        throw error;
    }

    if (normalizedEmail) {
        const otherDriver = await Driver.findOne({
            email: normalizedEmail,
            _id: { $ne: driver._id },
            status: "ACTIVE",
        });
        if (otherDriver) {
            const error = new Error("Email is already used by another active driver");
            error.status = 409;
            throw error;
        }
    }

    const vendorId = await generateVendorId();
    const notePrefix =
        byRole === "ADMIN"
            ? `Admin-promoted from driver ${driver.driverId}`
            : `Self-upgraded from driver ${driver.driverId}`;

    const payload = {
        vendorId,
        companyName: companyName.trim(),
        vendorType,
        mobileNumber: mobile,
        email: normalizedEmail,
        password: String(password).trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        country: (req.body.country && String(req.body.country).trim()) || "India",
        ownerName: (ownerName && String(ownerName).trim()) || driver.name,
        contactPersonName: (contactPersonName && String(contactPersonName).trim()) || driver.name,
        aadhaarNumber: (aadhaarNumber && String(aadhaarNumber).trim()) || driver.aadhaarNumber || "",
        documentVerificationStatus: "VERIFIED",
        status: "ACTIVE",
        convertedFromDriver: driver._id,
        internalNotes: `${notePrefix} on ${new Date().toISOString()}`,
    };

    if (byRole === "ADMIN" && req.user?._id) {
        payload.createdBy = req.user._id;
    }

    for (const field of OPTIONAL_TEXT) {
        if (["ownerName", "contactPersonName", "aadhaarNumber", "country"].includes(field)) continue;
        if (req.body[field] !== undefined && req.body[field] !== null && String(req.body[field]).trim() !== "") {
            payload[field] = String(req.body[field]).trim();
        }
    }

    if (driver.aadhaarDocument?.url) {
        const doc = driver.aadhaarDocument;
        payload.aadhaarDocument = {
            url: doc.url,
            originalName: doc.originalName || "",
            mimeType: doc.mimeType || "",
            size: doc.size || 0,
            uploadedAt: doc.uploadedAt || new Date(),
        };
    }

    const vendor = new Vendor(payload);
    applyUploadedDocs(vendor, req.files);
    await vendor.save();

    driver.status = "INACTIVE";
    driver.convertedToVendor = vendor._id;
    driver.assignedVendor = null;
    driver.refreshToken = null;
    await driver.save();

    return Vendor.findById(vendor._id)
        .select("-password -refreshToken")
        .populate("vendorType", "name status")
        .lean();
};

const getBecomeVendorPrefill = async (req, res, next) => {
    try {
        const driver = await loadConvertibleDriver(req.user._id);
        const data = await buildPrefillPayload(driver);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const becomeVendor = async (req, res, next) => {
    try {
        const driver = await loadConvertibleDriver(req.user._id);
        const populated = await convertDriverToVendor({ driver, req, byRole: "DRIVER" });
        res.status(201).json({
            success: true,
            message:
                "You are now a vendor. Driver account is inactive. Please login again with your vendor email/password.",
            data: {
                vendor: populated,
                loginHint: { email: populated.email, userType: "VENDOR" },
            },
        });
    } catch (error) {
        next(error);
    }
};

/** Admin: prefill promote form for a driver in the list */
const getPromoteVendorPrefill = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ success: false, message: "Only admin can promote drivers" });
        }
        const driver = await loadConvertibleDriver(req.params.id);
        const data = await buildPrefillPayload(driver);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

/** Admin: convert a listed driver into a vendor */
const promoteDriverToVendor = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ success: false, message: "Only admin can promote drivers" });
        }
        const driver = await loadConvertibleDriver(req.params.id);
        const populated = await convertDriverToVendor({ driver, req, byRole: "ADMIN" });
        res.status(201).json({
            success: true,
            message: `Driver ${driver.driverId} is now vendor ${populated.vendorId}. Driver login is inactive.`,
            data: {
                vendor: populated,
                loginHint: { email: populated.email, userType: "VENDOR" },
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBecomeVendorPrefill,
    becomeVendor,
    getPromoteVendorPrefill,
    promoteDriverToVendor,
    isDriver,
};
