const crypto = require("crypto");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Driver = require("../models/Driver");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/tokenUtils");
const { resolvePermissionsForUser } = require("../utils/resolvePermissions");

const timingSafeCompare = (a, b) => {
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
};

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const modelForRole = (role) => {
    if (role === "VENDOR") return Vendor;
    if (role === "DRIVER") return Driver;
    return User;
};

const buildAdminPayload = async (userDoc) => {
    const user = await User.findById(userDoc._id)
        .select("-password -refreshToken")
        .populate("designation", "name permissions")
        .populate("department", "name");
    if (!user) {
        return {
            id: userDoc._id,
            userType: "ADMIN",
            name: userDoc.name,
            email: userDoc.email,
            permissions: [],
            isSuperAdmin: false,
        };
    }
    const resolved = await resolvePermissionsForUser(user);
    return {
        id: user._id,
        _id: user._id,
        userType: "ADMIN",
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        address: user.address || null,
        department: user.department || null,
        designation: user.designation || null,
        isSuperAdmin: resolved.isSuperAdmin,
        permissions: resolved.permissions,
        permissionOverrides: user.permissionOverrides || { grant: [], deny: [] },
        createdAt: user.createdAt,
    };
};

const buildVendorPayload = (vendor) => ({
    id: vendor._id,
    userType: "VENDOR",
    vendorId: vendor.vendorId,
    name: vendor.companyName,
    companyName: vendor.companyName,
    email: vendor.email,
    phone: vendor.mobileNumber,
    status: vendor.status,
    documentVerificationStatus: vendor.documentVerificationStatus || "PENDING",
    vendorType: vendor.vendorType,
    businessModel: vendor.businessModel || null,
    companySharePercent: vendor.companySharePercent ?? null,
});

const buildDriverPayload = (driver) => ({
    id: driver._id,
    userType: "DRIVER",
    driverId: driver.driverId,
    name: driver.name,
    email: driver.email,
    phone: driver.mobileNumber,
    status: driver.status,
    documentVerificationStatus: driver.documentVerificationStatus || "PENDING",
    assignedVendor: driver.assignedVendor,
});

