const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { LEAD_SOURCES, LEAD_STATUSES } = require("../models/Lead");
const TripType = require("../models/TripType");
const CarType = require("../models/CarType");
const { generateLeadId } = require("../utils/generateLeadId");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");
const { notifyNewLead, notifyFollowUpScheduled } = require("../services/notification.service");
const { PAYMENT_METHODS, ADDRESS_PROOF_TYPES } = require("../models/Lead");
const { sendTextEmail } = require("../utils/mailer");
const {
    wrapEmail,
    detailRows,
    highlightBox,
    money,
    escapeHtml,
} = require("../utils/emailTemplates");
const { getOrCreateProfile } = require("./companyProfile.controller");
const { createOrder, verifyPaymentSignature } = require("../utils/razorpay");
const { syncAmountsFromQuotation } = require("./trip.controller");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");

const round2 = (n) => Math.round(Number(n) * 100) / 100;

const assertActiveTripType = async (tripTypeId) => {
    if (!mongoose.Types.ObjectId.isValid(tripTypeId)) {
        const error = new Error("Invalid trip type ID");
        error.status = 400;
        throw error;
    }
    const type = await TripType.findById(tripTypeId);
    if (!type) {
        const error = new Error("Trip type not found");
        error.status = 404;
        throw error;
    }
    if (type.status !== "ACTIVE") {
        const error = new Error("Selected trip type is inactive");
        error.status = 400;
        throw error;
    }
    return type;
};

const assertActiveCabType = async (cabTypeId) => {
    if (!mongoose.Types.ObjectId.isValid(cabTypeId)) {
        const error = new Error("Invalid cab type ID");
        error.status = 400;
        throw error;
    }
    const type = await CarType.findById(cabTypeId);
    if (!type) {
        const error = new Error("Cab type not found");
        error.status = 404;
        throw error;
    }
    if (type.status !== "ACTIVE") {
        const error = new Error("Selected cab type is inactive");
        error.status = 400;
        throw error;
    }
    return type;
};

/** Parse/validate endDate when trip type is MULTI_DAY; otherwise null */
const resolveLeadEndDate = (travelDate, endDate, durationType) => {
    if (durationType !== "MULTI_DAY") return null;
    if (!endDate) {
        const error = new Error("End date is required for multi-day trips");
        error.status = 400;
        throw error;
    }
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
        const error = new Error("Invalid end date");
        error.status = 400;
        throw error;
    }
    const start = new Date(travelDate);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (endDay < startDay) {
        const error = new Error("End date cannot be before travel date");
        error.status = 400;
        throw error;
    }
    return end;
};

const populateLead = (query) =>
    query
        .populate("tripType", "name status durationType")
        .populate("cabType", "name status")
        .populate("createdBy", "name email")
        .populate("followUps.createdBy", "name email")
        .populate("followUps.updatedBy", "name email")
        .populate("assignedVendor", "vendorId companyName email mobileNumber businessModel companySharePercent")
        .populate("assignedDriver", "driverId name mobileNumber")
        .populate("assignedVehicle", "vehicleId vehicleNumber")
        .populate("confirmedQuotation", "quotationId tripAmount gstAmount grandTotal")
        .populate("activeVendorOffer")
        .populate("cancelledBy", "name email");

const CANCELLABLE_BEFORE_PICKUP = new Set([
    "PENDING",
    "NEW",
    "FOLLOW_UP",
    "QUOTATION_SEND",
    "CONFIRMED",
    "VENDOR_OFFERED",
    "VENDOR_ACCEPTED",
    "DRIVER_ASSIGNED",
]);

const refreshNextFollowUp = (lead) => {
    if (!lead.followUps?.length) {
        lead.nextFollowUpDate = null;
        return;
    }
    const upcoming = [...lead.followUps]
        .map((f) => f.followUpDate)
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next = upcoming.find((d) => new Date(d) >= now) || upcoming[upcoming.length - 1];
    lead.nextFollowUpDate = next || null;
};

const parseFollowUpPayload = (body) => {
    const { followUpDate, followUpTime, reason } = body;

    if (!followUpDate) {
        const error = new Error("Follow-up date is required");
        error.status = 400;
        throw error;
    }
    if (!followUpTime?.trim()) {
        const error = new Error("Follow-up time is required");
        error.status = 400;
        throw error;
    }
    if (!reason?.trim()) {
        const error = new Error("Follow-up reason is required");
        error.status = 400;
        throw error;
    }

    const date = new Date(followUpDate);
    if (Number.isNaN(date.getTime())) {
        const error = new Error("Invalid follow-up date");
        error.status = 400;
        throw error;
    }

    return {
        followUpDate: date,
        followUpTime: String(followUpTime).trim(),
        reason: String(reason).trim(),
    };
};

