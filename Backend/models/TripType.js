const mongoose = require("mongoose");

const tripTypeSchema = new mongoose.Schema({
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
    /** SINGLE_DAY = travel date only · MULTI_DAY = travel + end date on forms */
    durationType: {
        type: String,
        enum: ["SINGLE_DAY", "MULTI_DAY"],
        default: "SINGLE_DAY",
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

tripTypeSchema.index({ status: 1 });
tripTypeSchema.index({ name: "text" });

module.exports = mongoose.model("TripType", tripTypeSchema);