const registerAdmin = async (req, res, next) => {
    try {
        const { admin_secret, name, email, phone, password, address } = req.body;

        if (!process.env.ADMIN_CREATION_SECRET) {
            return res.status(500).json({ success: false, message: "Admin creation is not configured" });
        }

        if (!admin_secret || !timingSafeCompare(admin_secret, process.env.ADMIN_CREATION_SECRET)) {
            return res.status(403).json({ success: false, message: "Invalid admin creation secret" });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User with email or phone already exists" });
        }

        const existingVendor = await Vendor.findOne({ email: String(email).toLowerCase().trim() });
        if (existingVendor) {
            return res.status(409).json({ success: false, message: "Email already used by a vendor" });
        }

        const newAdmin = await User.create({
            name,
            email,
            phone,
            password,
            address,
            userType: "ADMIN",
            isSuperAdmin: true,
        });

        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email },
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const raw = String(email || "").trim();
        const normalizedEmail = raw.toLowerCase();

        const admin = await User.findOne({ email: normalizedEmail });
        if (admin) {
            if (admin.status === "BLOCKED") {
                return res.status(403).json({ success: false, message: "Account is blocked. Contact support." });
            }
            if (admin.status === "INACTIVE") {
                return res.status(403).json({ success: false, message: "Account is not active. Contact support." });
            }

            const isMatch = await admin.matchPassword(password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Invalid email or password" });
            }

            const accessToken = generateAccessToken(admin._id, "ADMIN");
            const refresh = generateRefreshToken(admin._id, "ADMIN");
            admin.refreshToken = refresh;
            await admin.save();

            res.cookie("refreshToken", refresh, cookieOptions);
            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: { accessToken, user: await buildAdminPayload(admin) },
            });
        }

        const vendor = await Vendor.findOne({ email: normalizedEmail }).select("+password");
        if (vendor) {
            if (vendor.status === "INACTIVE") {
                return res.status(403).json({
                    success: false,
                    message: "Your vendor account is inactive. Contact admin.",
                    code: "ACCOUNT_INACTIVE",
                });
            }

            const vendorMatch = await vendor.matchPassword(password);
            if (!vendorMatch) {
                return res.status(401).json({ success: false, message: "Invalid email or password" });
            }

            const verifyStatus = vendor.documentVerificationStatus || "PENDING";
            if (verifyStatus === "PENDING") {
                return res.status(403).json({
                    success: false,
                    message: "Your account is pending admin verification. Please wait until an admin verifies you.",
                    code: "VENDOR_PENDING_VERIFICATION",
                });
            }
            if (verifyStatus === "REJECTED") {
                return res.status(403).json({
                    success: false,
                    message: "Your account verification was rejected. Please contact admin.",
                    code: "VENDOR_REJECTED",
                });
            }

            const accessToken = generateAccessToken(vendor._id, "VENDOR");
            const refresh = generateRefreshToken(vendor._id, "VENDOR");
            vendor.refreshToken = refresh;
            await vendor.save();
            await vendor.populate("vendorType", "name status");

            res.cookie("refreshToken", refresh, cookieOptions);
            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: { accessToken, user: buildVendorPayload(vendor) },
            });
        }

        // Driver: login by email or mobile
        const driver = await Driver.findOne({
            $or: [
                { email: normalizedEmail },
                { mobileNumber: raw },
            ],
        }).select("+password");

        if (!driver) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        if (driver.status === "INACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Your driver account is inactive. Contact admin/vendor.",
                code: "ACCOUNT_INACTIVE",
            });
        }

        if ((driver.documentVerificationStatus || "PENDING") !== "VERIFIED") {
            const rejected = driver.documentVerificationStatus === "REJECTED";
            const reason = String(driver.documentRejectionReason || "").trim();
            return res.status(403).json({
                success: false,
                message: rejected
                    ? reason
                        ? `KYC rejected: ${reason}`
                        : "KYC rejected. Contact admin."
                    : "KYC is pending admin verification. Login is blocked until verified.",
                code: "DRIVER_NOT_VERIFIED",
                rejectionReason: rejected ? reason || null : null,
            });
        }

        const driverMatch = await driver.matchPassword(password);
        if (!driverMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const accessToken = generateAccessToken(driver._id, "DRIVER");
        const refresh = generateRefreshToken(driver._id, "DRIVER");
        driver.refreshToken = refresh;
        await driver.save();
        await driver.populate("assignedVendor", "vendorId companyName");

        res.cookie("refreshToken", refresh, cookieOptions);
        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: { accessToken, user: buildDriverPayload(driver) },
        });
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ success: false, message: "No refresh token provided" });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token expired — please login again",
                    code: "REFRESH_TOKEN_EXPIRED",
                });
            }
            return res.status(401).json({ success: false, message: "Invalid refresh token" });
        }

        const role = decoded.role || "ADMIN";
        const Model = modelForRole(role);
        const account = await Model.findById(decoded.id).select("+refreshToken");

        if (!account || account.refreshToken !== token) {
            if (account) {
                account.refreshToken = null;
                await account.save();
            }
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token — please login again",
                code: "TOKEN_REUSE_DETECTED",
            });
        }

        if (account.status === "BLOCKED" || account.status === "INACTIVE") {
            account.refreshToken = null;
            await account.save();
            res.clearCookie("refreshToken", cookieOptions);
            return res.status(403).json({
                success: false,
                message: "Account is not allowed to refresh token",
            });
        }

        if (role === "VENDOR" && account.documentVerificationStatus !== "VERIFIED") {
            account.refreshToken = null;
            await account.save();
            res.clearCookie("refreshToken", cookieOptions);
            return res.status(403).json({
                success: false,
                message: "Vendor verification is no longer valid. Please contact admin.",
                code: "VENDOR_NOT_VERIFIED",
            });
        }

        if (
            role === "DRIVER" &&
            (account.documentVerificationStatus || "PENDING") !== "VERIFIED"
        ) {
            account.refreshToken = null;
            await account.save();
            res.clearCookie("refreshToken", cookieOptions);
            return res.status(403).json({
                success: false,
                message: "Driver documents are not verified. Please contact admin.",
                code: "DRIVER_NOT_VERIFIED",
            });
        }

        const newAccessToken = generateAccessToken(account._id, role);
        const newRefreshToken = generateRefreshToken(account._id, role);

        account.refreshToken = newRefreshToken;
        await account.save();

        res.cookie("refreshToken", newRefreshToken, cookieOptions);

        res.status(200).json({
            success: true,
            message: "Token refreshed",
            data: { accessToken: newAccessToken },
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const role = req.accountRole || req.user.userType;
        const Model = modelForRole(role);
        await Model.findByIdAndUpdate(req.user._id, { refreshToken: null });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        });

        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        const role = req.accountRole || req.user.userType;

        if (role === "VENDOR") {
            const vendor = await Vendor.findById(req.user._id)
                .select("-password -refreshToken")
                .populate("vendorType", "name status");

            if (!vendor) {
                return res.status(404).json({ success: false, message: "Vendor not found" });
            }

            return res.status(200).json({
                success: true,
                data: {
                    ...vendor.toObject(),
                    userType: "VENDOR",
                    name: vendor.companyName,
                },
            });
        }

        if (role === "DRIVER") {
            const driver = await Driver.findById(req.user._id)
                .select("-password -refreshToken")
                .populate("assignedVendor", "vendorId companyName");

            if (!driver) {
                return res.status(404).json({ success: false, message: "Driver not found" });
            }

            return res.status(200).json({
                success: true,
                data: {
                    ...driver.toObject(),
                    userType: "DRIVER",
                },
            });
        }

        const user = await User.findById(req.user._id)
            .select("-password -refreshToken")
            .populate("designation", "name permissions")
            .populate("department", "name");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, data: await buildAdminPayload(user) });
    } catch (error) {
        next(error);
    }
};

