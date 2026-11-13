const mongoose = require("mongoose");

const designationSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    department: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Department", 
        required: true 
    },
    status: { 
        type: String, 
        enum: ["ACTIVE", "INACTIVE"], 
        default: "ACTIVE" 
    },
    /** Optional template — staff still get per-user grant/deny (Option C) */
    permissions: {
        type: [String],
        default: [],
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }
}, { timestamps: true });

// A Designation name should be unique within a specific department
designationSchema.index({ name: 1, department: 1 }, { unique: true });

module.exports = mongoose.model("Designation", designationSchema);
