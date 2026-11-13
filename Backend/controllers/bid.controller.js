const mongoose = require("mongoose");
const BidRound = require("../models/BidRound");
const Bid = require("../models/Bid");
const Lead = require("../models/Lead");
const Vendor = require("../models/Vendor");
const Quotation = require("../models/Quotation");
const VendorOffer = require("../models/VendorOffer");
const VendorNotification = require("../models/VendorNotification");
const { generateBidRoundId } = require("../utils/generateBidRoundId");
const { generateOfferId } = require("../utils/generateOfferId");
const { emitToAdmins, emitToVendor, emitToVendors } = require("../utils/socket");
const { notifyAdmins } = require("../services/notification.service");
const { sendTextEmail } = require("../utils/mailer");
const {
    wrapEmail,
    detailRows,
    highlightBox,
    money,
    escapeHtml,
    vendorLoginUrl,
    vendorOffersUrl,
} = require("../utils/emailTemplates");
const { getOrCreateProfile } = require("./companyProfile.controller");

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const BID_TTL_MINUTES = 15;

const populateRound = (query) =>
    query
        .populate("lead", "leadId customerName status assignmentMode")
        .populate("quotation", "quotationId tripAmount gstAmount grandTotal")
        .populate("winningVendor", "vendorId companyName")
        .populate("winningBid")
        .populate("createdBy", "name email");

const populateBid = (query) =>
    query
        .populate("vendor", "vendorId companyName email mobileNumber city")
        .populate("bidRound", "roundId maxBidAmount status expiresAt pickupLocation dropLocation travelDate pickupTime")
        .populate("lead", "leadId status");

const listBidVendors = () =>
    Vendor.find({
        businessModel: "BID",
        status: "ACTIVE",
        documentVerificationStatus: "VERIFIED",
    })
        .select("vendorId companyName email mobileNumber city state")
        .sort({ companyName: 1 });

const expireRoundIfNeeded = async (round) => {
    if (!round || round.status !== "OPEN") return round;
    if (round.expiresAt && new Date(round.expiresAt) > new Date()) return round;

    round.status = "EXPIRED";
    round.closedAt = new Date();
    await round.save();

    await Bid.updateMany(
        { bidRound: round._id, status: "ACTIVE" },
        { $set: { status: "LOST" } }
    );

    const lead = await Lead.findById(round.lead);
    if (lead && String(lead.activeBidRound) === String(round._id) && lead.status === "VENDOR_OFFERED") {
        lead.status = "CONFIRMED";
        lead.activeBidRound = null;
        lead.assignmentMode = undefined;
        await lead.save();
    }

    const bids = await Bid.find({ bidRound: round._id }).select("vendor");
    const vendorIds = bids.map((b) => b.vendor);
    const allBidVendors = await listBidVendors();
    const notifyIds = [...new Set([...vendorIds.map(String), ...allBidVendors.map((v) => String(v._id))])];

    for (const vendorId of notifyIds) {
        await VendorNotification.create({
            vendor: vendorId,
            type: "BID_EXPIRED",
            title: "Bidding ended",
            message: `Bid round ${round.roundId} expired with no winner.`,
            link: "/dashboard/vendor-bids?status=EXPIRED",
            meta: {
                leadMongoId: round.lead,
                bidRoundId: round.roundId,
            },
        }).catch(() => {});
        emitToVendor(vendorId, "bid:expired", { roundId: round.roundId, leadId: round.lead });
    }

    emitToAdmins("bid:expired", { roundId: round.roundId, leadId: round.lead });
    notifyAdmins({
        type: "BID_EXPIRED",
        title: "Bid round expired",
        message: `${round.roundId} ended with no accepted bid.`,
        link: `/dashboard/leads/${round.lead}`,
        meta: { leadMongoId: round.lead, leadId: "" },
    }).catch(() => {});

    return round;
};

