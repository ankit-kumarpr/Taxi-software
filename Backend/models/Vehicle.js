const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const vehicleSchema = new mongoose.Schema({
    vehicleId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    vehicleNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
    },
    vehicleName: {
        type: String,
        required: true,
        trim: true,
    },
    vehicleType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CarType",
        required: true,
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    assignedDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null,
    },
    fuelType: {
        type: String,
        enum: ["PETROL", "DIESEL", "CNG", "ELECTRIC"],
        required: true,
    },
    transmission: {
        type: String,
        enum: ["MANUAL", "AUTOMATIC"],
        required: true,
    },
    seatingCapacity: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
    },
    rcDocument: { type: documentSchema, default: null },
    insuranceDocument: { type: documentSchema, default: null },
    pucDocument: { type: documentSchema, default: null },
    fitnessCertificate: { type: documentSchema, default: null },
    permitDocument: { type: documentSchema, default: null },
    vehiclePhoto: { type: documentSchema, default: null },
    /** Extra photos/docs uploaded at register/edit */
    otherImages: {
        type: [documentSchema],
        default: [],
    },
    /**
     * Full raw RegCheck CheckIndia JSON (dynamic).
     * Vehicle type stays our CarType — API VehicleType lives in rcDetails.apiVehicleType.
     */
    regCheckData: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    /** Flattened + labeled RC fields for UI */
    rcDetails: {
        description: { type: String, default: "" },
        make: { type: String, default: "" },
        model: { type: String, default: "" },
        variant: { type: String, default: "" },
        registrationYear: { type: String, default: "" },
        registrationDate: { type: String, default: "" },
        vin: { type: String, default: "" },
        engineNumber: { type: String, default: "" },
        engineSize: { type: String, default: "" },
        fuelTypeApi: { type: String, default: "" },
        transmissionApi: { type: String, default: "" },
        seats: { type: String, default: "" },
        owner: { type: String, default: "" },
        fitness: { type: String, default: "" },
        insurance: { type: String, default: "" },
        pucc: { type: String, default: "" },
        apiVehicleType: { type: String, default: "" },
        location: { type: String, default: "" },
        colour: { type: String, default: "" },
        bodyStyle: { type: String, default: "" },
        doors: { type: String, default: "" },
        imageUrl: { type: String, default: "" },
        flat: { type: mongoose.Schema.Types.Mixed, default: null },
        extras: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    regCheckFetchedAt: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE",
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

vehicleSchema.index({ vendor: 1 });
vehicleSchema.index({ assignedDriver: 1 });
vehicleSchema.index({ vehicleType: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ createdAt: -1 });
vehicleSchema.index({
    vehicleNumber: "text",
    vehicleName: "text",
    vehicleId: "text",
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