const createLead = async (req, res, next) => {
    try {
        const {
            customerName,
            mobileNumber,
            email,
            leadSource,
            pickupLocation,
            dropLocation,
            travelDate,
            endDate,
            pickupTime,
            tripType,
            cabType,
            customerRequirements,
            remarks,
        } = req.body;

        if (!customerName?.trim()) {
            return res.status(400).json({ success: false, message: "Customer name is required" });
        }
        if (!mobileNumber?.trim()) {
            return res.status(400).json({ success: false, message: "Mobile number is required" });
        }
        if (!leadSource || !LEAD_SOURCES.includes(String(leadSource).toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead source. Use CALLS, WHATSAPP, META, WEBSITE, EMAIL or DIRECT",
            });
        }
        if (!pickupLocation?.trim()) {
            return res.status(400).json({ success: false, message: "Pickup location is required" });
        }
        if (!dropLocation?.trim()) {
            return res.status(400).json({ success: false, message: "Drop location is required" });
        }
        if (!travelDate) {
            return res.status(400).json({ success: false, message: "Travel date is required" });
        }
        if (!pickupTime?.trim()) {
            return res.status(400).json({ success: false, message: "Pickup time is required" });
        }
        if (!tripType) {
            return res.status(400).json({ success: false, message: "Trip type is required" });
        }
        if (!cabType) {
            return res.status(400).json({ success: false, message: "Cab type is required" });
        }

        const date = new Date(travelDate);
        if (Number.isNaN(date.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid travel date" });
        }

        const tripTypeDoc = await assertActiveTripType(tripType);
        await assertActiveCabType(cabType);
        const resolvedEndDate = resolveLeadEndDate(date, endDate, tripTypeDoc.durationType);

        const leadId = await generateLeadId();

        const lead = await Lead.create({
            leadId,
            customerName: customerName.trim(),
            mobileNumber: mobileNumber.trim(),
            email: email?.trim() ? String(email).toLowerCase().trim() : null,
            leadSource: String(leadSource).toUpperCase(),
            pickupLocation: pickupLocation.trim(),
            dropLocation: dropLocation.trim(),
            travelDate: date,
            endDate: resolvedEndDate,
            pickupTime: pickupTime.trim(),
            tripType,
            cabType,
            customerRequirements: customerRequirements ? String(customerRequirements).trim() : "",
            remarks: remarks ? String(remarks).trim() : "",
            status: "PENDING",
            createdBy: req.user._id,
        });

        const populated = await populateLead(Lead.findById(lead._id));

        notifyNewLead(lead).catch((err) => {
            console.error("notifyNewLead failed:", err.message);
        });

        res.status(201).json({
            success: true,
            message: "Lead created successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const getLeads = async (req, res, next) => {
    try {
        const {
            search,
            status,
            leadSource,
            tripType,
            cabType,
            travelFrom,
            travelTo,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = {};

        if (status) {
            if (!LEAD_STATUSES.includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            filter.status = status;
        }

        if (leadSource) {
            if (!LEAD_SOURCES.includes(String(leadSource).toUpperCase())) {
                return res.status(400).json({ success: false, message: "Invalid lead source" });
            }
            filter.leadSource = String(leadSource).toUpperCase();
        }

        if (tripType) {
            if (!mongoose.Types.ObjectId.isValid(tripType)) {
                return res.status(400).json({ success: false, message: "Invalid trip type ID" });
            }
            filter.tripType = tripType;
        }

        if (cabType) {
            if (!mongoose.Types.ObjectId.isValid(cabType)) {
                return res.status(400).json({ success: false, message: "Invalid cab type ID" });
            }
            filter.cabType = cabType;
        }

        if (travelFrom || travelTo) {
            filter.travelDate = {};
            if (travelFrom) {
                const from = new Date(travelFrom);
                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid travelFrom date" });
                }
                filter.travelDate.$gte = from;
            }
            if (travelTo) {
                const to = new Date(travelTo);
                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid travelTo date" });
                }
                to.setHours(23, 59, 59, 999);
                filter.travelDate.$lte = to;
            }
        }

        const { createdFrom, createdTo, followUpFrom, followUpTo } = req.query;

        if (createdFrom || createdTo) {
            filter.createdAt = {};
            if (createdFrom) {
                const from = new Date(createdFrom);
                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid createdFrom date" });
                }
                filter.createdAt.$gte = from;
            }
            if (createdTo) {
                const to = new Date(createdTo);
                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid createdTo date" });
                }
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }

        if (followUpFrom || followUpTo) {
            filter.nextFollowUpDate = {};
            if (followUpFrom) {
                const from = new Date(followUpFrom);
                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid followUpFrom date" });
                }
                filter.nextFollowUpDate.$gte = from;
            }
            if (followUpTo) {
                const to = new Date(followUpTo);
                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid followUpTo date" });
                }
                to.setHours(23, 59, 59, 999);
                filter.nextFollowUpDate.$lte = to;
            }
        }

        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { leadId: { $regex: safe, $options: "i" } },
                { customerName: { $regex: safe, $options: "i" } },
                { mobileNumber: { $regex: safe, $options: "i" } },
                { email: { $regex: safe, $options: "i" } },
                { pickupLocation: { $regex: safe, $options: "i" } },
                { dropLocation: { $regex: safe, $options: "i" } },
            ];
        }

        const allowedSort = new Set(["createdAt", "updatedAt", "travelDate", "customerName", "leadId", "status"]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Lead.countDocuments(filter),
            populateLead(
                Lead.find(filter)
                    .sort({ [sortField]: sortDir })
                    .skip(skip)
                    .limit(limitNum)
            ).lean(),
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getLeadStatusCounts = async (req, res, next) => {
    try {
        const rows = await Lead.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const byStatus = {};
        for (const status of LEAD_STATUSES) {
            byStatus[status] = 0;
        }

        let total = 0;
        for (const row of rows) {
            const key = row._id;
            const count = Number(row.count) || 0;
            total += count;
            if (Object.prototype.hasOwnProperty.call(byStatus, key)) {
                byStatus[key] = count;
            }
        }

        res.status(200).json({
            success: true,
            data: { total, byStatus },
        });
    } catch (error) {
        next(error);
    }
};

const getLeadById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }

        const lead = await populateLead(Lead.findById(req.params.id)).lean();
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        res.status(200).json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

