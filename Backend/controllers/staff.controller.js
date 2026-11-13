const mongoose = require("mongoose");
const User = require("../models/User");
const Designation = require("../models/Designation");
const Department = require("../models/Department");
const {
    PERMISSION_GROUPS,
    ALL_PERMISSION_KEYS,
    sanitizePermissionList,
} = require("../constants/permissions");
const { resolvePermissionsForUser } = require("../utils/resolvePermissions");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");

const publicStaff = (user, resolved) => {
    const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.refreshToken;
    return {
        ...obj,
        permissions: resolved?.permissions || [],
        isSuperAdmin: Boolean(resolved?.isSuperAdmin ?? obj.isSuperAdmin),
        effective: {
            base: resolved?.base || [],
            grant: resolved?.grant || obj.permissionOverrides?.grant || [],
            deny: resolved?.deny || obj.permissionOverrides?.deny || [],
        },
    };
};

const parseJsonField = (value, fallback) => {
    if (value == null || value === "") return fallback;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const parseDocumentNames = (body) => {
    let names = body.documentNames;
    if (typeof names === "string") {
        try {
            const parsed = JSON.parse(names);
            if (Array.isArray(parsed)) names = parsed;
            else names = [names];
        } catch {
            names = [names];
        }
    }
    if (!Array.isArray(names)) names = names != null ? [names] : [];
    return names.map((n) => String(n || "").trim());
};

const buildDocsFromUpload = (req) => {
    const files = req.files?.documents || [];
    const names = parseDocumentNames(req.body);
    return files.map((file, idx) => {
        const meta = toDocumentMeta(file, "employees");
        return {
            name: names[idx] || meta.originalName || `Document ${idx + 1}`,
            ...meta,
        };
    });
};

const getPermissionCatalog = async (req, res, next) => {
    try {
        // Prefer DB catalog (Permission model); fallback to constants
        const { getCatalog } = require("./permission.controller");
        return getCatalog(req, res, next);
    } catch (error) {
        res.status(200).json({
            success: true,
            data: {
                groups: PERMISSION_GROUPS,
                keys: ALL_PERMISSION_KEYS,
            },
        });
    }
};

const listStaff = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const search = String(req.query.search || "").trim();
        const status = String(req.query.status || "").trim();
        const department = String(req.query.department || "").trim();
        const designation = String(req.query.designation || "").trim();
        const city = String(req.query.city || "").trim();

        const filter = { userType: "ADMIN", isSuperAdmin: { $ne: true } };
        // Also show non-super staff; optionally include all with ?includeSuper=1
        if (String(req.query.includeSuper || "") === "1") {
            delete filter.isSuperAdmin;
        }

        if (status && ["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) {
            filter.status = status;
        }
        if (department && mongoose.Types.ObjectId.isValid(department)) {
            filter.department = department;
        }
        if (designation && mongoose.Types.ObjectId.isValid(designation)) {
            filter.designation = designation;
        }
        if (city) {
            filter["address.city"] = new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        }
        if (search) {
            const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { name: re },
                { email: re },
                { phone: re },
                { "address.city": re },
                { "address.locality": re },
            ];
        }

        const total = await User.countDocuments(filter);
        const rows = await User.find(filter)
            .select("-password -refreshToken")
            .populate("department", "name")
            .populate("designation", "name permissions")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const data = [];
        for (const row of rows) {
            const resolved = await resolvePermissionsForUser(row);
            data.push(publicStaff(row, resolved));
        }

        res.status(200).json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

const getStaffById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const user = await User.findById(req.params.id)
            .select("-password -refreshToken")
            .populate("department", "name")
            .populate("designation", "name permissions");
        if (!user) return res.status(404).json({ success: false, message: "Employee not found" });
        const resolved = await resolvePermissionsForUser(user);
        res.status(200).json({ success: true, data: publicStaff(user, resolved) });
    } catch (error) {
        next(error);
    }
};

