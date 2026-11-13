const Notification = require("../models/Notification");
const User = require("../models/User");
const Lead = require("../models/Lead");

const getAdminIds = async () => {
    const admins = await User.find({ userType: "ADMIN", status: { $ne: "BLOCKED" } })
        .select("_id")
        .lean();
    return admins.map((a) => a._id);
};

const notifyAdmins = async ({ type, title, message, link, meta = {}, dedupeKey = null, excludeUserId = null }) => {
    const adminIds = await getAdminIds();
    const targets = excludeUserId
        ? adminIds.filter((id) => String(id) !== String(excludeUserId))
        : adminIds;

    if (!targets.length) return [];

    const docs = targets.map((userId) => {
        const doc = {
            user: userId,
            type,
            title,
            message,
            link: link || "/dashboard/leads",
            meta,
            isRead: false,
        };
        if (dedupeKey) doc.dedupeKey = dedupeKey;
        return doc;
    });

    try {
        const created = await Notification.insertMany(docs, { ordered: false });
        return created;
    } catch (err) {
        // Ignore duplicate dedupeKey errors; return what we can
        if (err.code === 11000 || err.writeErrors) {
            return err.insertedDocs || [];
        }
        throw err;
    }
};

const notifyNewLead = async (lead) => {
    const name = lead.customerName || "Customer";
    const leadCode = lead.leadId || "";
    return notifyAdmins({
        type: "NEW_LEAD",
        title: "New lead received",
        message: `${name} (${leadCode}) — ${lead.mobileNumber || ""} · ${lead.leadSource || ""}`,
        link: `/dashboard/leads/${lead._id}`,
        meta: {
            leadMongoId: lead._id,
            leadId: leadCode,
            customerName: name,
            leadSource: lead.leadSource || "",
        },
    });
};

const notifyFollowUpScheduled = async (lead, followUp) => {
    const name = lead.customerName || "Customer";
    const dateStr = followUp.followUpDate
        ? new Date(followUp.followUpDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "";
    const timeStr = followUp.followUpTime || "";

    return notifyAdmins({
        type: "FOLLOW_UP_SCHEDULED",
        title: "Follow-up scheduled",
        message: `${name} (${lead.leadId}) — ${dateStr} ${timeStr}${followUp.reason ? ` · ${followUp.reason}` : ""}`,
        link: `/dashboard/leads/${lead._id}`,
        meta: {
            leadMongoId: lead._id,
            leadId: lead.leadId || "",
            customerName: name,
            followUpDate: dateStr,
            followUpTime: timeStr,
            reason: followUp.reason || "",
        },
    });
};

/**
 * Create FOLLOW_UP_DUE notifications for leads whose next follow-up is today or overdue.
 * Safe to call on every poll — uses dedupeKey per user/day/lead.
 */
const syncDueFollowUpNotifications = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayKey = today.toISOString().slice(0, 10);

    const leads = await Lead.find({
        nextFollowUpDate: { $ne: null, $lte: new Date() },
        status: { $nin: ["LOST", "CONFIRMED"] },
    })
        .select("leadId customerName mobileNumber nextFollowUpDate followUps status")
        .limit(100)
        .lean();

    for (const lead of leads) {
        const nextFu = [...(lead.followUps || [])]
            .filter((f) => f.followUpDate)
            .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
            .find((f) => {
                const d = new Date(f.followUpDate);
                d.setHours(0, 0, 0, 0);
                return d <= today;
            }) || null;

        const dateStr = lead.nextFollowUpDate
            ? new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            })
            : "";
        const timeStr = nextFu?.followUpTime || "";
        const reason = nextFu?.reason || "";
        const overdue = new Date(lead.nextFollowUpDate) < today;

        await notifyAdmins({
            type: "FOLLOW_UP_DUE",
            title: overdue ? "Follow-up overdue" : "Follow-up due today",
            message: `${lead.customerName} (${lead.leadId}) — ${dateStr}${timeStr ? ` ${timeStr}` : ""}${reason ? ` · ${reason}` : ""}`,
            link: `/dashboard/leads/${lead._id}`,
            meta: {
                leadMongoId: lead._id,
                leadId: lead.leadId || "",
                customerName: lead.customerName || "",
                followUpDate: dateStr,
                followUpTime: timeStr,
                reason,
            },
            dedupeKey: `FOLLOW_UP_DUE:${lead._id}:${dayKey}`,
        });
    }
};

module.exports = {
    notifyNewLead,
    notifyFollowUpScheduled,
    syncDueFollowUpNotifications,
    notifyAdmins,
};