const notifyVendorsBidOpened = async ({ round, vendors, brand }) => {
    const travel = new Date(round.travelDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const offersLink = vendorOffersUrl();
    const loginLink = vendorLoginUrl();
    const vendorIds = vendors.map((v) => v._id);

    for (const vendor of vendors) {
        await VendorNotification.create({
            vendor: vendor._id,
            type: "BID_OPENED",
            title: "New trip bid open",
            message: `${round.pickupLocation} → ${round.dropLocation} · max ${money(round.maxBidAmount)} · 15 min`,
            link: "/dashboard/vendor-bids",
            meta: {
                leadMongoId: round.lead,
                bidRoundId: round.roundId,
                amount: round.maxBidAmount,
            },
        }).catch(() => {});

        if (vendor.email) {
            try {
                await sendTextEmail({
                    to: vendor.email,
                    companyName: brand,
                    subject: `New bid ${round.roundId} — max ${money(round.maxBidAmount)}`,
                    text:
                        `Hello ${vendor.companyName},\n\n` +
                        `A new bidding trip is open for 15 minutes.\n` +
                        `Route: ${round.pickupLocation} → ${round.dropLocation}\n` +
                        `Date: ${travel} · ${round.pickupTime}\n` +
                        `Max bid (your payout ask ≤): ${money(round.maxBidAmount)}\n` +
                        `Login: ${loginLink}\nBids: ${offersLink}\n`,
                    html: wrapEmail({
                        companyName: brand,
                        preheader: `Bid open — max ${money(round.maxBidAmount)}`,
                        title: "New trip bidding",
                        greeting: `Hello <strong>${escapeHtml(vendor.companyName)}</strong>,`,
                        bodyHtml:
                            `<p style="margin:0 0 12px;">Place your bid within 15 minutes. Your amount cannot exceed the max bid.</p>` +
                            highlightBox("Max bid amount", money(round.maxBidAmount)) +
                            detailRows([
                                { label: "Round", value: round.roundId },
                                { label: "Pickup", value: round.pickupLocation },
                                { label: "Drop", value: round.dropLocation },
                                { label: "Travel", value: `${travel} · ${round.pickupTime}` },
                                { label: "Cab", value: round.cabTypeName || "—" },
                            ]),
                        ctaLabel: "Open bids",
                        ctaUrl: offersLink,
                    }),
                });
            } catch (e) {
                console.warn("Bid open email failed:", e.message);
            }
        }
    }

    emitToVendors(vendorIds, "bid:opened", {
        roundId: round.roundId,
        id: round._id,
        maxBidAmount: round.maxBidAmount,
        expiresAt: round.expiresAt,
        pickupLocation: round.pickupLocation,
        dropLocation: round.dropLocation,
    });
};

const listBidVendorsApi = async (req, res, next) => {
    try {
        const vendors = await listBidVendors().lean();
        res.status(200).json({ success: true, count: vendors.length, data: vendors });
    } catch (error) {
        next(error);
    }
};

const openBidRound = async (req, res, next) => {
    try {
        const { leadId, maxBidAmount, quotationId, notes } = req.body;
        if (!mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }

        const amount = round2(maxBidAmount);
        if (!Number.isFinite(amount) || amount < 1) {
            return res.status(400).json({ success: false, message: "Enter a valid bid amount (≥ ₹1)" });
        }

        const lead = await Lead.findById(leadId)
            .populate("tripType", "name")
            .populate("cabType", "name");
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

        if (!["CONFIRMED"].includes(lead.status)) {
            return res.status(400).json({
                success: false,
                message: "Lead must be CONFIRMED (no active offer/bid) before opening a bid",
            });
        }

        const activeOffer = await VendorOffer.findOne({
            lead: lead._id,
            status: { $in: ["OFFERED", "ACCEPTED"] },
        });
        if (activeOffer) {
            return res.status(409).json({
                success: false,
                message: "Lead already has an active fixed offer",
            });
        }

        const openRound = await BidRound.findOne({ lead: lead._id, status: "OPEN" });
        if (openRound) {
            await expireRoundIfNeeded(openRound);
            const still = await BidRound.findOne({ lead: lead._id, status: "OPEN" });
            if (still) {
                return res.status(409).json({ success: false, message: "A bid round is already open" });
            }
        }

        let quotation = null;
        if (quotationId && mongoose.Types.ObjectId.isValid(quotationId)) {
            quotation = await Quotation.findById(quotationId);
        } else {
            quotation =
                (await Quotation.findOne({ lead: lead._id, status: "SENT" }).sort({ createdAt: -1 })) ||
                (await Quotation.findOne({ lead: lead._id }).sort({ createdAt: -1 }));
        }
        if (!quotation) {
            return res.status(400).json({
                success: false,
                message: "Create & send quotation first (needed for trip/GST totals)",
            });
        }

        const vendors = await listBidVendors();
        if (!vendors.length) {
            return res.status(400).json({
                success: false,
                message: "No verified BID vendors found. Set vendor business model to Bid first.",
            });
        }

        const roundId = await generateBidRoundId();
        const expiresAt = new Date(Date.now() + BID_TTL_MINUTES * 60 * 1000);

        const round = await BidRound.create({
            roundId,
            lead: lead._id,
            quotation: quotation._id,
            maxBidAmount: amount,
            tripAmount: round2(quotation.tripAmount),
            gstAmount: round2(quotation.gstAmount),
            grandTotal: round2(quotation.grandTotal),
            pickupLocation: lead.pickupLocation,
            dropLocation: lead.dropLocation,
            travelDate: lead.travelDate,
            pickupTime: lead.pickupTime,
            tripTypeName: lead.tripType?.name || quotation.tripTypeName || "",
            cabTypeName: lead.cabType?.name || quotation.cabTypeName || "",
            status: "OPEN",
            openedAt: new Date(),
            expiresAt,
            createdBy: req.user?._id,
            notes: notes ? String(notes).trim() : "",
        });

        lead.status = "VENDOR_OFFERED";
        lead.assignmentMode = "BID";
        lead.activeBidRound = round._id;
        lead.assignedVendor = null;
        lead.activeVendorOffer = null;
        await lead.save();

        const profile = await getOrCreateProfile();
        const brand = profile.companyName || "True Way Taxi";
        await notifyVendorsBidOpened({ round, vendors, brand });

        notifyAdmins({
            type: "BID_OPENED",
            title: "Bid round opened",
            message: `${lead.leadId}: max ${money(amount)} · ${BID_TTL_MINUTES} min · ${vendors.length} vendors notified`,
            link: `/dashboard/leads/${lead._id}`,
            meta: { leadMongoId: lead._id, leadId: lead.leadId },
            excludeUserId: req.user?._id,
        }).catch(() => {});

        emitToAdmins("bid:opened", {
            roundId: round.roundId,
            leadId: lead._id,
            maxBidAmount: amount,
            expiresAt,
        });

        // Auto-expire timer (best-effort; also checked on reads)
        setTimeout(async () => {
            try {
                const fresh = await BidRound.findById(round._id);
                if (fresh) await expireRoundIfNeeded(fresh);
            } catch (e) {
                console.warn("Bid auto-expire failed:", e.message);
            }
        }, BID_TTL_MINUTES * 60 * 1000 + 500);

        const data = await populateRound(BidRound.findById(round._id)).lean();
        res.status(201).json({
            success: true,
            message: `Bid opened for ${BID_TTL_MINUTES} minutes — ${vendors.length} vendors notified`,
            data,
        });
    } catch (error) {
        next(error);
    }
};

const getBidRoundByLead = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }

        let round = await BidRound.findOne({ lead: leadId }).sort({ createdAt: -1 });
        if (round) round = await expireRoundIfNeeded(round);

        const data = round
            ? await populateRound(BidRound.findById(round._id)).lean()
            : null;

        const bids = round
            ? await populateBid(
                  Bid.find({ bidRound: round._id }).sort({ amount: 1, placedAt: 1 })
              ).lean()
            : [];

        res.status(200).json({
            success: true,
            data: {
                round: data,
                bids,
                serverNow: new Date().toISOString(),
                ttlMinutes: BID_TTL_MINUTES,
            },
        });
    } catch (error) {
        next(error);
    }
};

