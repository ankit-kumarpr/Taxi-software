const Counter = require("../models/Counter");

const generateBidRoundId = async () => {
    const counter = await Counter.findOneAndUpdate(
        { id: "TWBIDROUND" },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );
    const n = String(counter.seq).padStart(3, "0");
    return `BID${n}`;
};

module.exports = { generateBidRoundId };