const pick = (obj, keys) => {
    const out = {};
    for (const key of keys) {
        if (obj[key] !== undefined) out[key] = obj[key];
    }
    return out;
};

const applyPasswordChange = async (doc, currentPassword, newPassword) => {
    if (!newPassword) return null;
    const next = String(newPassword).trim();
    if (next.length < 6) {
        return { status: 400, message: "New password must be at least 6 characters" };
    }
    if (!currentPassword) {
        return { status: 400, message: "Current password is required to set a new password" };
    }
    const ok = await doc.matchPassword(String(currentPassword));
    if (!ok) {
        return { status: 400, message: "Current password is incorrect" };
    }
    doc.password = next;
    return null;
};

const updateMyProfile = async (req, res, next) => {
    try {
        const role = req.accountRole || req.user.userType;
        const body = req.body || {};
        const currentPassword = body.currentPassword;
        const newPassword = body.newPassword;

        if (role === "VENDOR") {
            const vendor = await Vendor.findById(req.user._id).select("+password");
            if (!vendor) {
                return res.status(404).json({ success: false, message: "Vendor not found" });
            }

            const fields = pick(body, [
                "companyName",
                "contactPersonName",
                "ownerName",
                "mobileNumber",
                "alternateContactNumber",
                "email",
                "addressLine1",
                "addressLine2",
                "city",
                "state",
                "pinCode",
                "country",
                "emergencyContactName",
                "emergencyContactRelationship",
                "emergencyContactNumber",
                "bankAccountHolderName",
                "bankName",
                "bankAccountNumber",
                "ifscCode",
            ]);

            if (fields.email) {
                fields.email = String(fields.email).toLowerCase().trim();
                const taken = await Vendor.findOne({
                    email: fields.email,
                    _id: { $ne: vendor._id },
                });
                if (taken) {
                    return res.status(409).json({ success: false, message: "Email already in use" });
                }
            }
            if (fields.mobileNumber) {
                fields.mobileNumber = String(fields.mobileNumber).trim();
            }
            if (fields.companyName) {
                fields.companyName = String(fields.companyName).trim();
                if (!fields.companyName) {
                    return res.status(400).json({ success: false, message: "Company name is required" });
                }
            }

            Object.assign(vendor, fields);

            const pwdErr = await applyPasswordChange(vendor, currentPassword, newPassword);
            if (pwdErr) {
                return res.status(pwdErr.status).json({ success: false, message: pwdErr.message });
            }

            await vendor.save();
            const fresh = await Vendor.findById(vendor._id)
                .select("-password -refreshToken")
                .populate("vendorType", "name status");

            return res.status(200).json({
                success: true,
                message: "Profile updated",
                data: {
                    ...fresh.toObject(),
                    userType: "VENDOR",
                    name: fresh.companyName,
                },
            });
        }

        if (role === "DRIVER") {
            const driver = await Driver.findById(req.user._id).select("+password");
            if (!driver) {
                return res.status(404).json({ success: false, message: "Driver not found" });
            }

            const fields = pick(body, ["name", "mobileNumber", "email", "address"]);
            if (fields.name) {
                fields.name = String(fields.name).trim();
                if (!fields.name) {
                    return res.status(400).json({ success: false, message: "Name is required" });
                }
            }
            if (fields.mobileNumber) {
                fields.mobileNumber = String(fields.mobileNumber).trim();
                const taken = await Driver.findOne({
                    mobileNumber: fields.mobileNumber,
                    _id: { $ne: driver._id },
                });
                if (taken) {
                    return res.status(409).json({ success: false, message: "Mobile number already in use" });
                }
            }
            if (fields.email !== undefined) {
                const email = fields.email ? String(fields.email).toLowerCase().trim() : null;
                if (email) {
                    const taken = await Driver.findOne({ email, _id: { $ne: driver._id } });
                    if (taken) {
                        return res.status(409).json({ success: false, message: "Email already in use" });
                    }
                }
                fields.email = email;
            }
            if (fields.address !== undefined) {
                fields.address = String(fields.address || "").trim();
            }

            Object.assign(driver, fields);

            const pwdErr = await applyPasswordChange(driver, currentPassword, newPassword);
            if (pwdErr) {
                return res.status(pwdErr.status).json({ success: false, message: pwdErr.message });
            }

            await driver.save();
            const fresh = await Driver.findById(driver._id)
                .select("-password -refreshToken")
                .populate("assignedVendor", "vendorId companyName");

            return res.status(200).json({
                success: true,
                message: "Profile updated",
                data: {
                    ...fresh.toObject(),
                    userType: "DRIVER",
                },
            });
        }

        // ADMIN staff / super admin
        const user = await User.findById(req.user._id).select("+password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (body.name !== undefined) {
            const name = String(body.name || "").trim();
            if (!name) {
                return res.status(400).json({ success: false, message: "Name is required" });
            }
            user.name = name;
        }
        if (body.phone !== undefined) {
            const phone = String(body.phone || "").trim();
            if (!phone) {
                return res.status(400).json({ success: false, message: "Phone is required" });
            }
            const taken = await User.findOne({ phone, _id: { $ne: user._id } });
            if (taken) {
                return res.status(409).json({ success: false, message: "Phone already in use" });
            }
            user.phone = phone;
        }
        if (body.email !== undefined) {
            const email = String(body.email || "").toLowerCase().trim();
            if (!email) {
                return res.status(400).json({ success: false, message: "Email is required" });
            }
            const taken = await User.findOne({ email, _id: { $ne: user._id } });
            if (taken) {
                return res.status(409).json({ success: false, message: "Email already in use" });
            }
            user.email = email;
        }
        if (body.address && typeof body.address === "object") {
            const a = body.address;
            user.address = {
                city: String(a.city || user.address?.city || "").trim(),
                state: String(a.state || user.address?.state || "").trim(),
                pincode: String(a.pincode || user.address?.pincode || "").trim(),
                locality: String(a.locality || user.address?.locality || "").trim(),
                street: String(a.street || user.address?.street || "").trim(),
                landmark: String(a.landmark || user.address?.landmark || "").trim(),
            };
            if (!user.address.city || !user.address.state || !user.address.pincode || !user.address.locality || !user.address.street) {
                return res.status(400).json({
                    success: false,
                    message: "Address city, state, pincode, locality and street are required",
                });
            }
        }

        const pwdErr = await applyPasswordChange(user, currentPassword, newPassword);
        if (pwdErr) {
            return res.status(pwdErr.status).json({ success: false, message: pwdErr.message });
        }

        await user.save();
        return res.status(200).json({
            success: true,
            message: "Profile updated",
            data: await buildAdminPayload(user),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { registerAdmin, login, refreshToken, logout, getMe, updateMyProfile };
