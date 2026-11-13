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

const blogSchema = new mongoose.Schema(
    {
        shortHeading: { type: String, trim: true, default: "" },
        mainHeading: { type: String, required: true, trim: true },
        shortContent: { type: String, trim: true, default: "" },
        mainContent: { type: String, default: "" },
        mainImage: { type: imageSchema, default: null },
        otherImages: { type: [imageSchema], default: [] },
        faqs: { type: [faqSchema], default: [] },
        metaTitle: { type: String, trim: true, default: "" },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
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

blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ mainHeading: "text", shortHeading: "text", shortContent: "text", metaKeywords: "text" });

module.exports = mongoose.model("Blog", blogSchema);
