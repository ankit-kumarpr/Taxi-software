const mongoose = require("mongoose");

const vendorTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: "",
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });

vendorTypeSchema.index({ status: 1 });
vendorTypeSchema.index({ name: "text" });

module.exports = mongoose.model("VendorType", vendorTypeSchema);
