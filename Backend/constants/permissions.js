/**
 * Micro-task permission catalog.
 * Keys are stable API/UI identifiers. Groups drive the admin checkbox UI.
 */
const PERMISSION_GROUPS = [
    {
        key: "org",
        label: "Organization",
        permissions: [
            { key: "departments.view", label: "View departments" },
            { key: "departments.create", label: "Create department" },
            { key: "departments.edit", label: "Edit department" },
            { key: "departments.status", label: "Change department status" },
            { key: "departments.delete", label: "Delete department" },
            { key: "designations.view", label: "View designations" },
            { key: "designations.create", label: "Create designation" },
            { key: "designations.edit", label: "Edit designation" },
            { key: "designations.status", label: "Change designation status" },
            { key: "designations.delete", label: "Delete designation" },
            { key: "designations.permissions", label: "Set designation permissions" },
            { key: "company.view", label: "View company profile" },
            { key: "company.edit", label: "Edit company profile" },
            { key: "staff.view", label: "View employees" },
            { key: "staff.create", label: "Create employee" },
            { key: "staff.edit", label: "Edit employee" },
            { key: "staff.delete", label: "Delete employee" },
            { key: "staff.permissions", label: "Assign employee permissions" },
            { key: "staff.status", label: "Change employee status" },
            { key: "permissions.manage", label: "Manage permission catalog" },
        ],
    },
    {
        key: "leads",
        label: "Leads",
        permissions: [
            { key: "leads.view", label: "View leads" },
            { key: "leads.create", label: "Create lead" },
            { key: "leads.edit", label: "Edit lead" },
            { key: "leads.delete", label: "Delete lead" },
            { key: "leads.status", label: "Change lead status" },
            { key: "leads.confirm", label: "Confirm lead / advance" },
            { key: "leads.cancel", label: "Cancel booking (before pickup)" },
            { key: "leads.followups", label: "Manage follow-ups" },
            { key: "leads.assign_vendor", label: "Assign / reassign vendor" },
            { key: "leads.assign_driver", label: "Assign / reassign driver & car" },
            { key: "leads.open_bid", label: "Open bid round" },
            { key: "leads.accept_bid", label: "Accept vendor bid" },
            { key: "leads.cancel_bid", label: "Cancel bid round" },
        ],
    },
    {
        key: "quotations",
        label: "Quotations",
        permissions: [
            { key: "quotations.view", label: "View quotations" },
            { key: "quotations.create", label: "Create quotation" },
            { key: "quotations.edit", label: "Edit quotation" },
            { key: "quotations.send", label: "Send quotation" },
        ],
    },
    {
        key: "bids",
        label: "Live Bids",
        permissions: [
            { key: "bids.view", label: "View live bids list" },
            { key: "bids.accept", label: "Accept bid from list" },
            { key: "bids.cancel", label: "Cancel bid from list" },
        ],
    },
    {
        key: "vendors",
        label: "Vendors",
        permissions: [
            { key: "vendor_types.view", label: "View vendor types" },
            { key: "vendor_types.create", label: "Create vendor type" },
            { key: "vendor_types.edit", label: "Edit vendor type" },
            { key: "vendor_types.delete", label: "Delete vendor type" },
            { key: "vendors.view", label: "View vendors" },
            { key: "vendors.create", label: "Create vendor" },
            { key: "vendors.edit", label: "Edit vendor" },
            { key: "vendors.delete", label: "Delete vendor" },
            { key: "vendors.status", label: "Change vendor status" },
            { key: "vendors.verify", label: "Verify / reject vendor docs" },
            { key: "vendors.business_model", label: "Set FIXED / BID model" },
            { key: "vendors.wallet", label: "View / manage vendor wallet" },
        ],
    },
    {
        key: "fleet",
        label: "Fleet",
        permissions: [
            { key: "car_types.view", label: "View car types" },
            { key: "car_types.manage", label: "Create / edit car types" },
            { key: "trip_types.view", label: "View trip types" },
            { key: "trip_types.manage", label: "Create / edit trip types" },
            { key: "vehicles.view", label: "View vehicles" },
            { key: "vehicles.create", label: "Create vehicle" },
            { key: "vehicles.edit", label: "Edit vehicle" },
            { key: "vehicles.delete", label: "Delete vehicle" },
            { key: "drivers.view", label: "View drivers" },
            { key: "drivers.create", label: "Create driver" },
            { key: "drivers.edit", label: "Edit driver" },
            { key: "drivers.delete", label: "Delete driver" },
        ],
    },
    {
        key: "accounts",
        label: "Accounts / Finance",
        permissions: [
            { key: "accounts.view", label: "View accounts overview" },
            { key: "accounts.trips", label: "View trip ledger" },
            { key: "accounts.payments", label: "View payments" },
            { key: "accounts.quotations", label: "View quotation finance" },
            { key: "accounts.payouts", label: "View vendor payouts" },
        ],
    },
    {
        key: "website",
        label: "Website",
        permissions: [
            { key: "blogs.view", label: "View blogs" },
            { key: "blogs.create", label: "Create blog" },
            { key: "blogs.edit", label: "Edit blog" },
            { key: "blogs.status", label: "Change blog status" },
            { key: "blogs.delete", label: "Delete blog" },
            { key: "blogs.manage", label: "Full blog management" },
            { key: "services.view", label: "View website services" },
            { key: "services.create", label: "Create website service" },
            { key: "services.edit", label: "Edit website service" },
            { key: "services.status", label: "Change website service status" },
            { key: "services.delete", label: "Delete website service" },
            { key: "services.manage", label: "Full website service management" },
            { key: "packages.view", label: "View website packages" },
            { key: "packages.create", label: "Create website package" },
            { key: "packages.edit", label: "Edit website package" },
            { key: "packages.status", label: "Change website package status" },
            { key: "packages.delete", label: "Delete website package" },
            { key: "packages.manage", label: "Full website package management" },
        ],
    },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

const PERMISSION_SET = new Set(ALL_PERMISSION_KEYS);

const isValidPermission = (key) => PERMISSION_SET.has(String(key || ""));

const KEY_SHAPE = /^[a-z0-9]+(\.[a-z0-9_]+)+$/;

const sanitizePermissionList = (list) => {
    if (!Array.isArray(list)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of list) {
        const key = String(raw || "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        // Allow seeded catalog keys OR newly created Permission-model keys (module.action)
        if (!PERMISSION_SET.has(key) && !KEY_SHAPE.test(key)) continue;
        seen.add(key);
        out.push(key);
    }
    return out;
};

module.exports = {
    PERMISSION_GROUPS,
    ALL_PERMISSION_KEYS,
    PERMISSION_SET,
    isValidPermission,
    sanitizePermissionList,
};
