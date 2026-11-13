const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Quotation = require("../models/Quotation");
const Lead = require("../models/Lead");
const { generateQuotationId } = require("../utils/generateQuotationId");
const { generateQuotationPdf } = require("../utils/quotationPdf");
const { sendQuotationEmail } = require("../utils/mailer");
const {
    wrapEmail,
    detailRows,
    highlightBox,
    money,
    escapeHtml,
} = require("../utils/emailTemplates");
const { getOrCreateProfile } = require("./companyProfile.controller");

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Trip started / completed / cancelled — quotation create & edit locked */
const QUOTATION_LOCKED_STATUSES = new Set([
    "TRIP_STARTED",
    "PAYMENT_PENDING",
    "COMPLETED",
    "CANCELLED",
    "LOST",
]);

const assertLeadAllowsQuotationEdit = (lead) => {
    const status = String(lead?.status || "").toUpperCase();
    if (QUOTATION_LOCKED_STATUSES.has(status)) {
        const err = new Error(
            "Quotation cannot be created or edited after trip has started. Use Repeat trip for a new lead."
        );
        err.status = 400;
        throw err;
    }
};

const calcAmounts = (tripAmount, gstPercent) => {
    const amount = round2(tripAmount);
    const gst = round2(gstPercent);
    const gstAmount = round2((amount * gst) / 100);
    const grandTotal = round2(amount + gstAmount);
    return { tripAmount: amount, gstPercent: gst, gstAmount, grandTotal };
};

const snapshotCompany = (profile) => ({
    companyName: profile.companyName || "",
    addressLine1: profile.addressLine1 || "",
    addressLine2: profile.addressLine2 || "",
    city: profile.city || "",
    state: profile.state || "",
    pinCode: profile.pinCode || "",
    landmark: profile.landmark || "",
    gstin: profile.gstin || "",
    gstPercent: profile.gstPercent ?? 0,
    quotationPhone: profile.quotationPhone || "",
    quotationEmail: profile.quotationEmail || "",
    logoUrl: profile.logo?.url || null,
    quotationHeaderImageUrl: profile.quotationHeaderImage?.url || null,
    bankName: profile.bankName || "",
    accountNumber: profile.accountNumber || "",
    ifsc: profile.ifsc || "",
    accountHolderName: profile.accountHolderName || "",
    upiIds: profile.upiIds || "",
    paymentQrImageUrl: profile.paymentQrImage?.url || null,
    paymentWarningText: profile.paymentWarningText || "",
    termsAndConditions: profile.termsAndConditions || "",
});

