const Counter = require("../models/Counter");

const generateOfferId = async () => {
    const counter = await Counter.findOneAndUpdate(
        { id: "TWVENDOROFFER" },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );
    return `TWO${String(counter.seq).padStart(3, "0")}`;
};

const generatePickupCode = () => String(Math.floor(100000 + Math.random() * 900000));

module.exports = { generateOfferId, generatePickupCode };
