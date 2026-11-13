const jwt = require("jsonwebtoken");

/**
 * @param {string} id - User or Vendor Mongo _id
 * @param {"ADMIN"|"VENDOR"|"DRIVER"} role
 */
const generateAccessToken = (id, role = "ADMIN") => {
    return jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    });
};

const generateRefreshToken = (id, role = "ADMIN") => {
    return jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    });
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