const removeOldPdf = (pdfUrl) => {
    if (!pdfUrl) return;
    const abs = path.join(__dirname, "..", String(pdfUrl).replace(/^\//, ""));
    fs.promises.unlink(abs).catch(() => {});
};

const populateQuotation = (query) =>
    query
        .populate("lead", "leadId customerName mobileNumber email status")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

const buildShareLinks = (quotation, overrides = {}) => {
    const phone = String(overrides.whatsappNumber || quotation.mobileNumber || "")
        .replace(/\D/g, "");
    const email = String(overrides.email || quotation.email || "").trim();
    const total = round2(quotation.grandTotal).toLocaleString("en-IN");
    const company = quotation.company?.companyName || "True Way Taxi";
    const text =
        `Hello ${quotation.customerName},\n\n` +
        `Please find your trip quotation from ${company}.\n` +
        `Quotation No: ${quotation.quotationId}\n` +
        `Trip: ${quotation.pickupLocation} → ${quotation.dropLocation}\n` +
        `Amount: Rs ${total} (incl. GST)\n\n` +
        `PDF: ${overrides.pdfAbsoluteUrl || quotation.pdfUrl || ""}\n\nThank you.`;

    const whatsappUrl = phone
        ? `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}?text=${encodeURIComponent(text)}`
        : null;

    const mailtoUrl = email
        ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
              `Quotation ${quotation.quotationId} — ${company}`
          )}&body=${encodeURIComponent(text)}`
        : null;

    return { whatsappUrl, mailtoUrl, shareText: text };
};

const getPrefillFromLead = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }

        const lead = await Lead.findById(leadId)
            .populate("tripType", "name durationType")
            .populate("cabType", "name");
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        assertLeadAllowsQuotationEdit(lead);

        const profile = await getOrCreateProfile();
        const existing = await Quotation.find({ lead: lead._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("quotationId status tripAmount grandTotal createdAt pdfUrl");

        res.status(200).json({
            success: true,
            data: {
                lead: {
                    _id: lead._id,
                    leadId: lead.leadId,
                    customerName: lead.customerName,
                    mobileNumber: lead.mobileNumber,
                    email: lead.email || "",
                    pickupLocation: lead.pickupLocation,
                    dropLocation: lead.dropLocation,
                    travelDate: lead.travelDate,
                    endDate: lead.endDate || null,
                    pickupTime: lead.pickupTime,
                    tripTypeName: lead.tripType?.name || "",
                    tripDurationType: lead.tripType?.durationType || "SINGLE_DAY",
                    cabTypeName: lead.cabType?.name || "",
                    status: lead.status,
                },
                company: snapshotCompany(profile),
                defaultGstPercent: profile.gstPercent ?? 5,
                recentQuotations: existing,
            },
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const createQuotation = async (req, res, next) => {
    try {
        const {
            leadId,
            customerName,
            mobileNumber,
            email,
            pickupLocation,
            dropLocation,
            travelDate,
            endDate,
            pickupTime,
            tripTypeName,
            cabTypeName,
            tripAmount,
            gstPercent,
            notes,
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }

        const amount = Number(tripAmount);
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({ success: false, message: "Trip amount is required" });
        }

        const lead = await Lead.findById(leadId)
            .populate("tripType", "name durationType")
            .populate("cabType", "name");
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        assertLeadAllowsQuotationEdit(lead);

        const profile = await getOrCreateProfile();
        const gst =
            gstPercent !== undefined && gstPercent !== ""
                ? Number(gstPercent)
                : Number(profile.gstPercent ?? 5);

        if (!Number.isFinite(gst) || gst < 0 || gst > 100) {
            return res.status(400).json({ success: false, message: "Invalid GST %" });
        }

        const amounts = calcAmounts(amount, gst);
        const quotationId = await generateQuotationId();

        const quotation = new Quotation({
            quotationId,
            lead: lead._id,
            company: snapshotCompany(profile),
            customerName: (customerName || lead.customerName || "").trim(),
            mobileNumber: (mobileNumber || lead.mobileNumber || "").trim(),
            email: (email || lead.email || "").trim().toLowerCase(),
            pickupLocation: (pickupLocation || lead.pickupLocation || "").trim(),
            dropLocation: (dropLocation || lead.dropLocation || "").trim(),
            travelDate: travelDate ? new Date(travelDate) : lead.travelDate,
            endDate: endDate
                ? new Date(endDate)
                : lead.endDate || null,
            pickupTime: (pickupTime || lead.pickupTime || "").trim(),
            tripTypeName: (tripTypeName || lead.tripType?.name || "").trim(),
            cabTypeName: (cabTypeName || lead.cabType?.name || "").trim(),
            ...amounts,
            notes:
                notes !== undefined
                    ? String(notes).trim()
                    : "Valid for 48 hours from quotation date.",
            createdBy: req.user?._id,
            updatedBy: req.user?._id,
        });

        if (!quotation.customerName || !quotation.mobileNumber) {
            return res.status(400).json({
                success: false,
                message: "Customer name and mobile are required",
            });
        }

        const { pdfUrl } = await generateQuotationPdf(quotation);
        quotation.pdfUrl = pdfUrl;
        await quotation.save();

        const data = await populateQuotation(Quotation.findById(quotation._id)).lean();
        res.status(201).json({
            success: true,
            message: "Quotation created",
            data,
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const getQuotationsByLead = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }

        const rows = await populateQuotation(
            Quotation.find({ lead: leadId }).sort({ createdAt: -1 })
        ).lean();

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

const getQuotationById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid quotation ID" });
        }

        const quotation = await populateQuotation(Quotation.findById(req.params.id)).lean();
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }

        res.status(200).json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
};

const updateQuotation = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid quotation ID" });
        }

        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }

        const leadForLock = await Lead.findById(quotation.lead).select("status").lean();
        assertLeadAllowsQuotationEdit(leadForLock);

        const textFields = [
            "customerName",
            "mobileNumber",
            "email",
            "pickupLocation",
            "dropLocation",
            "pickupTime",
            "tripTypeName",
            "cabTypeName",
            "notes",
        ];
        textFields.forEach((key) => {
            if (req.body[key] !== undefined) {
                quotation[key] = String(req.body[key] || "").trim();
            }
        });

        if (req.body.travelDate) {
            const d = new Date(req.body.travelDate);
            if (Number.isNaN(d.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid travel date" });
            }
            quotation.travelDate = d;
        }

        if (req.body.endDate !== undefined) {
            if (!req.body.endDate) {
                quotation.endDate = null;
            } else {
                const end = new Date(req.body.endDate);
                if (Number.isNaN(end.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid end date" });
                }
                quotation.endDate = end;
            }
        }

        const tripAmount =
            req.body.tripAmount !== undefined ? Number(req.body.tripAmount) : quotation.tripAmount;
        const gstPercent =
            req.body.gstPercent !== undefined ? Number(req.body.gstPercent) : quotation.gstPercent;

        if (!Number.isFinite(tripAmount) || tripAmount < 0) {
            return res.status(400).json({ success: false, message: "Invalid trip amount" });
        }
        if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
            return res.status(400).json({ success: false, message: "Invalid GST %" });
        }

        Object.assign(quotation, calcAmounts(tripAmount, gstPercent));
        quotation.updatedBy = req.user?._id;

        // Always refresh letterhead (logo/address) from latest company profile
        const profile = await getOrCreateProfile();
        quotation.company = snapshotCompany(profile);

        removeOldPdf(quotation.pdfUrl);
        const { pdfUrl } = await generateQuotationPdf(quotation);
        quotation.pdfUrl = pdfUrl;
        await quotation.save();

        const data = await populateQuotation(Quotation.findById(quotation._id)).lean();
        res.status(200).json({ success: true, message: "Quotation updated", data });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const sendQuotation = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid quotation ID" });
        }

        const { channel, whatsappNumber, email } = req.body;
        if (!["WHATSAPP", "EMAIL"].includes(channel)) {
            return res.status(400).json({
                success: false,
                message: "channel must be WHATSAPP or EMAIL",
            });
        }

        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }

        if (channel === "WHATSAPP") {
            const phone = String(whatsappNumber || quotation.mobileNumber || "").replace(/\D/g, "");
            if (!phone || phone.length < 10) {
                return res.status(400).json({
                    success: false,
                    message: "WhatsApp number is required",
                });
            }
            quotation.mobileNumber = whatsappNumber || quotation.mobileNumber;
        }

        if (channel === "EMAIL") {
            const mail = String(email || quotation.email || "").trim();
            if (!mail || !/\S+@\S+\.\S+/.test(mail)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid email is required",
                });
            }
            quotation.email = mail.toLowerCase();
        }

        // Ensure PDF exists
        if (!quotation.pdfUrl) {
            const { pdfUrl } = await generateQuotationPdf(quotation);
            quotation.pdfUrl = pdfUrl;
        }

        if (!quotation.sentVia.includes(channel)) {
            quotation.sentVia.push(channel);
        }
        quotation.status = "SENT";
        quotation.sentAt = new Date();
        quotation.updatedBy = req.user?._id;
        await quotation.save();

        // Mark lead as QUOTATION_SEND
        await Lead.findByIdAndUpdate(quotation.lead, { status: "QUOTATION_SEND" });

        const origin =
            process.env.PUBLIC_API_URL ||
            process.env.BACKEND_URL ||
            `${req.protocol}://${req.get("host")}`;
        const pdfAbsoluteUrl = quotation.pdfUrl?.startsWith("http")
            ? quotation.pdfUrl
            : `${origin}${quotation.pdfUrl}`;

        const links = buildShareLinks(quotation, {
            whatsappNumber,
            email,
            pdfAbsoluteUrl,
        });

        let emailSent = false;
        if (channel === "EMAIL") {
            const pdfAbs = path.join(
                __dirname,
                "..",
                String(quotation.pdfUrl || "").replace(/^\//, "")
            );
            const brand = quotation.company?.companyName || "True Way Taxi";
            const travel = quotation.travelDate
                ? new Date(quotation.travelDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                  })
                : "—";
            const html = wrapEmail({
                companyName: brand,
                preheader: `Quotation ${quotation.quotationId} — total ${money(quotation.grandTotal)}`,
                title: "Your trip quotation",
                greeting: `Hello <strong>${escapeHtml(quotation.customerName)}</strong>,`,
                bodyHtml:
                    `<p style="margin:0 0 12px;">Please find your trip quotation below. The PDF is attached to this email.</p>` +
                    highlightBox("Grand total", money(quotation.grandTotal)) +
                    detailRows([
                        { label: "Quotation No", value: quotation.quotationId },
                        { label: "Pickup", value: quotation.pickupLocation },
                        { label: "Drop", value: quotation.dropLocation },
                        { label: "Travel date", value: travel },
                        { label: "Pickup time", value: quotation.pickupTime },
                        { label: "Cab", value: quotation.cabTypeName || "—" },
                        { label: "Trip type", value: quotation.tripTypeName || "—" },
                        { label: "Trip amount", value: money(quotation.tripAmount) },
                        { label: `GST (${quotation.gstPercent || 0}%)`, value: money(quotation.gstAmount) },
                    ]),
            });
            await sendQuotationEmail({
                to: quotation.email,
                subject: `Quotation ${quotation.quotationId} — ${brand}`,
                text: links.shareText,
                html,
                pdfAbsolutePath: pdfAbs,
                companyName: brand,
            });
            emailSent = true;
        }

        const data = await populateQuotation(Quotation.findById(quotation._id)).lean();
        res.status(200).json({
            success: true,
            message:
                channel === "WHATSAPP"
                    ? "Quotation ready — WhatsApp opening"
                    : emailSent
                        ? "Quotation emailed with PDF attachment"
                        : "Quotation ready to send by email",
            data: {
                quotation: data,
                ...links,
                channel,
                emailSent,
            },
        });
    } catch (error) {
        next(error);
    }
};

const deleteQuotation = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid quotation ID" });
        }

        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }

        removeOldPdf(quotation.pdfUrl);
        await quotation.deleteOne();
        res.status(200).json({ success: true, message: "Quotation deleted" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPrefillFromLead,
    createQuotation,
    getQuotationsByLead,
    getQuotationById,
    updateQuotation,
    sendQuotation,
    deleteQuotation,
};
