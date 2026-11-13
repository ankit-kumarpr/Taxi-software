const Counter = require("../models/Counter");

/**
 * Lead IDs: TWLD + seq
 * e.g. TWLD001, TWLD002
 */
const generateLeadId = async () => {
    const counter = await Counter.findOneAndUpdate(
        { id: "TWLEAD" },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );

    return `TWLD${String(counter.seq).padStart(3, "0")}`;
};

module.exports = { generateLeadId };
