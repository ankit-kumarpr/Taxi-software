const Vendor = require("../models/Vendor");
const { sendTextEmail } = require("../utils/mailer");
const { wrapEmail, escapeHtml } = require("../utils/emailTemplates");
const { getPendingVendorDocuments } = require("../utils/vendorDocuments");
const { getOrCreateProfile } = require("../controllers/companyProfile.controller");

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000; // hourly sweep

let timer = null;
let running = false;

const buildPendingListHtml = (pending) => {
    if (!pending.length) return "<p>No documents pending.</p>";
    const items = pending
        .map(
            (d) =>
                `<li style="margin:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#334155;">${escapeHtml(d.label)}</li>`
        )
        .join("");
    return `<ul style="margin:8px 0 0;padding-left:20px;">${items}</ul>`;
};

const sendReminderForVendor = async (vendor, brand) => {
    const pending = getPendingVendorDocuments(vendor);
    if (!pending.length || !vendor.email) return false;

    const names = pending.map((d) => d.label).join(", ");
    await sendTextEmail({
        to: vendor.email,
        companyName: brand,
        subject: `Pending documents reminder — ${vendor.vendorId || vendor.companyName}`,
        text:
            `Hello ${vendor.contactPersonName || vendor.companyName},\n\n` +
            `Your vendor registration (${vendor.vendorId}) still has pending documents:\n` +
            pending.map((d) => `- ${d.label}`).join("\n") +
            `\n\nPlease upload these documents so we can verify your account.\n` +
            `This reminder is sent every 3 days until documents are complete.\n`,
        html: wrapEmail({
            companyName: brand,
            title: "Pending documents",
            greeting: `Hello <strong>${escapeHtml(vendor.contactPersonName || vendor.companyName)}</strong>,`,
            bodyHtml:
                `<p>Your vendor profile <strong>${escapeHtml(vendor.vendorId || "")}</strong> still has documents pending verification.</p>` +
                `<p style="margin:12px 0 4px;font-weight:700;color:#0B3A6E;">Please upload:</p>` +
                buildPendingListHtml(pending) +
                `<p style="margin-top:16px;color:#64748b;font-size:13px;">We send this reminder every 3 days until your documents are complete.</p>`,
            footerNote: `Missing: ${names}`,
        }),
    });

    vendor.documentReminderSentAt = new Date();
    vendor.documentReminderCount = Number(vendor.documentReminderCount || 0) + 1;
    await vendor.save();
    return true;
};

/**
 * Find vendors with at least one missing KYC doc and email if last reminder ≥ 3 days ago.
 */
const runVendorDocumentReminders = async () => {
    if (running) return { skipped: true };
    running = true;
    const summary = { checked: 0, emailed: 0, failed: 0, errors: [] };

    try {
        const profile = await getOrCreateProfile();
        const brand = profile.companyName || "True Way Taxi";
        const cutoff = new Date(Date.now() - THREE_DAYS_MS);

        // Remind on missing files (not only unverified — VERIFIED vendors can still lack docs)
        const vendors = await Vendor.find({
            status: "ACTIVE",
            email: { $exists: true, $ne: "" },
            $or: [
                { documentReminderSentAt: null },
                { documentReminderSentAt: { $lte: cutoff } },
            ],
        })
            .select(
                "vendorId companyName contactPersonName email documentVerificationStatus documentReminderSentAt documentReminderCount aadhaarDocument panDocument cancelledCheque companyRegistrationDocument gstCertificate"
            )
            .limit(500);

        summary.checked = vendors.length;

        for (const vendor of vendors) {
            const pending = getPendingVendorDocuments(vendor);
            if (!pending.length) continue;
            try {
                const sent = await sendReminderForVendor(vendor, brand);
                if (sent) summary.emailed += 1;
            } catch (err) {
                summary.failed += 1;
                summary.errors.push({
                    vendorId: vendor.vendorId,
                    message: err.message,
                });
                console.warn(
                    `[doc-reminder] ${vendor.vendorId}:`,
                    err.message
                );
            }
        }
    } catch (err) {
        console.error("[doc-reminder] job failed:", err.message);
        summary.errors.push({ message: err.message });
    } finally {
        running = false;
    }

    if (summary.emailed || summary.failed) {
        console.log(
            `[doc-reminder] emailed=${summary.emailed} failed=${summary.failed} checked=${summary.checked}`
        );
    }
    return summary;
};

const startVendorDocumentReminderJob = () => {
    if (timer) return;
    // First run shortly after boot, then hourly
    setTimeout(() => {
        runVendorDocumentReminders().catch((e) =>
            console.error("[doc-reminder] startup run failed:", e.message)
        );
    }, 20 * 1000);

    timer = setInterval(() => {
        runVendorDocumentReminders().catch((e) =>
            console.error("[doc-reminder] interval failed:", e.message)
        );
    }, CHECK_EVERY_MS);

    if (typeof timer.unref === "function") timer.unref();
    console.log("[doc-reminder] job scheduled (every 3 days per vendor, hourly sweep)");
};

module.exports = {
    startVendorDocumentReminderJob,
    runVendorDocumentReminders,
    THREE_DAYS_MS,
};