const updateLead = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        if (lead.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Cancelled booking cannot be edited",
            });
        }

        const stringFields = [
            "customerName",
            "mobileNumber",
            "pickupLocation",
            "dropLocation",
            "pickupTime",
            "customerRequirements",
            "remarks",
        ];

        for (const field of stringFields) {
            if (req.body[field] !== undefined && req.body[field] !== null) {
                lead[field] = String(req.body[field]).trim();
            }
        }

        if (req.body.email !== undefined) {
            lead.email = req.body.email?.trim()
                ? String(req.body.email).toLowerCase().trim()
                : null;
        }

        if (req.body.leadSource) {
            if (!LEAD_SOURCES.includes(String(req.body.leadSource).toUpperCase())) {
                return res.status(400).json({ success: false, message: "Invalid lead source" });
            }
            lead.leadSource = String(req.body.leadSource).toUpperCase();
        }

        if (req.body.travelDate) {
            const date = new Date(req.body.travelDate);
            if (Number.isNaN(date.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid travel date" });
            }
            lead.travelDate = date;
        }

        if (req.body.tripType) {
            await assertActiveTripType(req.body.tripType);
            lead.tripType = req.body.tripType;
        }

        if (req.body.cabType) {
            await assertActiveCabType(req.body.cabType);
            lead.cabType = req.body.cabType;
        }

        if (req.body.status) {
            if (!LEAD_STATUSES.includes(req.body.status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            lead.status = req.body.status;
        }

        if (!lead.customerName) {
            return res.status(400).json({ success: false, message: "Customer name cannot be empty" });
        }
        if (!lead.mobileNumber) {
            return res.status(400).json({ success: false, message: "Mobile number cannot be empty" });
        }

        const tripTypeId = lead.tripType?._id || lead.tripType;
        const tripTypeDoc = await TripType.findById(tripTypeId).lean();
        const durationType = tripTypeDoc?.durationType || "SINGLE_DAY";
        const endDateInput =
            req.body.endDate !== undefined ? req.body.endDate : lead.endDate;
        lead.endDate = resolveLeadEndDate(lead.travelDate, endDateInput, durationType);

        await lead.save();

        const populated = await populateLead(Lead.findById(lead._id));

        res.status(200).json({
            success: true,
            message: "Lead updated successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const paymentStatusLabel = (status) => {
    if (status === "PAID") return "Paid";
    if (status === "PARTIALLY_PAID") return "Partially paid";
    return "Pending";
};

const applyConfirmTripDetails = (lead, body, files) => {
    const exactPickup = String(body?.exactPickupLocation || "").trim();
    const exactDrop = String(body?.exactDropLocation || "").trim();
    const proofType = String(body?.addressProofType || "").trim().toUpperCase();

    if (!exactPickup) {
        const err = new Error("Exact pickup location is required");
        err.status = 400;
        throw err;
    }
    if (!exactDrop) {
        const err = new Error("Exact drop location is required");
        err.status = 400;
        throw err;
    }
    if (!ADDRESS_PROOF_TYPES.includes(proofType)) {
        const err = new Error(
            "addressProofType must be AADHAAR, PAN, DL, VOTER, PASSPORT or OTHER"
        );
        err.status = 400;
        throw err;
    }

    const proofFile = files?.addressProof?.[0];
    if (proofFile) {
        if (lead.addressProof?.url) removeLocalFile(lead.addressProof);
        lead.addressProof = toDocumentMeta(proofFile, "leads");
    } else if (!lead.addressProof?.url) {
        const err = new Error("Government ID / address proof document is required");
        err.status = 400;
        throw err;
    }

    lead.exactPickupLocation = exactPickup;
    lead.exactDropLocation = exactDrop;
    lead.addressProofType = proofType;
};

const sendConfirmEmail = async (lead) => {
    if (!lead.email) return false;
    try {
        const profile = await getOrCreateProfile();
        const travel = new Date(lead.travelDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
        const brand = profile.companyName || "True Way Taxi";
        const pickup = lead.exactPickupLocation || lead.pickupLocation;
        const drop = lead.exactDropLocation || lead.dropLocation;
        await sendTextEmail({
            to: lead.email,
            companyName: brand,
            subject: `Trip confirmed — ${lead.leadId}`,
            text:
                `Hello ${lead.customerName},\n\nYour trip is confirmed.\n` +
                `Pickup: ${pickup}\nDrop: ${drop}\n` +
                `Total: ${money(lead.grandTotal)} · Advance: ${money(lead.advancePaid)} · Pending: ${money(lead.pendingAmount)}\n` +
                `Payment status: ${paymentStatusLabel(lead.paymentStatus)}\n`,
            html: wrapEmail({
                companyName: brand,
                preheader: "Your trip is confirmed — vehicle allotting",
                title: "Trip confirmed",
                greeting: `Hello <strong>${escapeHtml(lead.customerName)}</strong>,`,
                bodyHtml:
                    `<p style="margin:0 0 12px;">Your trip is confirmed. We are allotting a vehicle.</p>` +
                    highlightBox("Amount due (pending)", money(lead.pendingAmount)) +
                    detailRows([
                        { label: "Lead ID", value: lead.leadId },
                        { label: "Exact pickup", value: pickup },
                        { label: "Exact drop", value: drop },
                        { label: "Travel date", value: travel },
                        { label: "Pickup time", value: lead.pickupTime },
                        { label: "Grand total", value: money(lead.grandTotal) },
                        { label: "Advance paid", value: money(lead.advancePaid) },
                        { label: "Pending", value: money(lead.pendingAmount) },
                        {
                            label: "Payment status",
                            value: paymentStatusLabel(lead.paymentStatus),
                        },
                    ]),
            }),
        });
        return true;
    } catch (mailErr) {
        console.warn("Confirm email failed:", mailErr.message);
        return false;
    }
};

/**
 * Confirm lead with optional advance payment + exact locations + address proof.
 * multipart: exactPickupLocation, exactDropLocation, addressProofType, addressProof (file)
 * + advanceMethod / advanceAmount / advanceReference
 * If advanceMethod=RAZORPAY → returns razorpay order (lead not confirmed until verify).
 */
const confirmLead = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

        if (
            ["COMPLETED", "LOST", "CANCELLED", "TRIP_STARTED", "PAYMENT_PENDING"].includes(
                lead.status
            )
        ) {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm from status ${lead.status}`,
            });
        }

        await syncAmountsFromQuotation(lead);
        if (!lead.grandTotal || lead.grandTotal <= 0) {
            return res.status(400).json({
                success: false,
                message: "Create & send quotation first (grand total required)",
            });
        }

        try {
            applyConfirmTripDetails(lead, req.body || {}, req.files || {});
        } catch (detailErr) {
            if (detailErr.status) {
                return res.status(detailErr.status).json({
                    success: false,
                    message: detailErr.message,
                });
            }
            throw detailErr;
        }

        const { advanceMethod, advanceAmount, advanceReference } = req.body || {};
        const hasAdvance = Boolean(advanceMethod);
        let amount = round2(advanceAmount || 0);

        if (hasAdvance) {
            if (!PAYMENT_METHODS.includes(advanceMethod)) {
                return res.status(400).json({
                    success: false,
                    message: "advanceMethod must be CASH, RAZORPAY or QR",
                });
            }
            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Enter advance amount greater than 0",
                });
            }
            if (amount > lead.grandTotal) {
                return res.status(400).json({
                    success: false,
                    message: "Advance cannot exceed grand total",
                });
            }
        }

        // Razorpay advance: save locations/proof, create order; confirm after verify
        if (hasAdvance && advanceMethod === "RAZORPAY") {
            const order = await createOrder({
                amountInr: amount,
                receipt: `adv_${lead.leadId}`.slice(0, 40),
                notes: {
                    leadId: String(lead._id),
                    leadCode: lead.leadId,
                    purpose: "ADVANCE",
                },
            });
            lead.activeRazorpayOrderId = order.orderId;
            await lead.save();
            return res.status(200).json({
                success: true,
                message: "Complete Razorpay advance to confirm lead",
                data: {
                    paymentRequired: true,
                    razorpay: order,
                    lead: {
                        id: lead._id,
                        leadId: lead.leadId,
                        grandTotal: lead.grandTotal,
                        pendingAmount: round2(lead.grandTotal - amount),
                        advanceAmount: amount,
                        exactPickupLocation: lead.exactPickupLocation,
                        exactDropLocation: lead.exactDropLocation,
                    },
                    customer: {
                        name: lead.customerName,
                        email: lead.email || "",
                        contact: lead.mobileNumber,
                    },
                },
            });
        }

        if (hasAdvance && (advanceMethod === "CASH" || advanceMethod === "QR")) {
            lead.payments.push({
                method: advanceMethod,
                amount,
                status: "PAID",
                purpose: "ADVANCE",
                reference: String(advanceReference || "").trim(),
                paidAt: new Date(),
                recordedBy: req.user._id,
                recordedByModel: "User",
            });
            lead.recalcPending();
        } else {
            lead.recalcPending();
        }

        lead.status = "CONFIRMED";
        lead.confirmedAt = new Date();
        await lead.save();

        const confirmEmailSent = await sendConfirmEmail(lead);

        res.status(200).json({
            success: true,
            message: confirmEmailSent
                ? "Lead confirmed — email sent"
                : "Lead confirmed",
            data: {
                paymentRequired: false,
                id: lead._id,
                leadId: lead.leadId,
                status: lead.status,
                paymentStatus: lead.paymentStatus,
                grandTotal: lead.grandTotal,
                advancePaid: lead.advancePaid,
                pendingAmount: lead.pendingAmount,
                exactPickupLocation: lead.exactPickupLocation,
                exactDropLocation: lead.exactDropLocation,
                confirmEmailSent,
            },
        });
    } catch (error) {
        next(error);
    }
};
const verifyAdvancePayment = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, advanceAmount } =
            req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing Razorpay fields" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

        const ok = verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });
        if (!ok) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        await syncAmountsFromQuotation(lead);
        const amount = round2(advanceAmount || 0);
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid advance amount" });
        }

        const already = (lead.payments || []).some(
            (p) => p.razorpayPaymentId === razorpay_payment_id
        );
        if (!already) {
            lead.payments.push({
                method: "RAZORPAY",
                amount,
                status: "PAID",
                purpose: "ADVANCE",
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                paidAt: new Date(),
                recordedBy: req.user._id,
                recordedByModel: "User",
            });
        }

        lead.recalcPending();
        lead.status = "CONFIRMED";
        lead.confirmedAt = new Date();
        lead.activeRazorpayOrderId = null;
        await lead.save();

        const confirmEmailSent = await sendConfirmEmail(lead);

        res.status(200).json({
            success: true,
            message: "Advance paid — lead confirmed",
            data: {
                id: lead._id,
                leadId: lead.leadId,
                status: lead.status,
                paymentStatus: lead.paymentStatus,
                grandTotal: lead.grandTotal,
                advancePaid: lead.advancePaid,
                pendingAmount: lead.pendingAmount,
                exactPickupLocation: lead.exactPickupLocation,
                exactDropLocation: lead.exactDropLocation,
                confirmEmailSent,
            },
        });
    } catch (error) {
        next(error);
    }
};

const changeLeadStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }

        const { status } = req.body;
        if (!LEAD_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Use ${LEAD_STATUSES.join(", ")}`,
            });
        }

        if (status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Use Cancel Booking with a reason (before pickup)",
            });
        }

        // Confirm must go through confirmLead (supports optional advance)
        if (status === "CONFIRMED") {
            req.body = { ...(req.body || {}) };
            return confirmLead(req, res, next);
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        if (lead.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Cancelled booking status cannot be changed",
            });
        }

        lead.status = status;
        await lead.save();

        res.status(200).json({
            success: true,
            message: `Lead marked as ${status}`,
            data: {
                id: lead._id,
                leadId: lead.leadId,
                status: lead.status,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel booking before pickup / trip start.
 * Stores reason + canceller name / designation / time.
 * @route POST /api/v1/admin/leads/:id/cancel
 */
const cancelLeadBooking = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }

        const reason = String(req.body?.reason || "").trim();
        if (!reason) {
            return res.status(400).json({ success: false, message: "Cancellation reason is required" });
        }
        if (reason.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Please enter a clearer cancellation reason",
            });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        if (lead.status === "CANCELLED") {
            return res.status(400).json({ success: false, message: "Booking is already cancelled" });
        }

        if (!CANCELLABLE_BEFORE_PICKUP.has(lead.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel after pickup / trip start (current: ${lead.status})`,
            });
        }

        const actorName = String(req.user?.name || "Admin").trim();
        const actorEmail = String(req.user?.email || "").trim();
        const designationName =
            (typeof req.user?.designation === "object" && req.user.designation?.name) ||
            (req.user?.isSuperAdmin ? "Super Admin" : "Admin");

        lead.statusBeforeCancel = lead.status;
        lead.status = "CANCELLED";
        lead.cancellationReason = reason;
        lead.cancelledAt = new Date();
        lead.cancelledBy = req.user._id;
        lead.cancelledByName = actorName;
        lead.cancelledByDesignation = String(designationName || "Admin");
        lead.cancelledByEmail = actorEmail;
        lead.activeVendorOffer = null;
        lead.activeBidRound = null;
        await lead.save();

        try {
            const VendorOffer = require("../models/VendorOffer");
            await VendorOffer.updateMany(
                { lead: lead._id, status: { $in: ["OFFERED", "ACCEPTED"] } },
                { $set: { status: "CANCELLED" } }
            );
        } catch (e) {
            console.warn("Cancel vendor offers failed:", e.message);
        }

        try {
            const BidRound = require("../models/BidRound");
            await BidRound.updateMany(
                { lead: lead._id, status: "OPEN" },
                { $set: { status: "CANCELLED", closedAt: new Date() } }
            );
        } catch (e) {
            console.warn("Cancel bid rounds failed:", e.message);
        }

        // Soft notify customer (does not block cancel)
        if (lead.email) {
            try {
                const profile = await getOrCreateProfile();
                const brand = profile.companyName || "True Way Taxi";
                const travelStr = lead.travelDate
                    ? new Date(lead.travelDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                      })
                    : "—";
                await sendTextEmail({
                    to: lead.email,
                    companyName: brand,
                    subject: `Booking cancelled · ${lead.leadId}`,
                    text:
                        `Hello ${lead.customerName},\n\n` +
                        `Your booking ${lead.leadId} has been cancelled.\n` +
                        `Reason: ${reason}\n` +
                        `Route: ${lead.pickupLocation} → ${lead.dropLocation}\n` +
                        `Travel: ${travelStr} · ${lead.pickupTime || ""}\n`,
                    html: wrapEmail({
                        companyName: brand,
                        preheader: `Booking ${lead.leadId} cancelled`,
                        title: "Booking cancelled",
                        greeting: `Hello <strong>${escapeHtml(lead.customerName)}</strong>,`,
                        bodyHtml:
                            `<p style="margin:0 0 12px;">Your booking has been cancelled before pickup.</p>` +
                            detailRows([
                                { label: "Lead ID", value: lead.leadId },
                                { label: "Reason", value: reason },
                                {
                                    label: "Route",
                                    value: `${lead.pickupLocation} → ${lead.dropLocation}`,
                                },
                                { label: "Travel", value: `${travelStr} · ${lead.pickupTime || ""}` },
                            ]),
                    }),
                });
            } catch (e) {
                console.warn("Cancel customer email failed:", e.message);
            }
        }

        const populated = await populateLead(Lead.findById(lead._id));
        res.status(200).json({
            success: true,
            message: "Booking cancelled",
            data: populated,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancelled bookings list with filters + pagination.
 * @route GET /api/v1/admin/leads/cancelled
 */
const listCancelledLeads = async (req, res, next) => {
    try {
        const {
            search,
            leadSource,
            cancelledFrom,
            cancelledTo,
            cancelledBy,
            travelFrom,
            travelTo,
            page = 1,
            limit = 10,
            sortBy = "cancelledAt",
            sortOrder = "desc",
        } = req.query;

        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = { status: "CANCELLED" };

        if (leadSource) {
            if (!LEAD_SOURCES.includes(String(leadSource).toUpperCase())) {
                return res.status(400).json({ success: false, message: "Invalid lead source" });
            }
            filter.leadSource = String(leadSource).toUpperCase();
        }

        if (cancelledBy) {
            const safe = escapeRegex(String(cancelledBy).trim());
            filter.$or = [
                { cancelledByName: { $regex: safe, $options: "i" } },
                { cancelledByDesignation: { $regex: safe, $options: "i" } },
                { cancelledByEmail: { $regex: safe, $options: "i" } },
            ];
        }

        if (cancelledFrom || cancelledTo) {
            filter.cancelledAt = {};
            if (cancelledFrom) {
                const from = new Date(cancelledFrom);
                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid cancelledFrom" });
                }
                filter.cancelledAt.$gte = from;
            }
            if (cancelledTo) {
                const to = new Date(cancelledTo);
                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid cancelledTo" });
                }
                to.setHours(23, 59, 59, 999);
                filter.cancelledAt.$lte = to;
            }
        }

        if (travelFrom || travelTo) {
            filter.travelDate = {};
            if (travelFrom) {
                const from = new Date(travelFrom);
                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid travelFrom" });
                }
                filter.travelDate.$gte = from;
            }
            if (travelTo) {
                const to = new Date(travelTo);
                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({ success: false, message: "Invalid travelTo" });
                }
                to.setHours(23, 59, 59, 999);
                filter.travelDate.$lte = to;
            }
        }

        if (search) {
            const safe = escapeRegex(String(search).trim());
            const searchOr = [
                { leadId: { $regex: safe, $options: "i" } },
                { customerName: { $regex: safe, $options: "i" } },
                { mobileNumber: { $regex: safe, $options: "i" } },
                { email: { $regex: safe, $options: "i" } },
                { cancellationReason: { $regex: safe, $options: "i" } },
                { pickupLocation: { $regex: safe, $options: "i" } },
                { dropLocation: { $regex: safe, $options: "i" } },
                { cancelledByName: { $regex: safe, $options: "i" } },
            ];
            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
                delete filter.$or;
            } else {
                filter.$or = searchOr;
            }
        }

        const allowedSort = new Set(["cancelledAt", "createdAt", "travelDate", "customerName", "leadId"]);
        const sortField = allowedSort.has(String(sortBy)) ? String(sortBy) : "cancelledAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Lead.countDocuments(filter),
            populateLead(
                Lead.find(filter)
                    .sort({ [sortField]: sortDir })
                    .skip(skip)
                    .limit(limitNum)
            ).lean(),
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const deleteLead = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }

        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        res.status(200).json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
        next(error);
    }
};

const addFollowUp = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const payload = parseFollowUpPayload(req.body);
        lead.followUps.push({
            ...payload,
            createdBy: req.user._id,
            updatedBy: req.user._id,
        });

        if (["PENDING", "NEW"].includes(lead.status)) {
            lead.status = "FOLLOW_UP";
        }

        refreshNextFollowUp(lead);
        await lead.save();

        const added = lead.followUps[lead.followUps.length - 1];
        notifyFollowUpScheduled(lead, added).catch((err) => {
            console.error("notifyFollowUpScheduled failed:", err.message);
        });

        const populated = await populateLead(Lead.findById(lead._id));

        res.status(201).json({
            success: true,
            message: "Follow-up added successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const updateFollowUp = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.followUpId)) {
            return res.status(400).json({ success: false, message: "Invalid follow-up ID format" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const followUp = lead.followUps.id(req.params.followUpId);
        if (!followUp) {
            return res.status(404).json({ success: false, message: "Follow-up not found" });
        }

        const payload = parseFollowUpPayload(req.body);
        followUp.followUpDate = payload.followUpDate;
        followUp.followUpTime = payload.followUpTime;
        followUp.reason = payload.reason;
        followUp.updatedBy = req.user._id;

        refreshNextFollowUp(lead);
        await lead.save();

        const populated = await populateLead(Lead.findById(lead._id));

        res.status(200).json({
            success: true,
            message: "Follow-up updated successfully",
            data: populated,
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const deleteFollowUp = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID format" });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.followUpId)) {
            return res.status(400).json({ success: false, message: "Invalid follow-up ID format" });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const followUp = lead.followUps.id(req.params.followUpId);
        if (!followUp) {
            return res.status(404).json({ success: false, message: "Follow-up not found" });
        }

        followUp.deleteOne();
        refreshNextFollowUp(lead);
        await lead.save();

        const populated = await populateLead(Lead.findById(lead._id));

        res.status(200).json({
            success: true,
            message: "Follow-up deleted successfully",
            data: populated,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Normalize mobile to last 10 digits for grouping repeat customers.
 */
const normalizeMobileKey = (mobile) => {
    const digits = String(mobile || "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.length > 10 ? digits.slice(-10) : digits;
};

/**
 * Soft duplicate hint while creating a lead — never blocks create.
 * Matches: same mobile, same email, or same pickup+drop (+ optional travel date).
 * @route GET /api/v1/admin/leads/similar
 */
const checkSimilarLeads = async (req, res, next) => {
    try {
        const {
            mobileNumber,
            email,
            pickupLocation,
            dropLocation,
            travelDate,
            excludeId,
        } = req.query;

        const select =
            "leadId customerName mobileNumber email status travelDate pickupTime pickupLocation dropLocation createdAt";
        const byId = new Map();

        const addMatch = (lead, reason) => {
            if (!lead) return;
            const id = String(lead._id);
            if (excludeId && mongoose.Types.ObjectId.isValid(excludeId) && id === String(excludeId)) {
                return;
            }
            let row = byId.get(id);
            if (!row) {
                row = {
                    _id: lead._id,
                    leadId: lead.leadId,
                    customerName: lead.customerName,
                    mobileNumber: lead.mobileNumber,
                    email: lead.email || "",
                    status: lead.status,
                    travelDate: lead.travelDate,
                    pickupTime: lead.pickupTime,
                    pickupLocation: lead.pickupLocation,
                    dropLocation: lead.dropLocation,
                    createdAt: lead.createdAt,
                    matchedOn: [],
                };
                byId.set(id, row);
            }
            if (!row.matchedOn.includes(reason)) row.matchedOn.push(reason);
        };

        const mobileKey = normalizeMobileKey(mobileNumber);
        if (mobileKey.length >= 8) {
            const mobileRe = new RegExp(`${escapeRegex(mobileKey)}$`);
            const rows = await Lead.find({ mobileNumber: mobileRe })
                .select(select)
                .sort({ createdAt: -1 })
                .limit(25)
                .lean();
            for (const lead of rows) {
                if (normalizeMobileKey(lead.mobileNumber) === mobileKey) {
                    addMatch(lead, "mobile");
                }
            }
        }

        const emailKey = String(email || "")
            .trim()
            .toLowerCase();
        if (emailKey.includes("@")) {
            const rows = await Lead.find({ email: emailKey })
                .select(select)
                .sort({ createdAt: -1 })
                .limit(15)
                .lean();
            for (const lead of rows) addMatch(lead, "email");
        }

        const pickup = String(pickupLocation || "").trim();
        const drop = String(dropLocation || "").trim();
        if (pickup.length >= 3 && drop.length >= 3) {
            const filter = {
                pickupLocation: new RegExp(`^${escapeRegex(pickup)}$`, "i"),
                dropLocation: new RegExp(`^${escapeRegex(drop)}$`, "i"),
            };
            let reason = "route";
            if (travelDate) {
                const d = new Date(travelDate);
                if (!Number.isNaN(d.getTime())) {
                    const start = new Date(d);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(d);
                    end.setHours(23, 59, 59, 999);
                    filter.travelDate = { $gte: start, $lte: end };
                    reason = "route_date";
                }
            }
            const rows = await Lead.find(filter)
                .select(select)
                .sort({ createdAt: -1 })
                .limit(15)
                .lean();
            for (const lead of rows) addMatch(lead, reason);
        }

        const matches = [...byId.values()].slice(0, 12);
        const reasons = [...new Set(matches.flatMap((m) => m.matchedOn))];

        res.status(200).json({
            success: true,
            data: {
                hasMatches: matches.length > 0,
                reasons,
                matches,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unique customers by mobile + trip stats.
 * @route GET /api/v1/admin/leads/repeat-customers
 */
const listRepeatCustomers = async (req, res, next) => {
    try {
        const {
            search,
            minTrips: minTripsRaw,
            page: pageRaw,
            limit: limitRaw,
            sort = "lastTravelDate:desc",
        } = req.query;
        const page = Math.max(1, parseInt(pageRaw, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));
        const minTrips = Math.max(1, parseInt(minTripsRaw, 10) || 1);

        const leads = await Lead.find({})
            .select(
                "leadId customerName mobileNumber email status travelDate pickupLocation dropLocation grandTotal advancePaid createdAt updatedAt"
            )
            .sort({ createdAt: -1 })
            .lean();

        const map = new Map();
        for (const lead of leads) {
            const key = normalizeMobileKey(lead.mobileNumber);
            if (!key) continue;
            let row = map.get(key);
            if (!row) {
                row = {
                    mobileKey: key,
                    mobileNumber: lead.mobileNumber,
                    customerName: lead.customerName || "",
                    email: lead.email || "",
                    totalTrips: 0,
                    completedTrips: 0,
                    confirmedOrBeyond: 0,
                    lostTrips: 0,
                    totalSpend: 0,
                    lastTravelDate: null,
                    lastLeadId: null,
                    lastLeadMongoId: null,
                    lastStatus: null,
                    lastPickup: "",
                    lastDrop: "",
                    firstSeenAt: lead.createdAt,
                };
                map.set(key, row);
            }
            row.totalTrips += 1;
            if (lead.status === "COMPLETED") {
                row.completedTrips += 1;
                row.totalSpend += Number(lead.grandTotal || 0);
            }
            if (lead.status === "LOST") row.lostTrips += 1;
            if (
                [
                    "CONFIRMED",
                    "VENDOR_OFFERED",
                    "VENDOR_ACCEPTED",
                    "DRIVER_ASSIGNED",
                    "TRIP_STARTED",
                    "PAYMENT_PENDING",
                    "COMPLETED",
                ].includes(lead.status)
            ) {
                row.confirmedOrBeyond += 1;
            }
            if (!row.lastTravelDate || new Date(lead.travelDate) > new Date(row.lastTravelDate)) {
                row.lastTravelDate = lead.travelDate;
                row.lastLeadId = lead.leadId;
                row.lastLeadMongoId = lead._id;
                row.lastStatus = lead.status;
                row.lastPickup = lead.pickupLocation || "";
                row.lastDrop = lead.dropLocation || "";
            }
            if (lead.createdAt && (!row.firstSeenAt || new Date(lead.createdAt) < new Date(row.firstSeenAt))) {
                row.firstSeenAt = lead.createdAt;
            }
            // Name/email already set from newest lead when the row was created
        }

        let rows = [...map.values()].filter((r) => r.totalTrips >= minTrips);

        if (search) {
            const q = String(search).trim().toLowerCase();
            const digits = q.replace(/\D/g, "");
            rows = rows.filter(
                (r) =>
                    String(r.customerName || "").toLowerCase().includes(q) ||
                    String(r.email || "").toLowerCase().includes(q) ||
                    String(r.mobileNumber || "").includes(q) ||
                    (digits && r.mobileKey.includes(digits))
            );
        }

        const [sortField, sortDirRaw] = String(sort).split(":");
        const dir = sortDirRaw === "asc" ? 1 : -1;
        const allowedSort = new Set([
            "lastTravelDate",
            "totalTrips",
            "completedTrips",
            "totalSpend",
            "customerName",
        ]);
        const field = allowedSort.has(sortField) ? sortField : "lastTravelDate";
        rows.sort((a, b) => {
            const av = a[field];
            const bv = b[field];
            if (field === "customerName") {
                return String(av || "").localeCompare(String(bv || "")) * dir;
            }
            const an = field.includes("Date") ? new Date(av || 0).getTime() : Number(av || 0);
            const bn = field.includes("Date") ? new Date(bv || 0).getTime() : Number(bv || 0);
            return (an - bn) * dir;
        });

        const total = rows.length;
        const start = (page - 1) * limit;
        const data = rows.slice(start, start + limit).map((r) => ({
            ...r,
            totalSpend: Math.round(Number(r.totalSpend || 0) * 100) / 100,
        }));

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

/**
 * One customer's profile (latest lead for prefill) + all trips.
 * @route GET /api/v1/admin/leads/repeat-customers/:mobile
 */
const getRepeatCustomer = async (req, res, next) => {
    try {
        const key = normalizeMobileKey(req.params.mobile);
        if (!key || key.length < 8) {
            return res.status(400).json({ success: false, message: "Invalid mobile number" });
        }

        const mobileRe = new RegExp(`${key}$`);
        const candidates = await Lead.find({ mobileNumber: mobileRe })
            .select(
                "leadId customerName mobileNumber email leadSource status travelDate pickupTime pickupLocation dropLocation exactPickupLocation exactDropLocation tripType cabType customerRequirements remarks grandTotal advancePaid pendingAmount paymentStatus createdAt"
            )
            .populate("tripType", "name")
            .populate("cabType", "name")
            .sort({ createdAt: -1 })
            .lean();

        const trips = candidates.filter((l) => normalizeMobileKey(l.mobileNumber) === key);
        if (!trips.length) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const latest = trips[0];
        const completed = trips.filter((t) => t.status === "COMPLETED");
        const totalSpend = completed.reduce((s, t) => s + Number(t.grandTotal || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                mobileKey: key,
                mobileNumber: latest.mobileNumber,
                customerName: latest.customerName,
                email: latest.email || "",
                summary: {
                    totalTrips: trips.length,
                    completedTrips: completed.length,
                    lostTrips: trips.filter((t) => t.status === "LOST").length,
                    totalSpend: Math.round(totalSpend * 100) / 100,
                },
                /** Prefill template for new trip (from latest lead) */
                prefill: {
                    customerName: latest.customerName || "",
                    mobileNumber: latest.mobileNumber || "",
                    email: latest.email || "",
                    leadSource: latest.leadSource || "CALLS",
                    pickupLocation: latest.exactPickupLocation || latest.pickupLocation || "",
                    dropLocation: latest.exactDropLocation || latest.dropLocation || "",
                    pickupTime: latest.pickupTime || "",
                    tripType: latest.tripType?._id || latest.tripType || "",
                    cabType: latest.cabType?._id || latest.cabType || "",
                    customerRequirements: latest.customerRequirements || "",
                    remarks: latest.remarks || "",
                },
                trips: trips.map((t) => ({
                    _id: t._id,
                    leadId: t.leadId,
                    status: t.status,
                    travelDate: t.travelDate,
                    pickupTime: t.pickupTime,
                    pickupLocation: t.pickupLocation,
                    dropLocation: t.dropLocation,
                    tripType: t.tripType,
                    cabType: t.cabType,
                    grandTotal: t.grandTotal,
                    advancePaid: t.advancePaid,
                    pendingAmount: t.pendingAmount,
                    paymentStatus: t.paymentStatus,
                    createdAt: t.createdAt,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createLead,
    getLeads,
    getLeadStatusCounts,
    getLeadById,
    updateLead,
    changeLeadStatus,
    cancelLeadBooking,
    listCancelledLeads,
    confirmLead,
    verifyAdvancePayment,
    checkSimilarLeads,
    listRepeatCustomers,
    getRepeatCustomer,
    deleteLead,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
};
