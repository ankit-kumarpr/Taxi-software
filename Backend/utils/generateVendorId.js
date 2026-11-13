const Counter = require("../models/Counter");

/**
 * Generates vendor IDs like TWven001, TWven002, ...
 */
const generateVendorId = async () => {
    const counter = await Counter.findOneAndUpdate(
        { id: "TWVEN" },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );

    return `TWven${String(counter.seq).padStart(3, "0")}`;
};

module.exports = generateVendorId;
