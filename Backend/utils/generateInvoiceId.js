const Counter = require("../models/Counter");

/**
 * Invoice IDs: TWINV + seq
 * e.g. TWINV001, TWINV002
 */
const generateInvoiceId = async () => {
    const counter = await Counter.findOneAndUpdate(
        { id: "TWINVOICE" },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );

    return `TWINV${String(counter.seq).padStart(3, "0")}`;
};

module.exports = { generateInvoiceId };
