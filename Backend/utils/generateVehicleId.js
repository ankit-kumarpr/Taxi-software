const Counter = require("../models/Counter");
const { vendorCodeFromName } = require("./generateDriverId");

/**
 * Vehicle IDs: TWV + vendor 3 letters + seq
 * e.g. TWVABC001, TWVFLE002
 */
const generateVehicleId = async (vendorCompanyName) => {
    const code = vendorCodeFromName(vendorCompanyName);
    const counter = await Counter.findOneAndUpdate(
        { id: `TWVEH-${code}` },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );

    return `TWV${code}${String(counter.seq).padStart(3, "0")}`;
};

module.exports = { generateVehicleId };
