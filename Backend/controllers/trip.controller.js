const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Quotation = require("../models/Quotation");
const { createOrder, verifyPaymentSignature } = require("../utils/razorpay");
const { sendTextEmail, sendQuotationEmail } = require("../utils/mailer");
const { wrapEmail, detailRows, highlightBox, money, escapeHtml } = require("../utils/emailTemplates");
const { getOrCreateProfile } = require("./companyProfile.controller");
const { generateInvoiceId } = require("../utils/generateInvoiceId");
const { generateInvoicePdf } = require("../utils/invoicePdf");

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const MAX_CODE_ATTEMPTS = 5;
const COMPLETE_OTP_TTL_MS = 10 * 60 * 1000;
const COMPLETE_OTP_RESEND_MS = 45 * 1000;

const hashCompleteOtp = (leadId, otp) =>
    crypto
        .createHmac("sha256", process.env.OTP_SECRET || process.env.JWT_SECRET || "tw-otp")
        .update(`${leadId}:${String(otp).trim()}`)
        .digest("hex");

const safeOtpEqual = (a, b) => {
    const left = Buffer.from(String(a || ""), "utf8");
    const right = Buffer.from(String(b || ""), "utf8");
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
};

const maskEmail = (email) => {
    const value = String(email || "").trim().toLowerCase();
    const at = value.indexOf("@");
    if (at < 1) return "***";
    const user = value.slice(0, at);
    const domain = value.slice(at + 1);
    const visible = user.slice(0, Math.min(2, user.length));
    return `${visible}***@${domain}`;
};

const generateCompleteOtp = () => String(crypto.randomInt(100000, 1000000));

const populateTrip = (query) =>
    query
        .populate("tripType", "name durationType")
        .populate("cabType", "name")
        .populate("assignedVendor", "vendorId companyName")
        .populate("assignedDriver", "driverId name mobileNumber")
        .populate("assignedVehicle", "vehicleId vehicleNumber")
        .populate("confirmedQuotation", "quotationId tripAmount gstPercent gstAmount grandTotal");