const placeBid = async (req, res, next) => {
    try {
        const { roundId } = req.params;
        const { amount, note } = req.body;
        if (!mongoose.Types.ObjectId.isValid(roundId)) {
            return res.status(400).json({ success: false, message: "Invalid round ID" });
        }

        const bidAmount = round2(amount);
        if (!Number.isFinite(bidAmount) || bidAmount < 1) {
            return res.status(400).json({ success: false, message: "Enter a valid bid amount" });
        }

        let round = await BidRound.findById(roundId);
        if (!round) return res.status(404).json({ success: false, message: "Bid round not found" });
        round = await expireRoundIfNeeded(round);

        if (round.status !== "OPEN") {
            return res.status(400).json({ success: false, message: `Bidding is ${round.status}` });
        }

        if (bidAmount > round.maxBidAmount) {
            return res.status(400).json({
                success: false,
                message: `Bid cannot exceed max amount ${money(round.maxBidAmount)}`,
            });
        }

        const vendor = await Vendor.findById(req.user._id);
        if (!vendor || vendor.businessModel !== "BID") {
            return res.status(403).json({ success: false, message: "Only BID vendors can place bids" });
        }
        if (vendor.status !== "ACTIVE" || vendor.documentVerificationStatus !== "VERIFIED") {
            return res.status(403).json({ success: false, message: "Vendor must be verified and active" });
        }

        let bid = await Bid.findOne({ bidRound: round._id, vendor: vendor._id });
        if (bid && bid.status === "WON") {
            return res.status(400).json({ success: false, message: "You already won this round" });
        }

        if (bid) {
            bid.amount = bidAmount;
            bid.status = "ACTIVE";
            bid.placedAt = new Date();
            bid.note = note ? String(note).trim() : "";
            await bid.save();
        } else {
            bid = await Bid.create({
                bidRound: round._id,
                lead: round.lead,
                vendor: vendor._id,
                amount: bidAmount,
                status: "ACTIVE",
                placedAt: new Date(),
                note: note ? String(note).trim() : "",
            });
        }

        const populated = await populateBid(Bid.findById(bid._id)).lean();

        emitToAdmins("bid:placed", {
            roundId: round.roundId,
            roundMongoId: round._id,
            leadId: round.lead,
            bid: populated,
        });

        notifyAdmins({
            type: "BID_PLACED",
            title: "New bid received",
            message: `${vendor.companyName} bid ${money(bidAmount)} on ${round.roundId}`,
            link: `/dashboard/leads/${round.lead}`,
            meta: { leadMongoId: round.lead, leadId: "" },
        }).catch(() => {});

        res.status(200).json({
            success: true,
            message: "Bid placed",
            data: populated,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "Duplicate bid — try again" });
        }
        next(error);
    }
};

