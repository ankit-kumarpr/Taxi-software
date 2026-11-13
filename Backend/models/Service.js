const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
    {
        question: { type: String, trim: true, default: "" },
        answer: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const imageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const serviceSchema = new mongoose.Schema(
    {
        shortHeading: { type: String, trim: true, default: "" },
        mainHeading: { type: String, required: true, trim: true },
        shortDescription: { type: String, trim: true, default: "" },
        mainContent: { type: String, default: "" },
        mainImage: { type: imageSchema, default: null },
        otherImages: { type: [imageSchema], default: [] },
        faqs: { type: [faqSchema], default: [] },
        includes: { type: [String], default: [] },
        excludes: { type: [String], default: [] },
        metaTitle: { type: String, trim: true, default: "" },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        canonical: { type: String, trim: true, default: "" },
        metaKeywords: { type: String, trim: true, default: "" },
        metaDescription: { type: String, trim: true, default: "" },
        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED", "INACTIVE"],
            default: "DRAFT",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

serviceSchema.index({ status: 1, createdAt: -1 });
serviceSchema.index({
    mainHeading: "text",
    shortHeading: "text",
    shortDescription: "text",
    metaKeywords: "text",
});

module.exports = mongoose.model("Service", serviceSchema);
