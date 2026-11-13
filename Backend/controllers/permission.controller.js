const mongoose = require("mongoose");
const Permission = require("../models/Permission");
const { PERMISSION_GROUPS } = require("../constants/permissions");

const toGroups = (rows) => {
    const map = new Map();
    for (const row of rows) {
        if (!map.has(row.groupKey)) {
            map.set(row.groupKey, {
                key: row.groupKey,
                label: row.groupLabel,
                permissions: [],
            });
        }
        map.get(row.groupKey).permissions.push({
            _id: row._id,
            key: row.key,
            label: row.label,
            description: row.description,
            status: row.status,
            sortOrder: row.sortOrder,
        });
    }
    return [...map.values()];
};

const listPermissions = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const search = String(req.query.search || "").trim();
        const status = String(req.query.status || "").trim();
        const groupKey = String(req.query.groupKey || "").trim();

        const filter = {};
        if (status && ["ACTIVE", "INACTIVE"].includes(status)) filter.status = status;
        if (groupKey) filter.groupKey = groupKey;
        if (search) {
            const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ key: re }, { label: re }, { groupLabel: re }, { description: re }];
        }

        const total = await Permission.countDocuments(filter);
        const data = await Permission.find(filter)
            .sort({ groupKey: 1, sortOrder: 1, key: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const groups = await Permission.aggregate([
            { $group: { _id: "$groupKey", label: { $first: "$groupLabel" }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        res.status(200).json({
            success: true,
            data,
            groups: groups.map((g) => ({ key: g._id, label: g.label, count: g.count })),
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

const getCatalog = async (req, res, next) => {
    try {
        let rows = await Permission.find({ status: "ACTIVE" })
            .sort({ groupKey: 1, sortOrder: 1, key: 1 })
            .lean();

        if (!rows.length) {
            await seedFromDefaults(req.user?._id);
            rows = await Permission.find({ status: "ACTIVE" })
                .sort({ groupKey: 1, sortOrder: 1, key: 1 })
                .lean();
        }

        res.status(200).json({
            success: true,
            data: {
                groups: toGroups(rows),
                keys: rows.map((r) => r.key),
            },
        });
    } catch (error) {
        next(error);
    }
};

const getPermissionById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid permission ID" });
        }
        const row = await Permission.findById(req.params.id).lean();
        if (!row) return res.status(404).json({ success: false, message: "Permission not found" });
        res.status(200).json({ success: true, data: row });
    } catch (error) {
        next(error);
    }
};

const createPermission = async (req, res, next) => {
    try {
        const key = String(req.body.key || "")
            .trim()
            .toLowerCase();
        const label = String(req.body.label || "").trim();
        const groupKey = String(req.body.groupKey || "")
            .trim()
            .toLowerCase();
        const groupLabel = String(req.body.groupLabel || req.body.groupKey || "").trim();
        const description = String(req.body.description || "").trim();
        const sortOrder = Number(req.body.sortOrder) || 0;

        if (!key || !label || !groupKey || !groupLabel) {
            return res.status(400).json({
                success: false,
                message: "key, label, groupKey, groupLabel are required",
            });
        }
        if (!/^[a-z0-9]+(\.[a-z0-9_]+)+$/.test(key)) {
            return res.status(400).json({
                success: false,
                message: "key must look like module.action (e.g. leads.edit)",
            });
        }

        const exists = await Permission.findOne({ key });
        if (exists) {
            return res.status(409).json({ success: false, message: "Permission key already exists" });
        }

        const row = await Permission.create({
            key,
            label,
            groupKey,
            groupLabel,
            description,
            sortOrder,
            status: req.body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            createdBy: req.user?._id || null,
        });

        res.status(201).json({ success: true, message: "Permission created", data: row });
    } catch (error) {
        next(error);
    }
};

const updatePermission = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid permission ID" });
        }
        const row = await Permission.findById(req.params.id);
        if (!row) return res.status(404).json({ success: false, message: "Permission not found" });

        if (req.body.label != null) row.label = String(req.body.label).trim();
        if (req.body.groupKey != null) row.groupKey = String(req.body.groupKey).trim().toLowerCase();
        if (req.body.groupLabel != null) row.groupLabel = String(req.body.groupLabel).trim();
        if (req.body.description != null) row.description = String(req.body.description).trim();
        if (req.body.sortOrder != null) row.sortOrder = Number(req.body.sortOrder) || 0;
        if (["ACTIVE", "INACTIVE"].includes(req.body.status)) row.status = req.body.status;
        // key is immutable once created (referenced on users)

        await row.save();
        res.status(200).json({ success: true, message: "Permission updated", data: row });
    } catch (error) {
        next(error);
    }
};

const deletePermission = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid permission ID" });
        }
        const row = await Permission.findByIdAndDelete(req.params.id);
        if (!row) return res.status(404).json({ success: false, message: "Permission not found" });
        res.status(200).json({ success: true, message: "Permission deleted", data: { key: row.key } });
    } catch (error) {
        next(error);
    }
};

const seedFromDefaults = async (userId = null) => {
    let sort = 0;
    let upserted = 0;
    for (const group of PERMISSION_GROUPS) {
        for (const perm of group.permissions) {
            sort += 1;
            const res = await Permission.updateOne(
                { key: perm.key },
                {
                    $setOnInsert: {
                        key: perm.key,
                        createdBy: userId || null,
                    },
                    $set: {
                        label: perm.label,
                        groupKey: group.key,
                        groupLabel: group.label,
                        description: perm.label,
                        status: "ACTIVE",
                        sortOrder: sort,
                    },
                },
                { upsert: true }
            );
            if (res.upsertedCount || res.modifiedCount) upserted += 1;
        }
    }
    // ensure permissions.manage exists
    await Permission.updateOne(
        { key: "permissions.manage" },
        {
            $setOnInsert: { key: "permissions.manage", createdBy: userId || null },
            $set: {
                label: "Manage permission catalog",
                groupKey: "org",
                groupLabel: "Organization",
                description: "Create / edit / delete permission definitions",
                status: "ACTIVE",
                sortOrder: 999,
            },
        },
        { upsert: true }
    );
    return upserted;
};

const seedPermissions = async (req, res, next) => {
    try {
        const upserted = await seedFromDefaults(req.user?._id);
        const total = await Permission.countDocuments();
        res.status(200).json({
            success: true,
            message: `Permission catalog synced (${total} total)`,
            data: { upserted, total },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listPermissions,
    getCatalog,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission,
    seedPermissions,
    seedFromDefaults,
};