const removeOldInvoicePdf = (pdfUrl) => {
    if (!pdfUrl) return;
    const abs = path.join(__dirname, "..", String(pdfUrl).replace(/^\//, ""));
    if (fs.existsSync(abs)) {
        try {
            fs.unlinkSync(abs);
        } catch (e) {
            console.warn("Invoice PDF cleanup failed:", e.message);
        }
    }
};

/**
 * Build & persist final tax invoice PDF for a completed trip.
 * Idempotent when regenerate=false and invoice already exists.
 */
const isTripFullyPaid = (leadDoc) => {
    if (!leadDoc) return false;
    const pending = Number(leadDoc.pendingAmount);
    if (Number.isFinite(pending) && pending <= 0) return true;
    return String(leadDoc.paymentStatus || "").toUpperCase() === "PAID";
};

const ensureTripInvoice = async (leadDoc, { regenerate = false } = {}) => {
    if (!leadDoc) return null;
    if (leadDoc.status !== "COMPLETED") {
        const err = new Error("Invoice is available only after trip completion");
        err.status = 400;
        throw err;
    }

    await syncAmountsFromQuotation(leadDoc);
    leadDoc.recalcPending();

    if (!isTripFullyPaid(leadDoc)) {
        const err = new Error(
            "Invoice generates only after full payment is received (payment status Paid)."
        );
        err.status = 400;
        throw err;
    }

    if (leadDoc.invoicePdfUrl && leadDoc.invoiceId && !regenerate) {
        return {
            invoiceId: leadDoc.invoiceId,
            invoicePdfUrl: leadDoc.invoicePdfUrl,
            invoiceGeneratedAt: leadDoc.invoiceGeneratedAt,
            absolutePath: path.join(
                __dirname,
                "..",
                String(leadDoc.invoicePdfUrl).replace(/^\//, "")
            ),
        };
    }

    const [company, populated] = await Promise.all([
        getOrCreateProfile(),
        populateTrip(Lead.findById(leadDoc._id)).lean(),
    ]);

    const trip = populated || leadDoc.toObject?.() || leadDoc;
    if (!leadDoc.invoiceId) {
        leadDoc.invoiceId = await generateInvoiceId();
    }

    const companyPlain = company.toObject ? company.toObject() : company;
    const payload = {
        invoiceId: leadDoc.invoiceId,
        invoiceDate: leadDoc.tripCompletedAt || new Date(),
        leadId: trip.leadId,
        quotationId: trip.confirmedQuotation?.quotationId || "",
        customerName: trip.customerName,
        mobileNumber: trip.mobileNumber,
        email: trip.email || "",
        pickupLocation: trip.pickupLocation,
        dropLocation: trip.dropLocation,
        travelDate: trip.travelDate,
        endDate: trip.endDate || null,
        pickupTime: trip.pickupTime,
        tripStartedAt: trip.tripStartedAt,
        tripCompletedAt: trip.tripCompletedAt || leadDoc.tripCompletedAt,
        cabTypeName: trip.cabType?.name || "",
        tripTypeName: trip.tripType?.name || "",
        driverName: trip.assignedDriver
            ? `${trip.assignedDriver.name || ""}${trip.assignedDriver.driverId ? ` (${trip.assignedDriver.driverId})` : ""}`.trim()
            : "",
        driverMobile: trip.assignedDriver?.mobileNumber || "",
        vehicleNumber: trip.assignedVehicle?.vehicleNumber || "",
        vendorName: trip.assignedVendor
            ? `${trip.assignedVendor.companyName || ""}${trip.assignedVendor.vendorId ? ` (${trip.assignedVendor.vendorId})` : ""}`.trim()
            : "",
        tripAmount: trip.tripAmount,
        gstPercent: trip.gstPercent,
        gstAmount: trip.gstAmount,
        grandTotal: trip.grandTotal,
        advancePaid: trip.advancePaid,
        pendingAmount: trip.pendingAmount,
        paymentStatus: trip.paymentStatus,
        payments: trip.payments || [],
        company: {
            ...companyPlain,
            logoUrl: companyPlain.logo?.url || null,
            quotationHeaderImageUrl: companyPlain.quotationHeaderImage?.url || null,
            paymentQrImageUrl: companyPlain.paymentQrImage?.url || null,
        },
    };

    if (regenerate) removeOldInvoicePdf(leadDoc.invoicePdfUrl);

    const { pdfUrl, absolutePath } = await generateInvoicePdf(payload);
    leadDoc.invoicePdfUrl = pdfUrl;
    leadDoc.invoiceGeneratedAt = new Date();
    await leadDoc.save();

    return {
        invoiceId: leadDoc.invoiceId,
        invoicePdfUrl: leadDoc.invoicePdfUrl,
        invoiceGeneratedAt: leadDoc.invoiceGeneratedAt,
        absolutePath,
    };
};

const assertTripInvoiceAccess = (req, lead) => {
    const role = req.accountRole || req.user?.userType;
    if (role === "ADMIN" || req.user?.userType === "ADMIN") return true;
    if (role === "DRIVER" && String(lead.assignedDriver) === String(req.user._id)) return true;
    if (role === "VENDOR" && String(lead.assignedVendor) === String(req.user._id)) return true;
    const err = new Error("Not allowed to view this invoice");
    err.status = 403;
    throw err;
};

const emailTripInvoice = async (lead, invoice) => {
    if (!lead.email || !invoice?.absolutePath) return;
    if (!isTripFullyPaid(lead)) {
        console.warn("Skipped invoice email — trip not fully paid:", lead.leadId);
        return;
    }
    try {
        const profile = await getOrCreateProfile();
        const brand = profile.companyName || "True Way Taxi";
        await sendQuotationEmail({
            to: lead.email,
            companyName: brand,
            subject: `Final invoice ${invoice.invoiceId} — ${lead.leadId}`,
            text:
                `Hello ${lead.customerName},\n\n` +
                `Your trip ${lead.leadId} is completed. Please find the final invoice attached.\n` +
                `Invoice: ${invoice.invoiceId}\n` +
                `Amount: ${money(lead.grandTotal)}\n\nThank you.`,
            html: wrapEmail({
                companyName: brand,
                title: "Final trip invoice",
                greeting: `Hello <strong>${escapeHtml(lead.customerName)}</strong>,`,
                bodyHtml:
                    `<p>Your trip is completed. Your final invoice is attached.</p>` +
                    highlightBox("Paid", money(lead.grandTotal)) +
                    detailRows([
                        { label: "Invoice", value: invoice.invoiceId },
                        { label: "Lead", value: lead.leadId },
                        { label: "Route", value: `${lead.pickupLocation} → ${lead.dropLocation}` },
                    ]),
            }),
            pdfAbsolutePath: invoice.absolutePath,
        });
    } catch (e) {
        console.warn("Trip invoice email failed:", e.message);
    }
};

const syncAmountsFromQuotation = async (lead) => {
    if (lead.grandTotal > 0) {
        lead.recalcPending();
        return lead;
    }
    let quotation = null;
    if (lead.confirmedQuotation) {
        quotation = await Quotation.findById(lead.confirmedQuotation);
    }
    if (!quotation) {
        quotation = await Quotation.findOne({ lead: lead._id, status: "SENT" }).sort({ createdAt: -1 });
    }
    if (!quotation) {
        quotation = await Quotation.findOne({ lead: lead._id }).sort({ createdAt: -1 });
    }
    if (quotation) {
        lead.confirmedQuotation = quotation._id;
        lead.tripAmount = round2(quotation.tripAmount);
        lead.gstPercent = round2(quotation.gstPercent);
        lead.gstAmount = round2(quotation.gstAmount);
        lead.grandTotal = round2(quotation.grandTotal);
        lead.recalcPending();
    }
    return lead;
};

const listMyTrips = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = { assignedDriver: req.user._id };
        if (status) filter.status = status;
        else {
            filter.status = {
                $in: ["DRIVER_ASSIGNED", "TRIP_STARTED", "PAYMENT_PENDING", "COMPLETED"],
            };
        }

        const [rows, completedCount, activeCount] = await Promise.all([
            populateTrip(Lead.find(filter).sort({ travelDate: -1, updatedAt: -1 })).lean(),
            Lead.countDocuments({ assignedDriver: req.user._id, status: "COMPLETED" }),
            Lead.countDocuments({
                assignedDriver: req.user._id,
                status: { $in: ["DRIVER_ASSIGNED", "TRIP_STARTED", "PAYMENT_PENDING"] },
            }),
        ]);
        res.status(200).json({
            success: true,
            data: rows,
            summary: { completedCount, activeCount, total: rows.length },
        });
    } catch (error) {
        next(error);
    }
};

const buildTripListFilter = (req) => {
    const { status, driverId, vendorId, search } = req.query;
    const filter = { assignedDriver: { $ne: null } };

    const role = req.accountRole || req.user?.userType;
    if (role === "VENDOR") {
        filter.assignedVendor = req.user._id;
    } else if (role === "ADMIN" && vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
        filter.assignedVendor = vendorId;
    }

    if (status) {
        filter.status = status;
    } else if (String(req.query.completedOnly || "") === "1") {
        filter.status = "COMPLETED";
    } else {
        filter.status = {
            $in: ["DRIVER_ASSIGNED", "TRIP_STARTED", "PAYMENT_PENDING", "COMPLETED"],
        };
    }

    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
        filter.assignedDriver = driverId;
    }

    if (search) {
        const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [
            { leadId: re },
            { customerName: re },
            { mobileNumber: re },
            { pickupLocation: re },
            { dropLocation: re },
        ];
    }

    return filter;
};

