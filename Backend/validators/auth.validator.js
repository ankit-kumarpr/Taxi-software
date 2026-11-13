const { body } = require("express-validator");

const addressValidation = [
    body("address.city").notEmpty().withMessage("City is required"),
    body("address.state").notEmpty().withMessage("State is required"),
    body("address.pincode").notEmpty().withMessage("Pincode is required"),
    body("address.locality").notEmpty().withMessage("Locality is required"),
    body("address.street").notEmpty().withMessage("Street is required"),
];

const registerValidator = [
    body("name").notEmpty().withMessage("Name is required").isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").isEmail().withMessage("Provide a valid email").normalizeEmail(),
    body("phone").notEmpty().withMessage("Phone is required").isMobilePhone().withMessage("Provide a valid phone number"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    ...addressValidation,
];

// Admin/Vendor: email. Driver: email or mobile number (same field name "email")
const loginValidator = [
    body("email").notEmpty().withMessage("Email or mobile number is required").bail()
        .custom((value) => {
            const v = String(value || "").trim();
            const isEmail = /\S+@\S+\.\S+/.test(v);
            const isMobile = /^[0-9+\-\s]{8,15}$/.test(v);
            if (!isEmail && !isMobile) {
                throw new Error("Provide a valid email or mobile number");
            }
            return true;
        }),
    body("password").notEmpty().withMessage("Password is required"),
];

module.exports = {
    registerValidator,
    loginValidator,
};
