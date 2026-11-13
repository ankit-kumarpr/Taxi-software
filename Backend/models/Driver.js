const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const documentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const driverSchema = new mongoose.Schema({
    driverId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    mobileNumber: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
        sparse: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
    },
    refreshToken: {
        type: String,
        select: false,
        default: null,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    aadhaarNumber: {
        type: String,
        required: true,
        trim: true,
    },
    aadhaarDocument: { type: documentSchema, default: null },
    drivingLicenceNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    drivingLicenceDocument: { type: documentSchema, default: null },
    dlExpiryDate: {
        type: Date,
        required: true,
    },
    profilePhoto: { type: documentSchema, default: null },
    /** Extra docs: name + file (image/pdf) */
    otherDocuments: {
        type: [
            {
                name: { type: String, trim: true, default: "Document" },
                url: { type: String, required: true },
                originalName: { type: String, default: "" },
                mimeType: { type: String, default: "" },
                size: { type: Number, default: 0 },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    },
    /** Admin-only KYC gate — login blocked until VERIFIED */
    documentVerificationStatus: {
        type: String,
        enum: ["PENDING", "VERIFIED", "REJECTED"],
        default: "PENDING",
        index: true,
    },
    documentVerifiedAt: {
        type: Date,
        default: null,
    },
    documentVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    documentRejectionReason: {
        type: String,
        trim: true,
        default: "",
    },
    assignedVendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        default: null,
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE",
    },
    /** Set after driver upgrades to a vendor account */
    convertedToVendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        default: null,
        index: true,
    },
    createdByRole: {
        type: String,
        enum: ["ADMIN", "VENDOR"],
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "createdByModel",
    },
    createdByModel: {
        type: String,
        enum: ["User", "Vendor"],
        default: "User",
    },
}, { timestamps: true });

driverSchema.index({ assignedVendor: 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ name: 1 });
driverSchema.index({ createdAt: -1 });
driverSchema.index({
    name: "text",
    email: "text",
    mobileNumber: "text",
    driverId: "text",
    drivingLicenceNumber: "text",
});

driverSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

driverSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Driver", driverSchema);
