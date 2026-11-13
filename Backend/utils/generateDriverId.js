const Counter = require("../models/Counter");

/**
 * 3-letter code from vendor company name, e.g. "ABC Travels" -> "ABC"
 */
const vendorCodeFromName = (name) => {
    const letters = String(name || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (!letters) return "UNA";
    return (letters + "XXX").slice(0, 3);
};

/**
 * Driver IDs: TW + vendor 3 letters + seq
 * e.g. TWABC001, TWFLE002, TWUNA001 (unassigned)
 */
const generateDriverId = async (vendorCompanyName) => {
    const code = vendorCodeFromName(vendorCompanyName);
    const counter = await Counter.findOneAndUpdate(
        { id: `TWDRV-${code}` },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );

    return `TW${code}${String(counter.seq).padStart(3, "0")}`;
};

module.exports = { generateDriverId, vendorCodeFromName };