const createStaff = async (req, res, next) => {
    try {
        const body = req.body || {};
        const name = String(body.name || "").trim();
        const email = String(body.email || "").toLowerCase().trim();
        const phone = String(body.phone || "").trim();
        const password = String(body.password || "");
        const address = parseJsonField(body.address, body.address || {});
        const department = body.department || null;
        const designation = body.designation || null;
        const status = body.status;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "name, email, phone, password are required",
            });
        }

        if (!address?.city || !address?.state || !address?.pincode || !address?.locality || !address?.street) {
            return res.status(400).json({
                success: false,
                message: "Address required: street, locality, city, state, pincode",
            });
        }

        if (department && mongoose.Types.ObjectId.isValid(department)) {
            const dept = await Department.findById(department);
            if (!dept) return res.status(400).json({ success: false, message: "Department not found" });
        }
        if (designation && mongoose.Types.ObjectId.isValid(designation)) {
            const desig = await Designation.findById(designation);
            if (!desig) return res.status(400).json({ success: false, message: "Designation not found" });
        }

        const exists = await User.findOne({
            $or: [{ email }, { phone }],
        });
        if (exists) {
            return res.status(409).json({ success: false, message: "Email or phone already exists" });
        }

        const documents = buildDocsFromUpload(req);
        const grant = sanitizePermissionList(parseJsonField(body.grant, body.grant || []));
        const deny = sanitizePermissionList(parseJsonField(body.deny, body.deny || []));

        const user = await User.create({
            name,
            email,
            phone,
            password,
            address: {
                street: String(address.street).trim(),
                locality: String(address.locality).trim(),
                city: String(address.city).trim(),
                state: String(address.state).trim(),
                pincode: String(address.pincode).trim(),
                landmark: address.landmark ? String(address.landmark).trim() : "",
            },
            userType: "ADMIN",
            status: ["ACTIVE", "INACTIVE", "BLOCKED"].includes(status) ? status : "ACTIVE",
            department: department || null,
            designation: designation || null,
            isSuperAdmin: false,
            permissionOverrides: { grant, deny },
            documents,
            createdBy: req.user._id,
        });

        const populated = await User.findById(user._id)
            .select("-password -refreshToken")
            .populate("department", "name")
            .populate("designation", "name permissions");
        const resolved = await resolvePermissionsForUser(populated);

        res.status(201).json({
            success: true,
            message: "Employee created",
            data: publicStaff(populated, resolved),
        });
    } catch (error) {
        next(error);
    }
};

const updateStaff = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "Employee not found" });

        if (user.isSuperAdmin && String(user._id) !== String(req.user._id) && !req.user.isSuperAdmin) {
            return res.status(403).json({ success: false, message: "Cannot edit a super admin" });
        }

        const body = req.body || {};
        if (body.name) user.name = String(body.name).trim();
        if (body.phone) user.phone = String(body.phone).trim();
        if (body.password) user.password = String(body.password);

        const address = parseJsonField(body.address, null);
        if (address) {
            user.address = {
                city: address.city ?? user.address.city,
                state: address.state ?? user.address.state,
                pincode: address.pincode ?? user.address.pincode,
                locality: address.locality ?? user.address.locality,
                street: address.street ?? user.address.street,
                landmark: address.landmark ?? user.address.landmark ?? "",
            };
        }

        if (body.department !== undefined) user.department = body.department || null;
        if (body.designation !== undefined) user.designation = body.designation || null;

        if (body.status && ["ACTIVE", "INACTIVE", "BLOCKED"].includes(body.status)) {
            if (String(user._id) === String(req.user._id) && body.status !== "ACTIVE") {
                return res.status(400).json({ success: false, message: "Cannot deactivate yourself" });
            }
            user.status = body.status;
        }

        // Remove selected existing docs by id
        const removeIds = parseJsonField(body.removeDocumentIds, []);
        if (Array.isArray(removeIds) && removeIds.length) {
            const keep = [];
            for (const doc of user.documents || []) {
                if (removeIds.includes(String(doc._id))) {
                    removeLocalFile(doc);
                } else {
                    keep.push(doc);
                }
            }
            user.documents = keep;
        }

        const newDocs = buildDocsFromUpload(req);
        if (newDocs.length) {
            user.documents = [...(user.documents || []), ...newDocs];
        }

        await user.save();
        const populated = await User.findById(user._id)
            .select("-password -refreshToken")
            .populate("department", "name")
            .populate("designation", "name permissions");
        const resolved = await resolvePermissionsForUser(populated);

        res.status(200).json({
            success: true,
            message: "Employee updated",
            data: publicStaff(populated, resolved),
        });
    } catch (error) {
        next(error);
    }
};

const deleteStaff = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "Employee not found" });

        if (String(user._id) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: "Cannot delete yourself" });
        }
        if (user.isSuperAdmin) {
            return res.status(403).json({ success: false, message: "Cannot delete a super admin" });
        }

        for (const doc of user.documents || []) {
            removeLocalFile(doc);
        }
        await user.deleteOne();

        res.status(200).json({ success: true, message: "Employee deleted" });
    } catch (error) {
        next(error);
    }
};

const setStaffPermissions = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "Employee not found" });

        if (user.isSuperAdmin) {
            return res.status(400).json({
                success: false,
                message: "Super admin already has all permissions",
            });
        }

        const grant = sanitizePermissionList(req.body.grant);
        const deny = sanitizePermissionList(req.body.deny);
        const grantClean = grant.filter((g) => !deny.includes(g));

        user.permissionOverrides = { grant: grantClean, deny };
        await user.save();

        const populated = await User.findById(user._id)
            .select("-password -refreshToken")
            .populate("department", "name")
            .populate("designation", "name permissions");
        const resolved = await resolvePermissionsForUser(populated);

        res.status(200).json({
            success: true,
            message: "Permissions assigned",
            data: publicStaff(populated, resolved),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPermissionCatalog,
    listStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    setStaffPermissions,
};