const acceptBid = async (req, res, next) => {
    try {
        const { bidId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(bidId)) {
            return res.status(400).json({ success: false, message: "Invalid bid ID" });
        }

        const bid = await Bid.findById(bidId);
        if (!bid) return res.status(404).json({ success: false, message: "Bid not found" });
        if (bid.status !== "ACTIVE") {
            return res.status(400).json({ success: false, message: "Bid is not active" });
        }

        let round = await BidRound.findById(bid.bidRound);
        if (!round) return res.status(404).json({ success: false, message: "Round not found" });
        round = await expireRoundIfNeeded(round);
        if (round.status !== "OPEN") {
            return res.status(400).json({ success: false, message: `Round is ${round.status}` });
        }

        if (bid.amount > round.maxBidAmount) {
            return res.status(400).json({ success: false, message: "Bid exceeds max amount" });
        }

        const vendor = await Vendor.findById(bid.vendor);
        if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

        const lead = await Lead.findById(round.lead)
            .populate("tripType", "name")
            .populate("cabType", "name");
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

        const tripAmount = round2(round.tripAmount);
        const vendorPayout = round2(bid.amount);
        const companyShareAmount = round2(Math.max(0, tripAmount - vendorPayout));
        const companySharePercent =
            tripAmount > 0 ? round2((companyShareAmount / tripAmount) * 100) : 0;

        const offerId = await generateOfferId();
        const offer = await VendorOffer.create({
            offerId,
            lead: lead._id,
            quotation: round.quotation,
            vendor: vendor._id,
            offerType: "BID",
            bidRound: round._id,
            bidAmount: vendorPayout,
            tripAmount,
            companySharePercent,
            companyShareAmount,
            vendorPayout,
            pickupLocation: round.pickupLocation,
            dropLocation: round.dropLocation,
            travelDate: round.travelDate,
            pickupTime: round.pickupTime,
            tripTypeName: round.tripTypeName,
            cabTypeName: round.cabTypeName,
            status: "ACCEPTED",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            offeredAt: round.openedAt,
            acceptedAt: new Date(),
            createdBy: req.user?._id,
            notes: `Won bid ${round.roundId}`,
        });

        bid.status = "WON";
        await bid.save();
        await Bid.updateMany(
            { bidRound: round._id, _id: { $ne: bid._id }, status: "ACTIVE" },
            { $set: { status: "LOST" } }
        );

        round.status = "CLOSED";
        round.closedAt = new Date();
        round.winningBid = bid._id;
        round.winningVendor = vendor._id;
        round.resultingOffer = offer._id;
        await round.save();

        lead.status = "VENDOR_ACCEPTED";
        lead.assignmentMode = "BID";
        lead.assignedVendor = vendor._id;
        lead.activeVendorOffer = offer._id;
        lead.activeBidRound = round._id;
        await lead.save();

        const losers = await Bid.find({ bidRound: round._id, status: "LOST" }).select("vendor");
        await VendorNotification.create({
            vendor: vendor._id,
            type: "BID_WON",
            title: "Bid accepted — you won",
            message: `Your bid ${money(vendorPayout)} on ${round.roundId} was accepted. Assign driver & car.`,
            link: "/dashboard/vendor-offers",
            meta: {
                leadMongoId: lead._id,
                leadId: lead.leadId,
                bidRoundId: round.roundId,
                amount: vendorPayout,
            },
        }).catch(() => {});

        emitToVendor(vendor._id, "bid:won", {
            roundId: round.roundId,
            offerId: offer.offerId,
            amount: vendorPayout,
            leadId: lead._id,
        });

        for (const loser of losers) {
            await VendorNotification.create({
                vendor: loser.vendor,
                type: "BID_LOST",
                title: "Bid not selected",
                message: `Another vendor won ${round.roundId}.`,
                link: "/dashboard/vendor-bids?status=LOST",
                meta: { leadMongoId: lead._id, bidRoundId: round.roundId },
            }).catch(() => {});
            emitToVendor(loser.vendor, "bid:lost", { roundId: round.roundId, leadId: lead._id });
        }

        if (vendor.email) {
            try {
                const profile = await getOrCreateProfile();
                const brand = profile.companyName || "True Way Taxi";
                await sendTextEmail({
                    to: vendor.email,
                    companyName: brand,
                    subject: `You won bid ${round.roundId} — payout ${money(vendorPayout)}`,
                    text: `Hello ${vendor.companyName}, your bid was accepted. Payout ${money(vendorPayout)}. Assign driver & car from your offers page.`,
                    html: wrapEmail({
                        companyName: brand,
                        title: "Bid accepted",
                        greeting: `Hello <strong>${escapeHtml(vendor.companyName)}</strong>,`,
                        bodyHtml:
                            `<p>Congratulations — your bid was accepted.</p>` +
                            highlightBox("Your payout", money(vendorPayout)) +
                            detailRows([
                                { label: "Offer", value: offer.offerId },
                                { label: "Round", value: round.roundId },
                                { label: "Route", value: `${round.pickupLocation} → ${round.dropLocation}` },
                            ]),
                        ctaLabel: "Assign driver & car",
                        ctaUrl: vendorOffersUrl(),
                    }),
                });
            } catch (e) {
                console.warn("Winner email failed:", e.message);
            }
        }

        notifyAdmins({
            type: "BID_ACCEPTED",
            title: "Bid accepted",
            message: `${vendor.companyName} won ${round.roundId} at ${money(vendorPayout)}`,
            link: `/dashboard/leads/${lead._id}`,
            meta: { leadMongoId: lead._id, leadId: lead.leadId },
            excludeUserId: req.user?._id,
        }).catch(() => {});

        emitToAdmins("bid:accepted", {
            roundId: round.roundId,
            leadId: lead._id,
            vendorId: vendor._id,
            amount: vendorPayout,
            offerId: offer.offerId,
        });

        res.status(200).json({
            success: true,
            message: `Accepted ${vendor.companyName} at ${money(vendorPayout)}`,
            data: {
                round: await populateRound(BidRound.findById(round._id)).lean(),
                offer,
                bid,
            },
        });
    } catch (error) {
        next(error);
    }
};