/** Vendor / Admin: trips assigned to drivers */
const listManagedTrips = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const filter = buildTripListFilter(req);

        const [total, rows] = await Promise.all([
            Lead.countDocuments(filter),
            populateTrip(
                Lead.find(filter)
                    .sort({ updatedAt: -1, travelDate: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
            ).lean(),
        ]);

        res.status(200).json({
            success: true,
            data: rows,
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

/** Per-driver completed trip counts (vendor sees own fleet; admin sees all / filtered) */
const driverTripStats = async (req, res, next) => {
    try {
        const role = req.accountRole || req.user?.userType;
        const match = {
            assignedDriver: { $ne: null },
            status: "COMPLETED",
        };
        if (role === "VENDOR") {
            match.assignedVendor = req.user._id;
        } else if (role === "ADMIN" && req.query.vendorId && mongoose.Types.ObjectId.isValid(req.query.vendorId)) {
            match.assignedVendor = new mongoose.Types.ObjectId(req.query.vendorId);
        }

        const stats = await Lead.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$assignedDriver",
                    completedTrips: { $sum: 1 },
                    totalGrand: { $sum: { $ifNull: ["$grandTotal", 0] } },
                    lastCompletedAt: { $max: "$updatedAt" },
                },
            },
            { $sort: { completedTrips: -1 } },
            {
                $lookup: {
                    from: "drivers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "driver",
                },
            },
            { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "vendors",
                    localField: "driver.assignedVendor",
                    foreignField: "_id",
                    as: "vendor",
                },
            },
            { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    driverId: "$driver.driverId",
                    driverMongoId: "$_id",
                    name: "$driver.name",
                    mobileNumber: "$driver.mobileNumber",
                    email: "$driver.email",
                    status: "$driver.status",
                    completedTrips: 1,
                    totalGrand: 1,
                    lastCompletedAt: 1,
                    vendorId: "$vendor.vendorId",
                    vendorName: "$vendor.companyName",
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: stats,
            summary: {
                drivers: stats.length,
                completedTrips: stats.reduce((s, r) => s + (r.completedTrips || 0), 0),
            },
        });
    } catch (error) {
        next(error);
    }
};

