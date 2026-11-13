require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
    await mongoose.connect(process.env.MONGOURL);
    const r = await User.updateMany(
        {
            userType: "ADMIN",
            $or: [
                { isSuperAdmin: { $exists: false } },
                { isSuperAdmin: false },
                { isSuperAdmin: null },
            ],
        },
        { $set: { isSuperAdmin: true } }
    );
    console.log("promoted", r.modifiedCount ?? r.nModified ?? r);
    const rows = await User.find({ userType: "ADMIN" })
        .select("name email isSuperAdmin designation")
        .lean();
    console.log(JSON.stringify(rows, null, 2));
    await mongoose.disconnect();
    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