const cancelBidRound = async (req, res, next) => {
    try {
        const { roundId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(roundId)) {
            return res.status(400).json({ success: false, message: "Invalid round ID" });
        }
        const round = await BidRound.findById(roundId);
        if (!round) return res.status(404).json({ success: false, message: "Round not found" });
        if (round.status !== "OPEN") {
            return res.status(400).json({ success: false, message: "Only open rounds can be cancelled" });
        }

        round.status = "CANCELLED";
        round.closedAt = new Date();
        await round.save();
        await Bid.updateMany(
            { bidRound: round._id, status: "ACTIVE" },
            { $set: { status: "LOST" } }
        );

        const lead = await Lead.findById(round.lead);
        if (lead && String(lead.activeBidRound) === String(round._id)) {
            lead.status = "CONFIRMED";
            lead.activeBidRound = null;
            lead.assignmentMode = undefined;
            await lead.save();
        }

        const vendors = await listBidVendors();
        emitToVendors(
            vendors.map((v) => v._id),
            "bid:expired",
            { roundId: round.roundId, cancelled: true }
        );
        emitToAdmins("bid:expired", { roundId: round.roundId, cancelled: true });

        res.status(200).json({ success: true, message: "Bid round cancelled", data: round });
    } catch (error) {
        next(error);
    }
};

