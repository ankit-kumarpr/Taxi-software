const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema(
    {
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        locality: { type: String, required: true },
        street: { type: String, required: true },
        landmark: { type: String },
    },
    { _id: false }
);

const employeeDocumentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true },
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        phone: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        userType: {
            type: String,
            enum: ["ADMIN"],
            required: true,
            default: "ADMIN",
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
            default: "ACTIVE",
        },
        address: { type: addressSchema, required: true },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            default: null,
        },
        designation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Designation",
            default: null,
        },
        /**
         * Full bypass — owner / main admin.
         * Default undefined so existing DB users are promoted to super on first resolve
         * (mongoose default:false was locking everyone out).
         */
        isSuperAdmin: {
            type: Boolean,
            default: undefined,
        },
        /**
         * Option C micro overrides on top of designation template:
         * grant = extra allow, deny = strip even if designation has it
         */
        permissionOverrides: {
            grant: { type: [String], default: [] },
            deny: { type: [String], default: [] },
        },
        /** Named docs: Aadhaar / offer letter / etc — image or PDF */
        documents: {
            type: [employeeDocumentSchema],
            default: [],
        },
        refreshToken: { type: String },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
