const Designation = require("../models/Designation");
const {
    ALL_PERMISSION_KEYS,
    sanitizePermissionList,
} = require("../constants/permissions");

/**
 * Option C: designation template + per-user grant/deny.
 * Main / unrestricted ADMIN always gets full access (super).
 * Only staff with designation or explicit overrides are limited.
 */
const resolvePermissionsForUser = async (user) => {
    if (!user) {
        return { permissions: [], isSuperAdmin: false, designationId: null };
    }

    const grant = sanitizePermissionList(user.permissionOverrides?.grant || []);
    const deny = sanitizePermissionList(user.permissionOverrides?.deny || []);
    const hasDesignation = Boolean(user.designation);
    const hasOverrides = grant.length > 0 || deny.length > 0;

    // Unrestricted admin = full power (existing owners + new registerAdmin)
    const shouldBeSuper =
        user.isSuperAdmin === true ||
        user.isSuperAdmin == null ||
        (!hasDesignation && !hasOverrides);

    if (shouldBeSuper) {
        if (user.isSuperAdmin !== true) {
            user.isSuperAdmin = true;
            try {
                // Only persist when this is a real mongoose doc
                if (typeof user.save === "function") {
                    await user.save();
                }
            } catch {
                // ignore
            }
        }
        let allKeys = [...ALL_PERMISSION_KEYS];
        try {
            const Permission = require("../models/Permission");
            const dbKeys = await Permission.find({ status: "ACTIVE" }).distinct("key");
            if (dbKeys?.length) {
                allKeys = [...new Set([...allKeys, ...dbKeys])];
            }
        } catch {
            // constants only
        }
        return {
            permissions: allKeys,
            isSuperAdmin: true,
            designationId: user.designation?._id || user.designation || null,
            base: [],
            grant: [],
            deny: [],
        };
    }

    let base = [];
    if (hasDesignation) {
        const desig =
            user.designation?.permissions != null
                ? user.designation
                : await Designation.findById(user.designation).select("permissions name").lean();
        base = sanitizePermissionList(desig?.permissions || []);
    }

    const set = new Set([...base, ...grant]);
    for (const d of deny) set.delete(d);

    return {
        permissions: [...set],
        isSuperAdmin: false,
        designationId: user.designation?._id || user.designation || null,
        base,
        grant,
        deny,
    };
};

const userHasPermission = (permissionList, required) => {
    if (!required) return true;
    const list = Array.isArray(permissionList) ? permissionList : [];
    if (Array.isArray(required)) {
        return required.some((k) => list.includes(k));
    }
    return list.includes(required);
};

const userHasAllPermissions = (permissionList, requiredKeys) => {
    const list = Array.isArray(permissionList) ? permissionList : [];
    return (requiredKeys || []).every((k) => list.includes(k));
};

module.exports = {
    resolvePermissionsForUser,
    userHasPermission,
    userHasAllPermissions,
};
