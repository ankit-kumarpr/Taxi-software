const Counter = require("../models/Counter");

/**
 * Quotation IDs: TWQ + seq
 * e.g. TWQ001, TWQ002
 */
const generateQuotationId = async () => {
    const counter = await Counter.findOneAndUpdate(
        { id: "TWQUOTATION" },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );

    return `TWQ${String(counter.seq).padStart(3, "0")}`;
};

module.exports = { generateQuotationId };