const getMyTrip = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }
        const lead = await populateTrip(Lead.findById(req.params.id));
        if (!lead) return res.status(404).json({ success: false, message: "Trip not found" });
        if (String(lead.assignedDriver?._id || lead.assignedDriver) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your trip" });
        }
        res.status(200).json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

const startTrip = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }
        const code = String(req.body.pickupCode || "").trim();
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: "Enter valid 6-digit pickup code" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: "Trip not found" });
        if (String(lead.assignedDriver) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your trip" });
        }
        if (lead.status !== "DRIVER_ASSIGNED") {
            return res.status(400).json({
                success: false,
                message: `Trip can start only from DRIVER_ASSIGNED (current: ${lead.status})`,
            });
        }
        if (!lead.pickupCode) {
            return res.status(400).json({ success: false, message: "Pickup code not set on this trip" });
        }
        if (lead.pickupCodeAttempts >= MAX_CODE_ATTEMPTS) {
            return res.status(429).json({
                success: false,
                message: "Too many wrong attempts. Contact admin to reset.",
            });
        }

        if (code !== String(lead.pickupCode)) {
            lead.pickupCodeAttempts += 1;
            await lead.save();
            return res.status(400).json({
                success: false,
                message: `Invalid pickup code. Attempts left: ${MAX_CODE_ATTEMPTS - lead.pickupCodeAttempts}`,
            });
        }

        await syncAmountsFromQuotation(lead);
        lead.status = "TRIP_STARTED";
        lead.tripStartedAt = new Date();
        lead.pickupCodeAttempts = 0;
        await lead.save();

        const data = await populateTrip(Lead.findById(lead._id)).lean();
        res.status(200).json({
            success: true,
            message: "Trip started",
            data,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Email a 6-digit drop OTP to the customer. Driver must enter it to complete.
 */
const sendCompleteOtp = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }

        const lead = await Lead.findById(req.params.id).select(
            "+completeOtpHash +completeOtpExpiresAt"
        );
        if (!lead) return res.status(404).json({ success: false, message: "Trip not found" });
        if (String(lead.assignedDriver) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your trip" });
        }
        if (lead.status !== "TRIP_STARTED") {
            return res.status(400).json({
                success: false,
                message: "Drop OTP can only be sent while trip is in progress",
            });
        }
        if (!lead.email) {
            return res.status(400).json({
                success: false,
                message: "Customer email missing — cannot send completion OTP",
            });
        }

        if (
            lead.completeOtpSentAt &&
            Date.now() - new Date(lead.completeOtpSentAt).getTime() < COMPLETE_OTP_RESEND_MS
        ) {
            const waitSec = Math.ceil(
                (COMPLETE_OTP_RESEND_MS -
                    (Date.now() - new Date(lead.completeOtpSentAt).getTime())) /
                    1000
            );
            return res.status(429).json({
                success: false,
                message: `Please wait ${waitSec}s before resending OTP`,
            });
        }

        const otp = generateCompleteOtp();
        lead.completeOtpHash = hashCompleteOtp(lead._id, otp);
        lead.completeOtpExpiresAt = new Date(Date.now() + COMPLETE_OTP_TTL_MS);
        lead.completeOtpAttempts = 0;
        lead.completeOtpSentAt = new Date();
        lead.completeOtpVerifiedAt = null;
        await lead.save();

        const profile = await getOrCreateProfile();
        const brand = profile.companyName || "True Way Taxi";
        try {
            await sendTextEmail({
                to: lead.email,
                companyName: brand,
                subject: `Trip completion OTP — ${lead.leadId}`,
                text:
                    `Hello ${lead.customerName},\n\n` +
                    `Your trip ${lead.leadId} is ready to complete.\n` +
                    `Share this OTP with your driver only: ${otp}\n` +
                    `Valid for 10 minutes. Do not share with anyone else.\n\n` +
                    `Route: ${lead.pickupLocation} → ${lead.dropLocation}\n`,
                html: wrapEmail({
                    companyName: brand,
                    title: "Trip completion OTP",
                    greeting: `Hello <strong>${escapeHtml(lead.customerName)}</strong>,`,
                    bodyHtml:
                        `<p>Your trip <strong>${escapeHtml(lead.leadId)}</strong> is ready to complete. Share this OTP with your driver only.</p>` +
                        highlightBox("Completion OTP", otp) +
                        detailRows([
                            { label: "Valid for", value: "10 minutes" },
                            {
                                label: "Route",
                                value: `${lead.pickupLocation} → ${lead.dropLocation}`,
                            },
                        ]) +
                        `<p style="color:#64748b;font-size:13px;">Do not share this code with anyone except your assigned driver.</p>`,
                }),
            });
        } catch (mailErr) {
            lead.completeOtpHash = null;
            lead.completeOtpExpiresAt = null;
            lead.completeOtpSentAt = null;
            await lead.save();
            return res.status(500).json({
                success: false,
                message: mailErr.message || "Failed to send OTP email",
            });
        }

        res.status(200).json({
            success: true,
            message: `OTP sent to ${maskEmail(lead.email)}`,
            data: {
                emailedTo: maskEmail(lead.email),
                expiresInSec: Math.floor(COMPLETE_OTP_TTL_MS / 1000),
                sentAt: lead.completeOtpSentAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify customer drop OTP. Must match hash, be unexpired, within attempt limit.
 * Clears OTP secrets after success.
 */
const verifyAndConsumeCompleteOtp = async (lead, rawOtp) => {
    const code = String(rawOtp || "").trim();
    if (!/^\d{6}$/.test(code)) {
        const err = new Error("Enter valid 6-digit OTP from customer email");
        err.status = 400;
        throw err;
    }

    if (lead.completeOtpVerifiedAt) {
        return true;
    }

    if (!lead.completeOtpHash || !lead.completeOtpExpiresAt) {
        const err = new Error("Send completion OTP to customer email first");
        err.status = 400;
        throw err;
    }

    if (lead.completeOtpAttempts >= MAX_CODE_ATTEMPTS) {
        const err = new Error("Too many wrong OTP attempts. Resend a new OTP.");
        err.status = 429;
        throw err;
    }

    if (new Date(lead.completeOtpExpiresAt).getTime() < Date.now()) {
        lead.completeOtpHash = null;
        lead.completeOtpExpiresAt = null;
        await lead.save();
        const err = new Error("OTP expired. Send a new OTP to the customer.");
        err.status = 400;
        throw err;
    }

    const expected = lead.completeOtpHash;
    const actual = hashCompleteOtp(lead._id, code);
    if (!safeOtpEqual(expected, actual)) {
        lead.completeOtpAttempts += 1;
        await lead.save();
        const left = MAX_CODE_ATTEMPTS - lead.completeOtpAttempts;
        const err = new Error(
            left > 0
                ? `Invalid OTP. Attempts left: ${left}`
                : "Too many wrong OTP attempts. Resend a new OTP."
        );
        err.status = left > 0 ? 400 : 429;
        throw err;
    }

    lead.completeOtpHash = null;
    lead.completeOtpExpiresAt = null;
    lead.completeOtpAttempts = 0;
    lead.completeOtpVerifiedAt = new Date();
    return true;
};

/**
 * Driver marks drop/complete.
 * - From TRIP_STARTED: requires customer email OTP match first
 * - pending = 0 → COMPLETED immediately
 * - pending > 0 → create Razorpay order (Razorpay only), status PAYMENT_PENDING
 */
const completeTrip = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }

        const lead = await Lead.findById(req.params.id).select(
            "+completeOtpHash +completeOtpExpiresAt"
        );
        if (!lead) return res.status(404).json({ success: false, message: "Trip not found" });
        if (String(lead.assignedDriver) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your trip" });
        }
        if (!["TRIP_STARTED", "PAYMENT_PENDING"].includes(lead.status)) {
            return res.status(400).json({
                success: false,
                message: "Start the trip first before completing",
            });
        }

        // Drop confirmation OTP required when leaving TRIP_STARTED
        if (lead.status === "TRIP_STARTED") {
            try {
                await verifyAndConsumeCompleteOtp(lead, req.body?.completeOtp);
            } catch (otpErr) {
                if (otpErr.status) {
                    return res.status(otpErr.status).json({
                        success: false,
                        message: otpErr.message,
                    });
                }
                throw otpErr;
            }
        }

        await syncAmountsFromQuotation(lead);
        lead.recalcPending();

        if (lead.pendingAmount <= 0) {
            lead.status = "COMPLETED";
            lead.tripCompletedAt = new Date();
            lead.activeRazorpayOrderId = null;
            lead.completeOtpHash = null;
            lead.completeOtpExpiresAt = null;
            await lead.save();

            let invoice = null;
            try {
                invoice = await ensureTripInvoice(lead);
                await emailTripInvoice(lead, invoice);
            } catch (e) {
                console.warn("Invoice generation / email failed:", e.message);
            }

            const data = await populateTrip(Lead.findById(lead._id)).lean();
            return res.status(200).json({
                success: true,
                message: "Trip completed — fully paid",
                data: {
                    trip: data,
                    paymentRequired: false,
                    invoice: invoice
                        ? {
                              invoiceId: invoice.invoiceId,
                              invoicePdfUrl: invoice.invoicePdfUrl,
                          }
                        : null,
                },
            });
        }

        const order = await createOrder({
            amountInr: lead.pendingAmount,
            receipt: `trip_${lead.leadId}_final`.slice(0, 40),
            notes: {
                leadId: String(lead._id),
                leadCode: lead.leadId,
                purpose: "FINAL",
            },
        });

        lead.status = "PAYMENT_PENDING";
        lead.activeRazorpayOrderId = order.orderId;
        await lead.save();

        const data = await populateTrip(Lead.findById(lead._id)).lean();
        res.status(200).json({
            success: true,
            message: "Collect remaining payment via Razorpay",
            data: {
                trip: data,
                paymentRequired: true,
                razorpay: order,
                customer: {
                    name: lead.customerName,
                    email: lead.email || "",
                    contact: lead.mobileNumber,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const verifyFinalPayment = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing Razorpay payment fields" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: "Trip not found" });

        const isDriver = String(lead.assignedDriver) === String(req.user._id);
        const isAdmin = req.accountRole === "ADMIN" || req.user?.userType === "ADMIN";
        if (!isDriver && !isAdmin) {
            return res.status(403).json({ success: false, message: "Not allowed" });
        }

        if (lead.status !== "PAYMENT_PENDING" && lead.status !== "TRIP_STARTED") {
            return res.status(400).json({
                success: false,
                message: `Cannot verify payment in ${lead.status}`,
            });
        }

        const ok = verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });
        if (!ok) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        const already = (lead.payments || []).some(
            (p) => p.razorpayPaymentId === razorpay_payment_id
        );
        if (!already) {
            lead.payments.push({
                method: "RAZORPAY",
                amount: lead.pendingAmount,
                status: "PAID",
                purpose: "FINAL",
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                paidAt: new Date(),
                recordedBy: req.user._id,
                recordedByModel: isDriver ? "Driver" : "User",
            });
        }

        lead.recalcPending();
        lead.status = "COMPLETED";
        lead.tripCompletedAt = new Date();
        lead.activeRazorpayOrderId = null;
        await lead.save();

        let invoice = null;
        try {
            invoice = await ensureTripInvoice(lead);
            await emailTripInvoice(lead, invoice);
        } catch (e) {
            console.warn("Invoice generation / email failed:", e.message);
            if (lead.email) {
                try {
                    const profile = await getOrCreateProfile();
                    const brand = profile.companyName || "True Way Taxi";
                    await sendTextEmail({
                        to: lead.email,
                        companyName: brand,
                        subject: `Trip completed — ${lead.leadId}`,
                        text: `Hello ${lead.customerName}, your trip ${lead.leadId} is completed. Thank you.`,
                        html: wrapEmail({
                            companyName: brand,
                            title: "Trip completed",
                            greeting: `Hello <strong>${escapeHtml(lead.customerName)}</strong>,`,
                            bodyHtml:
                                `<p>Your trip is completed. Thank you for riding with us.</p>` +
                                highlightBox("Paid", money(lead.grandTotal)) +
                                detailRows([
                                    { label: "Lead", value: lead.leadId },
                                    {
                                        label: "Route",
                                        value: `${lead.pickupLocation} → ${lead.dropLocation}`,
                                    },
                                ]),
                        }),
                    });
                } catch (mailErr) {
                    console.warn("Trip complete email failed:", mailErr.message);
                }
            }
        }

        const data = await populateTrip(Lead.findById(lead._id)).lean();
        res.status(200).json({
            success: true,
            message: "Payment confirmed — trip completed",
            data: {
                ...data,
                invoice: invoice
                    ? {
                          invoiceId: invoice.invoiceId,
                          invoicePdfUrl: invoice.invoicePdfUrl,
                      }
                    : null,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin override: complete trip + collect remaining payment (no customer OTP).
 * Allowed from DRIVER_ASSIGNED | TRIP_STARTED | PAYMENT_PENDING.
 * - pending = 0 → COMPLETED + invoice + email
 * - CASH / QR for full pending → COMPLETED + invoice + email
 * - RAZORPAY → order + PAYMENT_PENDING (then verify-payment)
 */
const adminCompleteTrip = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: "Trip not found" });

        if (!["DRIVER_ASSIGNED", "TRIP_STARTED", "PAYMENT_PENDING"].includes(lead.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot admin-complete trip in status ${lead.status}`,
            });
        }

        await syncAmountsFromQuotation(lead);
        lead.recalcPending();

        const note = String(req.body?.note || "").trim();
        const reference = String(req.body?.reference || "").trim();

        if (lead.pendingAmount <= 0) {
            lead.status = "COMPLETED";
            lead.tripCompletedAt = lead.tripCompletedAt || new Date();
            if (!lead.tripStartedAt) lead.tripStartedAt = lead.tripCompletedAt;
            lead.activeRazorpayOrderId = null;
            lead.completeOtpHash = null;
            lead.completeOtpExpiresAt = null;
            if (note) {
                lead.remarks = `${lead.remarks || ""}\n[Admin complete] ${note}`.trim();
            }
            await lead.save();

            let invoice = null;
            try {
                invoice = await ensureTripInvoice(lead);
                await emailTripInvoice(lead, invoice);
            } catch (e) {
                console.warn("Admin complete invoice failed:", e.message);
            }

            const data = await populateTrip(Lead.findById(lead._id)).lean();
            return res.status(200).json({
                success: true,
                message: "Trip completed by admin — already fully paid",
                data: {
                    trip: data,
                    paymentRequired: false,
                    invoice: invoice
                        ? { invoiceId: invoice.invoiceId, invoicePdfUrl: invoice.invoicePdfUrl }
                        : null,
                },
            });
        }

        const method = String(req.body?.method || "").toUpperCase();
        if (!["CASH", "QR", "RAZORPAY"].includes(method)) {
            return res.status(400).json({
                success: false,
                message: "Select payment method: CASH, QR or RAZORPAY to collect pending amount",
            });
        }

        if (method === "RAZORPAY") {
            const order = await createOrder({
                amountInr: lead.pendingAmount,
                receipt: `adm_${lead.leadId}_final`.slice(0, 40),
                notes: {
                    leadId: String(lead._id),
                    leadCode: lead.leadId,
                    purpose: "FINAL",
                    by: "ADMIN",
                },
            });

            lead.status = "PAYMENT_PENDING";
            lead.activeRazorpayOrderId = order.orderId;
            if (note) {
                lead.remarks = `${lead.remarks || ""}\n[Admin collect Razorpay] ${note}`.trim();
            }
            await lead.save();

            const data = await populateTrip(Lead.findById(lead._id)).lean();
            return res.status(200).json({
                success: true,
                message: "Collect remaining payment via Razorpay",
                data: {
                    trip: data,
                    paymentRequired: true,
                    razorpay: order,
                    customer: {
                        name: lead.customerName,
                        email: lead.email || "",
                        contact: lead.mobileNumber,
                    },
                },
            });
        }

        // CASH / QR — must clear full pending
        const amount =
            req.body?.amount !== undefined && req.body?.amount !== ""
                ? Number(req.body.amount)
                : lead.pendingAmount;
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Enter a valid payment amount" });
        }
        if (amount + 0.009 < lead.pendingAmount) {
            return res.status(400).json({
                success: false,
                message: `Collect full pending amount (${lead.pendingAmount}) to complete the trip`,
            });
        }

        lead.payments.push({
            method,
            amount: lead.pendingAmount,
            status: "PAID",
            purpose: "FINAL",
            reference: reference || `ADMIN_${method}`,
            note: note || "Final payment collected by admin",
            paidAt: new Date(),
            recordedBy: req.user._id,
            recordedByModel: "User",
        });
        lead.recalcPending();
        lead.status = "COMPLETED";
        lead.tripCompletedAt = new Date();
        if (!lead.tripStartedAt) lead.tripStartedAt = lead.tripCompletedAt;
        lead.activeRazorpayOrderId = null;
        lead.completeOtpHash = null;
        lead.completeOtpExpiresAt = null;
        await lead.save();

        let invoice = null;
        try {
            invoice = await ensureTripInvoice(lead);
            await emailTripInvoice(lead, invoice);
        } catch (e) {
            console.warn("Admin complete invoice failed:", e.message);
        }

        const data = await populateTrip(Lead.findById(lead._id)).lean();
        res.status(200).json({
            success: true,
            message: "Trip completed by admin — payment recorded",
            data: {
                trip: data,
                paymentRequired: false,
                invoice: invoice
                    ? { invoiceId: invoice.invoiceId, invoicePdfUrl: invoice.invoicePdfUrl }
                    : null,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get / generate final invoice PDF for a completed trip.
 * Accessible by assigned driver, assigned vendor, or admin.
 */
const getTripInvoice = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid trip ID" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: "Trip not found" });

        assertTripInvoiceAccess(req, lead);

        const regenerate = String(req.query.regenerate || "") === "1";
        const invoice = await ensureTripInvoice(lead, { regenerate });

        res.status(200).json({
            success: true,
            data: {
                tripId: lead._id,
                leadId: lead.leadId,
                invoiceId: invoice.invoiceId,
                invoicePdfUrl: invoice.invoicePdfUrl,
                invoiceGeneratedAt: invoice.invoiceGeneratedAt,
                grandTotal: lead.grandTotal,
                status: lead.status,
            },
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

module.exports = {
    listMyTrips,
    getMyTrip,
    startTrip,
    sendCompleteOtp,
    completeTrip,
    adminCompleteTrip,
    verifyFinalPayment,
    getTripInvoice,
    syncAmountsFromQuotation,
    listManagedTrips,
    driverTripStats,
    ensureTripInvoice,
};
