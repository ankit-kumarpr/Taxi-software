const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Driver = require("../models/Driver");
const {
    resolvePermissionsForUser,
    userHasPermission,
    userHasAllPermissions,
} = require("../utils/resolvePermissions");

const authenticate = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized — no token provided",
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Access token expired — please refresh",
                    code: "TOKEN_EXPIRED",
                });
            }
            if (err.name === "JsonWebTokenError") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token — please login again",
                    code: "TOKEN_INVALID",
                });
            }
            return res.status(401).json({
                success: false,
                message: "Token verification failed",
            });
        }

        const role = decoded.role || "ADMIN";

        if (role === "VENDOR") {
            const vendor = await Vendor.findById(decoded.id).select("-password -refreshToken");
            if (!vendor) {
                return res.status(401).json({
                    success: false,
                    message: "Vendor belonging to this token no longer exists",
                    code: "USER_NOT_FOUND",
                });
            }
            if (vendor.status === "INACTIVE") {
                return res.status(403).json({
                    success: false,
                    message: "Your account is inactive. Please contact support.",
                    code: "ACCOUNT_INACTIVE",
                });
            }

            if (vendor.documentVerificationStatus !== "VERIFIED") {
                return res.status(403).json({
                    success: false,
                    message: "Your account is not verified by admin yet.",
                    code: "VENDOR_NOT_VERIFIED",
                });
            }

            req.user = {
                _id: vendor._id,
                id: vendor._id,
                userType: "VENDOR",
                role: "VENDOR",
                email: vendor.email,
                name: vendor.companyName,
                status: vendor.status,
                documentVerificationStatus: vendor.documentVerificationStatus,
                permissions: [],
                isSuperAdmin: false,
                vendor,
            };
            req.accountRole = "VENDOR";
            return next();
        }

        if (role === "DRIVER") {
            const driver = await Driver.findById(decoded.id).select("-password -refreshToken");
            if (!driver) {
                return res.status(401).json({
                    success: false,
                    message: "Driver belonging to this token no longer exists",
                    code: "USER_NOT_FOUND",
                });
            }
            if (driver.status === "INACTIVE") {
                return res.status(403).json({
                    success: false,
                    message: "Your account is inactive. Please contact support.",
                    code: "ACCOUNT_INACTIVE",
                });
            }

            req.user = {
                _id: driver._id,
                id: driver._id,
                userType: "DRIVER",
                role: "DRIVER",
                email: driver.email,
                name: driver.name,
                status: driver.status,
                driverId: driver.driverId,
                assignedVendor: driver.assignedVendor,
                permissions: [],
                isSuperAdmin: false,
                driver,
            };
            req.accountRole = "DRIVER";
            return next();
        }

        const user = await User.findById(decoded.id)
            .select("-password -refreshToken")
            .populate("designation", "name permissions status")
            .populate("department", "name status");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User belonging to this token no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        if (user.status === "BLOCKED") {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Please contact support.",
                code: "ACCOUNT_BLOCKED",
            });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive. Please contact support.",
                code: "ACCOUNT_INACTIVE",
            });
        }

        const resolved = await resolvePermissionsForUser(user);
        const plain = user.toObject();
        req.user = {
            ...plain,
            id: user._id,
            userType: "ADMIN",
            role: "ADMIN",
            permissions: resolved.permissions,
            isSuperAdmin: resolved.isSuperAdmin,
        };
        req.accountRole = "ADMIN";
        next();
    } catch (error) {
        next(error);
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const currentRole = req.user.userType || req.accountRole;
        if (!roles.includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden — you do not have permission to access this resource",
                code: "FORBIDDEN",
            });
        }

        next();
    };
};

/** Require ANY of the listed micro permissions (super admin always passes). */
const requirePermission = (...keys) => {
    const required = keys.flat().filter(Boolean);
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        if (req.user.userType !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                code: "FORBIDDEN",
            });
        }
        if (req.user.isSuperAdmin) return next();
        if (!required.length) return next();
        if (userHasPermission(req.user.permissions, required)) return next();
        return res.status(403).json({
            success: false,
            message: "Forbidden — missing permission",
            code: "PERMISSION_DENIED",
            required,
        });
    };
};

/** Require ALL listed micro permissions. */
const requireAllPermissions = (...keys) => {
    const required = keys.flat().filter(Boolean);
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        if (req.user.isSuperAdmin) return next();
        if (userHasAllPermissions(req.user.permissions, required)) return next();
        return res.status(403).json({
            success: false,
            message: "Forbidden — missing permission",
            code: "PERMISSION_DENIED",
            required,
        });
    };
};

module.exports = {
    authenticate,
    authorize,
    requirePermission,
    requireAllPermissions,
};