const vendorBidBucket = (round, myBid) => {
    if (round.status === "OPEN") return "OPEN";
    if (myBid?.status === "WON") return "WON";
    if (myBid?.status === "LOST") return "LOST";
    if (round.status === "EXPIRED" || round.status === "CANCELLED") return "EXPIRED";
    if (round.status === "CLOSED") return myBid ? "LOST" : "CLOSED";
    return round.status || "OTHER";
};

const ADMIN_BID_STATUSES = ["OPEN", "CLOSED", "EXPIRED", "CANCELLED"];

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildAdminBidCounts = async () => {
    const counts = { ALL: 0, OPEN: 0, CLOSED: 0, EXPIRED: 0, CANCELLED: 0 };
    const grouped = await BidRound.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    for (const g of grouped) {
        counts.ALL += g.n;
        if (counts[g._id] != null) counts[g._id] = g.n;
    }
    return counts;
};

const expireStaleOpenRounds = async () => {
    const stale = await BidRound.find({
        status: "OPEN",
        expiresAt: { $lte: new Date() },
    }).limit(100);
    for (const round of stale) {
        await expireRoundIfNeeded(round);
    }
};

const adminBidStatusCounts = async (req, res, next) => {
    try {
        await expireStaleOpenRounds();
        const byStatus = await buildAdminBidCounts();
        res.status(200).json({
            success: true,
            data: { total: byStatus.ALL, byStatus },
        });
    } catch (error) {
        next(error);
    }
};

