const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { LEAD_STATUSES } = require("../models/Lead");
const Quotation = require("../models/Quotation");
const VendorOffer = require("../models/VendorOffer");
const { escapeRegex, parsePagination, paginationMeta } = require("../utils/pagination");

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const BILLED_STATUSES = [
    "CONFIRMED",
    "VENDOR_OFFERED",
    "VENDOR_ACCEPTED",
    "DRIVER_ASSIGNED",
    "TRIP_STARTED",
    "PAYMENT_PENDING",
    "COMPLETED",
];

const parseRange = (from, to) => {
    let start = null;
    let end = null;
    if (from) {
        start = new Date(from);
        if (Number.isNaN(start.getTime())) {
            const error = new Error("Invalid from date");
            error.status = 400;
            throw error;
        }
        start.setHours(0, 0, 0, 0);
    }
    if (to) {
        end = new Date(to);
        if (Number.isNaN(end.getTime())) {
            const error = new Error("Invalid to date");
            error.status = 400;
            throw error;
        }
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};

const dateMatch = (field, start, end) => {
    if (!start && !end) return null;
    const m = {};
    if (start) m.$gte = start;
    if (end) m.$lte = end;
    return { [field]: m };
};

const andMatch = (...parts) => {
    const cleaned = parts.filter(Boolean);
    if (!cleaned.length) return {};
    if (cleaned.length === 1) return cleaned[0];
    return { $and: cleaned };
};

/**
 * Overview KPIs for Accounts page
 */
const getAccountsSummary = async (req, res, next) => {
    try {
        const { from, to, vendorId } = req.query;
        const { start, end } = parseRange(from, to);

        if (vendorId && !mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: "Invalid vendor ID" });
        }
        const vendorOid = vendorId ? new mongoose.Types.ObjectId(vendorId) : null;

        const leadCreatedMatch = andMatch(
            dateMatch("createdAt", start, end),
            vendorOid ? { assignedVendor: vendorOid } : null
        );

        // If no confirmedAt yet on older docs, fall back to createdAt window for billed set
        const billedMatchLoose = andMatch(
            { status: { $in: BILLED_STATUSES }, grandTotal: { $gt: 0 } },
            start || end
                ? {
                      $or: [
                          dateMatch("confirmedAt", start, end) || {},
                          {
                              confirmedAt: null,
                              ...(dateMatch("createdAt", start, end) || {}),
                          },
                      ],
                  }
                : null,
            vendorOid ? { assignedVendor: vendorOid } : null
        );

        const completedMatch = andMatch(
            { status: "COMPLETED" },
            dateMatch("tripCompletedAt", start, end) || dateMatch("updatedAt", start, end),
            vendorOid ? { assignedVendor: vendorOid } : null
        );

        const quoteMatch = andMatch(dateMatch("createdAt", start, end));
        const quoteSentMatch = andMatch(
            { status: "SENT" },
            dateMatch("sentAt", start, end) || dateMatch("createdAt", start, end)
        );

        const offerAcceptedMatch = andMatch(
            { status: "ACCEPTED" },
            dateMatch("acceptedAt", start, end) || dateMatch("createdAt", start, end),
            vendorOid ? { vendor: vendorOid } : null
        );

        const [
            leadStatusRows,
            billedAgg,
            completedAgg,
            paymentAgg,
            paymentByMethod,
            paymentByPurpose,
            quotationAgg,
            quotationSentAgg,
            offerAgg,
            offerStatusRows,
        ] = await Promise.all([
            Lead.aggregate([
                { $match: leadCreatedMatch },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            Lead.aggregate([
                { $match: billedMatchLoose },
                {
                    $group: {
                        _id: null,
                        trips: { $sum: 1 },
                        tripAmount: { $sum: "$tripAmount" },
                        gstAmount: { $sum: "$gstAmount" },
                        grandTotal: { $sum: "$grandTotal" },
                        advancePaid: { $sum: "$advancePaid" },
                        pendingAmount: { $sum: "$pendingAmount" },
                    },
                },
            ]),
            Lead.aggregate([
                { $match: completedMatch },
                {
                    $group: {
                        _id: null,
                        trips: { $sum: 1 },
                        tripAmount: { $sum: "$tripAmount" },
                        gstAmount: { $sum: "$gstAmount" },
                        grandTotal: { $sum: "$grandTotal" },
                        collected: { $sum: "$advancePaid" },
                    },
                },
            ]),
            Lead.aggregate([
                { $match: vendorOid ? { assignedVendor: vendorOid } : {} },
                { $unwind: "$payments" },
                {
                    $match: andMatch(
                        { "payments.status": "PAID" },
                        dateMatch("payments.paidAt", start, end)
                    ),
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        amount: { $sum: "$payments.amount" },
                    },
                },
            ]),
            Lead.aggregate([
                { $match: vendorOid ? { assignedVendor: vendorOid } : {} },
                { $unwind: "$payments" },
                {
                    $match: andMatch(
                        { "payments.status": "PAID" },
                        dateMatch("payments.paidAt", start, end)
                    ),
                },
                {
                    $group: {
                        _id: "$payments.method",
                        count: { $sum: 1 },
                        amount: { $sum: "$payments.amount" },
                    },
                },
            ]),
            Lead.aggregate([
                { $match: vendorOid ? { assignedVendor: vendorOid } : {} },
                { $unwind: "$payments" },
                {
                    $match: andMatch(
                        { "payments.status": "PAID" },
                        dateMatch("payments.paidAt", start, end)
                    ),
                },
                {
                    $group: {
                        _id: "$payments.purpose",
                        count: { $sum: 1 },
                        amount: { $sum: "$payments.amount" },
                    },
                },
            ]),
            Quotation.aggregate([
                { $match: quoteMatch },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        tripAmount: { $sum: "$tripAmount" },
                        gstAmount: { $sum: "$gstAmount" },
                        grandTotal: { $sum: "$grandTotal" },
                    },
                },
            ]),
            Quotation.aggregate([
                { $match: quoteSentMatch },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        tripAmount: { $sum: "$tripAmount" },
                        gstAmount: { $sum: "$gstAmount" },
                        grandTotal: { $sum: "$grandTotal" },
                    },
                },
            ]),
            VendorOffer.aggregate([
                { $match: offerAcceptedMatch },
                {
                    $group: {
                        _id: null,
                        offers: { $sum: 1 },
                        tripAmount: { $sum: "$tripAmount" },
                        companyShareAmount: { $sum: "$companyShareAmount" },
                        vendorPayout: { $sum: "$vendorPayout" },
                    },
                },
            ]),
            VendorOffer.aggregate([
                {
                    $match: andMatch(
                        dateMatch("createdAt", start, end),
                        vendorOid ? { vendor: vendorOid } : null
                    ),
                },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        const leadStatusCounts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
        let leadsCreated = 0;
        for (const row of leadStatusRows) {
            const c = Number(row.count) || 0;
            leadsCreated += c;
            if (leadStatusCounts[row._id] !== undefined) leadStatusCounts[row._id] = c;
        }

        const billed = billedAgg[0] || {};
        const completed = completedAgg[0] || {};
        const payments = paymentAgg[0] || {};
        const quotesSent = quotationSentAgg[0] || {};
        const offers = offerAgg[0] || {};

        const quotationByStatus = { DRAFT: { count: 0, tripAmount: 0, gstAmount: 0, grandTotal: 0 }, SENT: { count: 0, tripAmount: 0, gstAmount: 0, grandTotal: 0 } };
        for (const row of quotationAgg) {
            quotationByStatus[row._id] = {
                count: Number(row.count) || 0,
                tripAmount: round2(row.tripAmount),
                gstAmount: round2(row.gstAmount),
                grandTotal: round2(row.grandTotal),
            };
        }

        const offerByStatus = { OFFERED: 0, ACCEPTED: 0, REJECTED: 0, EXPIRED: 0, CANCELLED: 0 };
        for (const row of offerStatusRows) {
            if (offerByStatus[row._id] !== undefined) offerByStatus[row._id] = Number(row.count) || 0;
        }

        const byMethod = { CASH: { count: 0, amount: 0 }, RAZORPAY: { count: 0, amount: 0 }, QR: { count: 0, amount: 0 } };
        for (const row of paymentByMethod) {
            if (byMethod[row._id]) {
                byMethod[row._id] = { count: Number(row.count) || 0, amount: round2(row.amount) };
            }
        }
        const byPurpose = { ADVANCE: { count: 0, amount: 0 }, FINAL: { count: 0, amount: 0 }, OTHER: { count: 0, amount: 0 } };
        for (const row of paymentByPurpose) {
            const key = row._id || "OTHER";
            if (byPurpose[key]) {
                byPurpose[key] = { count: Number(row.count) || 0, amount: round2(row.amount) };
            }
        }

        const companyShare = round2(offers.companyShareAmount);
        const vendorPayout = round2(offers.vendorPayout);
        const gstOnBilled = round2(billed.gstAmount);
        const collected = round2(payments.amount);
        const companyTake = round2(companyShare + gstOnBilled);

        res.status(200).json({
            success: true,
            data: {
                range: { from: start, to: end },
                funnel: {
                    leadsCreated,
                    byStatus: leadStatusCounts,
                    quotationsDraft: quotationByStatus.DRAFT.count,
                    quotationsSent: Number(quotesSent.count) || quotationByStatus.SENT.count,
                    confirmed: leadStatusCounts.CONFIRMED || 0,
                    completed: leadStatusCounts.COMPLETED || 0,
                    lost: leadStatusCounts.LOST || 0,
                    offers: offerByStatus,
                },
                money: {
                    /** Client trip + GST billed on confirmed pipeline */
                    totalBilled: round2(billed.grandTotal),
                    tripAmountBilled: round2(billed.tripAmount),
                    gstBilled: gstOnBilled,
                    advanceRecorded: round2(billed.advancePaid),
                    pendingCollection: round2(billed.pendingAmount),
                    billedTrips: Number(billed.trips) || 0,
                    /** Actual money received (payments[]) */
                    collected,
                    collectionCount: Number(payments.count) || 0,
                    byMethod,
                    byPurpose,
                    /** Option B from accepted offers */
                    companyShare,
                    vendorPayout,
                    /** Company share + GST (what company should retain) */
                    companyTake,
                    acceptedOffers: Number(offers.offers) || 0,
                    completedTrips: Number(completed.trips) || 0,
                    completedRevenue: round2(completed.grandTotal),
                    completedGst: round2(completed.gstAmount),
                },
                quotations: {
                    byStatus: quotationByStatus,
                    sentValue: round2(quotesSent.grandTotal || quotationByStatus.SENT.grandTotal),
                    sentGst: round2(quotesSent.gstAmount || quotationByStatus.SENT.gstAmount),
                },
            },
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const getAccountsNavCounts = async (req, res, next) => {
    try {
        const [trips, paymentsFacet, quotations, payouts] = await Promise.all([
            Lead.countDocuments({ grandTotal: { $gt: 0 }, status: { $in: BILLED_STATUSES } }),
            Lead.aggregate([
                { $unwind: "$payments" },
                { $match: { "payments.status": "PAID" } },
                { $count: "total" },
            ]),
            Quotation.countDocuments({}),
            VendorOffer.countDocuments({ status: "ACCEPTED" }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: trips,
                trips,
                payments: paymentsFacet[0]?.total || 0,
                quotations,
                payouts,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getAccountsTrips = async (req, res, next) => {
    try {
        const {
            from,
            to,
            vendorId,
            status,
            search,
            travelFrom,
            travelTo,
            amountMin,
            amountMax,
            pendingOnly,
            collectedOnly,
            page = 1,
            limit = 10,
            sortBy = "confirmedAt",
            sortOrder = "desc",
        } = req.query;
        const { start, end } = parseRange(from, to);
        const travelRange = parseRange(travelFrom, travelTo);
        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const dateOr = [];
        const confirmedRange = dateMatch("confirmedAt", start, end);
        if (confirmedRange) dateOr.push(confirmedRange);
        if (start || end) {
            dateOr.push(
                andMatch(
                    { $or: [{ confirmedAt: null }, { confirmedAt: { $exists: false } }] },
                    dateMatch("createdAt", start, end)
                )
            );
        }

        const amountFilter = {};
        if (amountMin !== undefined && amountMin !== "") amountFilter.$gte = Number(amountMin);
        if (amountMax !== undefined && amountMax !== "") amountFilter.$lte = Number(amountMax);

        const finalFilter = andMatch(
            { grandTotal: { $gt: 0 } },
            status ? { status } : { status: { $in: BILLED_STATUSES } },
            vendorId && mongoose.Types.ObjectId.isValid(vendorId)
                ? { assignedVendor: vendorId }
                : null,
            dateOr.length ? { $or: dateOr } : null,
            dateMatch("travelDate", travelRange.start, travelRange.end),
            Object.keys(amountFilter).length ? { grandTotal: { $gt: 0, ...amountFilter } } : null,
            pendingOnly === "1" || pendingOnly === "true" ? { pendingAmount: { $gt: 0 } } : null,
            collectedOnly === "1" || collectedOnly === "true" ? { pendingAmount: { $lte: 0 } } : null,
            search
                ? {
                      $or: [
                          { leadId: { $regex: escapeRegex(search), $options: "i" } },
                          { customerName: { $regex: escapeRegex(search), $options: "i" } },
                          { mobileNumber: { $regex: escapeRegex(search), $options: "i" } },
                          { pickupLocation: { $regex: escapeRegex(search), $options: "i" } },
                          { dropLocation: { $regex: escapeRegex(search), $options: "i" } },
                      ],
                  }
                : null
        );

        const allowedSort = new Set([
            "confirmedAt",
            "createdAt",
            "travelDate",
            "grandTotal",
            "pendingAmount",
            "advancePaid",
            "status",
            "leadId",
        ]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, rows] = await Promise.all([
            Lead.countDocuments(finalFilter),
            Lead.find(finalFilter)
                .select(
                    "leadId customerName mobileNumber status travelDate pickupLocation dropLocation tripAmount gstPercent gstAmount grandTotal advancePaid pendingAmount payments confirmedAt tripCompletedAt assignedVendor assignedDriver"
                )
                .populate("assignedVendor", "vendorId companyName")
                .populate("assignedDriver", "driverId name")
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        const leadIds = rows.map((r) => r._id);
        const offers = await VendorOffer.find({
            lead: { $in: leadIds },
            status: "ACCEPTED",
        })
            .select("lead companySharePercent companyShareAmount vendorPayout tripAmount")
            .lean();
        const offerByLead = Object.fromEntries(offers.map((o) => [String(o.lead), o]));

        const data = rows.map((r) => {
            const offer = offerByLead[String(r._id)];
            return {
                ...r,
                companyShareAmount: offer ? round2(offer.companyShareAmount) : 0,
                vendorPayout: offer ? round2(offer.vendorPayout) : 0,
                companySharePercent: offer ? offer.companySharePercent : null,
                companyTake: offer
                    ? round2(Number(offer.companyShareAmount || 0) + Number(r.gstAmount || 0))
                    : round2(r.gstAmount || 0),
            };
        });

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const getAccountsPayments = async (req, res, next) => {
    try {
        const {
            from,
            to,
            vendorId,
            method,
            purpose,
            search,
            page = 1,
            limit = 10,
        } = req.query;
        const { start, end } = parseRange(from, to);
        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const preMatch = vendorId && mongoose.Types.ObjectId.isValid(vendorId)
            ? { assignedVendor: new mongoose.Types.ObjectId(vendorId) }
            : {};

        const afterUnwind = andMatch(
            { "payments.status": "PAID" },
            dateMatch("payments.paidAt", start, end),
            method ? { "payments.method": method } : null,
            purpose ? { "payments.purpose": purpose } : null,
            search
                ? {
                      $or: [
                          { leadId: { $regex: escapeRegex(search), $options: "i" } },
                          { customerName: { $regex: escapeRegex(search), $options: "i" } },
                          { "payments.razorpayPaymentId": { $regex: escapeRegex(search), $options: "i" } },
                          { "payments.reference": { $regex: escapeRegex(search), $options: "i" } },
                      ],
                  }
                : null
        );

        const pipeline = [
            { $match: preMatch },
            { $unwind: "$payments" },
            { $match: afterUnwind },
            { $sort: { "payments.paidAt": -1 } },
            {
                $facet: {
                    meta: [{ $count: "total" }],
                    rows: [
                        { $skip: skip },
                        { $limit: limitNum },
                        {
                            $lookup: {
                                from: "vendors",
                                localField: "assignedVendor",
                                foreignField: "_id",
                                as: "vendorDoc",
                            },
                        },
                        {
                            $project: {
                                leadId: 1,
                                customerName: 1,
                                mobileNumber: 1,
                                status: 1,
                                grandTotal: 1,
                                payment: "$payments",
                                vendor: { $arrayElemAt: ["$vendorDoc", 0] },
                            },
                        },
                    ],
                },
            },
        ];

        const [facet] = await Lead.aggregate(pipeline);
        const total = facet?.meta?.[0]?.total || 0;
        const data = (facet?.rows || []).map((r) => ({
            leadMongoId: r._id,
            leadId: r.leadId,
            customerName: r.customerName,
            mobileNumber: r.mobileNumber,
            leadStatus: r.status,
            grandTotal: r.grandTotal,
            vendor: r.vendor
                ? { _id: r.vendor._id, vendorId: r.vendor.vendorId, companyName: r.vendor.companyName }
                : null,
            ...r.payment,
            amount: round2(r.payment?.amount),
        }));

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const getAccountsQuotations = async (req, res, next) => {
    try {
        const {
            from,
            to,
            status,
            search,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;
        const { start, end } = parseRange(from, to);
        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const filter = andMatch(
            status ? { status } : null,
            status === "SENT"
                ? dateMatch("sentAt", start, end) || dateMatch("createdAt", start, end)
                : dateMatch("createdAt", start, end),
            search
                ? {
                      $or: [
                          { quotationId: { $regex: escapeRegex(search), $options: "i" } },
                          { customerName: { $regex: escapeRegex(search), $options: "i" } },
                          { mobileNumber: { $regex: escapeRegex(search), $options: "i" } },
                      ],
                  }
                : null
        );

        const allowedSort = new Set(["createdAt", "sentAt", "grandTotal", "tripAmount", "gstAmount", "quotationId"]);
        const sortField = allowedSort.has(sortBy) ? sortBy : "createdAt";
        const sortDir = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

        const [total, data] = await Promise.all([
            Quotation.countDocuments(filter),
            Quotation.find(filter)
                .populate("lead", "leadId status")
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const getAccountsVendorPayouts = async (req, res, next) => {
    try {
        const {
            from,
            to,
            vendorId,
            status = "ACCEPTED",
            search,
            page = 1,
            limit = 10,
        } = req.query;
        const { start, end } = parseRange(from, to);
        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const filter = andMatch(
            status ? { status } : null,
            vendorId && mongoose.Types.ObjectId.isValid(vendorId)
                ? { vendor: vendorId }
                : null,
            status === "ACCEPTED"
                ? dateMatch("acceptedAt", start, end) || dateMatch("createdAt", start, end)
                : dateMatch("createdAt", start, end),
            search
                ? {
                      $or: [
                          { offerId: { $regex: escapeRegex(search), $options: "i" } },
                          { pickupLocation: { $regex: escapeRegex(search), $options: "i" } },
                          { dropLocation: { $regex: escapeRegex(search), $options: "i" } },
                      ],
                  }
                : null
        );

        const [total, rows] = await Promise.all([
            VendorOffer.countDocuments(filter),
            VendorOffer.find(filter)
                .populate("vendor", "vendorId companyName")
                .populate("lead", "leadId customerName status grandTotal gstAmount advancePaid pendingAmount")
                .populate("quotation", "quotationId grandTotal gstAmount")
                .sort({ acceptedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        const data = rows.map((o) => ({
            ...o,
            companyTake: round2(
                Number(o.companyShareAmount || 0) + Number(o.lead?.gstAmount || o.quotation?.gstAmount || 0)
            ),
        }));

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        next(error);
    }
};

module.exports = {
    getAccountsSummary,
    getAccountsNavCounts,
    getAccountsTrips,
    getAccountsPayments,
    getAccountsQuotations,
    getAccountsVendorPayouts,
};
