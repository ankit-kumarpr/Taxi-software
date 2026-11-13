const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        label: {
            type: String,
            required: true,
            trim: true,
        },
        groupKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        groupLabel: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE",
            index: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

permissionSchema.index({ groupKey: 1, sortOrder: 1 });

module.exports = mongoose.model("Permission", permissionSchema);