/** Admin: bid rounds with status / amount / search filters + pagination */
const listAdminBidRounds = async (req, res, next) => {
    try {
        await expireStaleOpenRounds();

        const filter = String(req.query.status || "OPEN").toUpperCase();
        const statusFilter = filter === "ALL" || ADMIN_BID_STATUSES.includes(filter) ? filter : "OPEN";

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const search = String(req.query.search || "").trim();
        const minAmount = req.query.minAmount !== undefined && req.query.minAmount !== ""
            ? Number(req.query.minAmount)
            : null;
        const maxAmount = req.query.maxAmount !== undefined && req.query.maxAmount !== ""
            ? Number(req.query.maxAmount)
            : null;

        const sortRaw = String(req.query.sort || "").trim();
        const [sortFieldRaw, sortDirRaw] = sortRaw.includes(":")
            ? sortRaw.split(":")
            : statusFilter === "OPEN"
              ? ["expiresAt", "asc"]
              : ["createdAt", "desc"];
        const sortFieldMap = {
            expiresAt: "expiresAt",
            createdAt: "createdAt",
            maxBidAmount: "maxBidAmount",
            travelDate: "travelDate",
            bidCount: "createdAt",
            roundId: "roundId",
        };
        const sortField = sortFieldMap[sortFieldRaw] || "createdAt";
        const sortDir = sortDirRaw === "asc" ? 1 : -1;

        const query = {};
        if (statusFilter !== "ALL") query.status = statusFilter;

        if (Number.isFinite(minAmount) || Number.isFinite(maxAmount)) {
            query.maxBidAmount = {};
            if (Number.isFinite(minAmount)) query.maxBidAmount.$gte = minAmount;
            if (Number.isFinite(maxAmount)) query.maxBidAmount.$lte = maxAmount;
        }

        if (search) {
            const re = new RegExp(escapeRegex(search), "i");
            query.$or = [
                { roundId: re },
                { pickupLocation: re },
                { dropLocation: re },
                { cabTypeName: re },
                { tripTypeName: re },
            ];
        }

        const total = await BidRound.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const skip = (page - 1) * limit;

        let rounds = await populateRound(
            BidRound.find(query)
                .sort({ [sortField]: sortDir })
                .skip(skip)
                .limit(limit)
        );

        const data = [];
        for (let round of rounds) {
            if (round.status === "OPEN") {
                round = await expireRoundIfNeeded(round);
                if (statusFilter === "OPEN" && round.status !== "OPEN") continue;
                round = await populateRound(BidRound.findById(round._id));
            }
            const bids = await populateBid(
                Bid.find({ bidRound: round._id }).sort({ amount: 1, placedAt: 1 })
            ).lean();
            const obj = round.toObject ? round.toObject() : round;
            data.push({
                ...obj,
                bids,
                bidCount: bids.length,
                lowestBid: bids[0]?.amount ?? null,
                serverNow: new Date().toISOString(),
            });
        }

        const counts = await buildAdminBidCounts();

        res.status(200).json({
            success: true,
            data,
            counts,
            filter: statusFilter,
            page,
            limit,
            total,
            totalPages,
        });
    } catch (error) {
        next(error);
    }
};

/** Vendor bid list with filters: ALL | OPEN | BIDDED | WON | LOST | EXPIRED */
const listOpenBidsForVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.user._id);
        if (!vendor || vendor.businessModel !== "BID") {
            return res.status(200).json({
                success: true,
                data: [],
                counts: { ALL: 0, OPEN: 0, BIDDED: 0, WON: 0, LOST: 0, EXPIRED: 0 },
            });
        }

        const filter = String(req.query.status || "OPEN").toUpperCase();

        const myBids = await Bid.find({ vendor: vendor._id }).lean();
        const myBidByRound = new Map(myBids.map((b) => [String(b.bidRound), b]));

        let openRounds = await BidRound.find({ status: "OPEN" }).sort({ expiresAt: 1 });
        const refreshedOpen = [];
        for (let round of openRounds) {
            round = await expireRoundIfNeeded(round);
            if (round.status === "OPEN") refreshedOpen.push(round);
        }

        const historyIds = myBids.map((b) => b.bidRound).filter(Boolean);
        const historyRounds = historyIds.length
            ? await BidRound.find({
                  _id: { $in: historyIds },
                  status: { $ne: "OPEN" },
              }).sort({ closedAt: -1, updatedAt: -1 })
            : [];

        const byId = new Map();
        for (const round of [...refreshedOpen, ...historyRounds]) {
            byId.set(String(round._id), round.toObject ? round.toObject() : round);
        }

        const allRows = [...byId.values()].map((round) => {
            const myBid = myBidByRound.get(String(round._id)) || null;
            return {
                ...round,
                myBid,
                bucket: vendorBidBucket(round, myBid),
                serverNow: new Date().toISOString(),
            };
        });

        const counts = { ALL: allRows.length, OPEN: 0, BIDDED: 0, WON: 0, LOST: 0, EXPIRED: 0 };
        for (const row of allRows) {
            if (row.bucket === "OPEN") counts.OPEN += 1;
            if (row.myBid) counts.BIDDED += 1;
            if (row.bucket === "WON") counts.WON += 1;
            if (row.bucket === "LOST") counts.LOST += 1;
            if (row.bucket === "EXPIRED") counts.EXPIRED += 1;
        }

        let data = allRows;
        if (filter === "OPEN") data = allRows.filter((r) => r.bucket === "OPEN");
        else if (filter === "BIDDED") data = allRows.filter((r) => r.myBid);
        else if (filter === "WON") data = allRows.filter((r) => r.bucket === "WON");
        else if (filter === "LOST") data = allRows.filter((r) => r.bucket === "LOST");
        else if (filter === "EXPIRED") data = allRows.filter((r) => r.bucket === "EXPIRED");
        else if (filter === "ALL") data = allRows;
        else data = allRows.filter((r) => r.bucket === "OPEN");

        data.sort((a, b) => {
            if (a.bucket === "OPEN" && b.bucket !== "OPEN") return -1;
            if (b.bucket === "OPEN" && a.bucket !== "OPEN") return 1;
            const ae = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
            const be = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
            return ae - be;
        });

        res.status(200).json({ success: true, data, counts, filter });
    } catch (error) {
        next(error);
    }
};

const listVendorNotifications = async (req, res, next) => {
    try {
        const rows = await VendorNotification.find({ vendor: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const unread = await VendorNotification.countDocuments({
            vendor: req.user._id,
            isRead: false,
        });
        res.status(200).json({ success: true, data: rows, unread });
    } catch (error) {
        next(error);
    }
};

const markVendorNotificationsRead = async (req, res, next) => {
    try {
        await VendorNotification.updateMany(
            { vendor: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ success: true, message: "Marked read" });
    } catch (error) {
        next(error);
    }
};

const markVendorNotificationRead = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid notification ID" });
        }
        const row = await VendorNotification.findOneAndUpdate(
            { _id: req.params.id, vendor: req.user._id },
            { $set: { isRead: true } },
            { new: true }
        ).lean();
        if (!row) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }
        res.status(200).json({ success: true, data: row });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listBidVendorsApi,
    listAdminBidRounds,
    adminBidStatusCounts,
    openBidRound,
    getBidRoundByLead,
    placeBid,
    acceptBid,
    cancelBidRound,
    listOpenBidsForVendor,
    listVendorNotifications,
    markVendorNotificationsRead,
    markVendorNotificationRead,
    BID_TTL_MINUTES,
    ADMIN_BID_STATUSES,
};
