const mongoose = require("mongoose");
const VendorOffer = require("../models/VendorOffer");
const Lead = require("../models/Lead");
const Vendor = require("../models/Vendor");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Quotation = require("../models/Quotation");
const { generateOfferId, generatePickupCode } = require("../utils/generateOfferId");
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
const OFFER_TTL_MINUTES = 60;

const populateOffer = (query) =>
    query
        .populate("lead", "leadId customerName mobileNumber email status pickupLocation dropLocation travelDate pickupTime")
        .populate("quotation", "quotationId tripAmount gstPercent grandTotal status")
        .populate("vendor", "vendorId companyName email mobileNumber businessModel companySharePercent")
        .populate("assignedDriver", "driverId name mobileNumber")
            .populate("assignedVehicle", "vehicleId vehicleNumber")
        .populate("createdBy", "name email");

const expireIfNeeded = async (offer) => {
    if (offer.status === "OFFERED" && offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
        offer.status = "EXPIRED";
        await offer.save();
        const lead = await Lead.findById(offer.lead);
        if (lead && String(lead.activeVendorOffer) === String(offer._id) && lead.status === "VENDOR_OFFERED") {
            lead.status = "CONFIRMED";
            lead.activeVendorOffer = null;
            await lead.save();
        }
    }
    return offer;
};

/** Strip client PII unless released; hide company cut math from vendor UI */
const sanitizeOfferForVendor = (offerDoc) => {
    const o = offerDoc.toObject ? offerDoc.toObject() : { ...offerDoc };
    const released = Boolean(o.clientDetailsReleased);

    // Vendor should only see net payout, not trip − company % breakdown
    delete o.tripAmount;
    delete o.companySharePercent;
    delete o.companyShareAmount;
    if (o.quotation && typeof o.quotation === "object") {
        o.quotation = {
            _id: o.quotation._id,
            quotationId: o.quotation.quotationId,
            status: o.quotation.status,
        };
    }

    if (!released) {
        if (o.lead && typeof o.lead === "object") {
            o.lead = {
                _id: o.lead._id,
                leadId: o.lead.leadId,
                status: o.lead.status,
                pickupLocation: o.pickupLocation || o.lead.pickupLocation,
                dropLocation: o.dropLocation || o.lead.dropLocation,
                travelDate: o.travelDate || o.lead.travelDate,
                pickupTime: o.pickupTime || o.lead.pickupTime,
            };
        }
        o.customerName = undefined;
        o.customerPhone = undefined;
        o.customerEmail = undefined;
        o.pickupCode = undefined;
    } else {
        o.customerName = o.lead?.customerName || null;
        o.customerPhone = o.lead?.mobileNumber || null;
        o.customerEmail = o.lead?.email || null;
    }
    return o;
};

const listFixedVendors = async (req, res, next) => {
    try {
        const vendors = await Vendor.find({
            businessModel: "FIXED",
            status: "ACTIVE",
            documentVerificationStatus: "VERIFIED",
            companySharePercent: { $ne: null },
        })
            .select("vendorId companyName email mobileNumber companySharePercent city state")
            .sort({ companyName: 1 })
            .lean();

        res.status(200).json({ success: true, data: vendors });
    } catch (error) {
        next(error);
    }
};

const createFixedOffer = async (req, res, next) => {
    try {
        const { leadId, vendorId, quotationId, notes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(leadId) || !mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: "Invalid lead or vendor ID" });
        }

        const lead = await Lead.findById(leadId)
            .populate("tripType", "name")
            .populate("cabType", "name");
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

        if (!["CONFIRMED", "VENDOR_OFFERED"].includes(lead.status)) {
            return res.status(400).json({
                success: false,
                message: "Lead must be CONFIRMED before assigning a fixed vendor",
            });
        }

        const active = await VendorOffer.findOne({
            lead: lead._id,
            status: { $in: ["OFFERED", "ACCEPTED"] },
        });
        if (active) {
            return res.status(409).json({
                success: false,
                message: `Lead already has an active offer (${active.offerId})`,
            });
        }

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
        if (vendor.businessModel !== "FIXED") {
            return res.status(400).json({ success: false, message: "Only FIXED vendors can be assigned here" });
        }
        if (vendor.status !== "ACTIVE" || vendor.documentVerificationStatus !== "VERIFIED") {
            return res.status(400).json({ success: false, message: "Vendor must be verified and active" });
        }
        if (vendor.companySharePercent == null) {
            return res.status(400).json({
                success: false,
                message: "Vendor has no company share % set",
            });
        }

        let quotation = null;
        if (quotationId && mongoose.Types.ObjectId.isValid(quotationId)) {
            quotation = await Quotation.findById(quotationId);
        } else {
            quotation = await Quotation.findOne({ lead: lead._id, status: "SENT" }).sort({ createdAt: -1 });
            if (!quotation) {
                quotation = await Quotation.findOne({ lead: lead._id }).sort({ createdAt: -1 });
            }
        }
        if (!quotation) {
            return res.status(400).json({
                success: false,
                message: "Create and send a client quotation first",
            });
        }

        const tripAmount = round2(quotation.tripAmount);
        const companySharePercent = round2(vendor.companySharePercent);
        const companyShareAmount = round2((tripAmount * companySharePercent) / 100);
        const vendorPayout = round2(tripAmount - companyShareAmount);

        const offerId = await generateOfferId();
        const expiresAt = new Date(Date.now() + OFFER_TTL_MINUTES * 60 * 1000);

        const offer = await VendorOffer.create({
            offerId,
            lead: lead._id,
            quotation: quotation._id,
            vendor: vendor._id,
            offerType: "FIXED",
            tripAmount,
            companySharePercent,
            companyShareAmount,
            vendorPayout,
            pickupLocation: lead.pickupLocation,
            dropLocation: lead.dropLocation,
            travelDate: lead.travelDate,
            pickupTime: lead.pickupTime,
            tripTypeName: lead.tripType?.name || quotation.tripTypeName || "",
            cabTypeName: lead.cabType?.name || quotation.cabTypeName || "",
            status: "OFFERED",
            expiresAt,
            offeredAt: new Date(),
            createdBy: req.user?._id,
            notes: notes ? String(notes).trim() : "",
        });

        lead.status = "VENDOR_OFFERED";
        lead.assignmentMode = "FIXED";
        lead.activeVendorOffer = offer._id;
        lead.assignedVendor = vendor._id;
        lead.activeBidRound = null;
        await lead.save();

        // Notify vendor by email (trip only, no client PII / no % breakdown)
        if (vendor.email) {
            try {
                const profile = await getOrCreateProfile();
                const brand = profile.companyName || "True Way Taxi";
                const travel = new Date(lead.travelDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                });
                const offersLink = vendorOffersUrl();
                const loginLink = vendorLoginUrl();
                const subject = `New trip offer ${offerId} — payout ${money(vendorPayout)}`;
                const text =
                    `Hello ${vendor.companyName},\n\n` +
                    `You have a new trip offer from ${brand}.\n\n` +
                    `Offer: ${offerId}\n` +
                    `Route: ${lead.pickupLocation} → ${lead.dropLocation}\n` +
                    `Date: ${travel} · Time: ${lead.pickupTime}\n` +
                    `Your payout: ${money(vendorPayout)}\n` +
                    `Expires in ${OFFER_TTL_MINUTES} minutes.\n\n` +
                    `Login: ${loginLink}\n` +
                    `Open offers: ${offersLink}\n`;
                const html = wrapEmail({
                    companyName: brand,
                    preheader: `New trip offer — payout ${money(vendorPayout)}`,
                    title: "New trip offer",
                    greeting: `Hello <strong>${escapeHtml(vendor.companyName)}</strong>,`,
                    bodyHtml:
                        `<p style="margin:0 0 12px;">You have a new trip offer. Please review and accept from your vendor account.</p>` +
                        highlightBox("Your payout", money(vendorPayout)) +
                        detailRows([
                            { label: "Offer ID", value: offerId },
                            { label: "Pickup", value: lead.pickupLocation },
                            { label: "Drop", value: lead.dropLocation },
                            { label: "Travel date", value: travel },
                            { label: "Pickup time", value: lead.pickupTime },
                            { label: "Cab", value: offer.cabTypeName || "—" },
                            { label: "Trip type", value: offer.tripTypeName || "—" },
                            { label: "Expires in", value: `${OFFER_TTL_MINUTES} minutes` },
                        ]) +
                        `<p style="margin:16px 0 0;color:#64748B;font-size:13px;">Client contact details are shared only after you accept and a driver is assigned.</p>` +
                        `<p style="margin:12px 0 0;font-size:13px;">Login: <a href="${loginLink}" style="color:#0B3A6E;">${loginLink}</a></p>`,
                    ctaLabel: "Open trip offers",
                    ctaUrl: offersLink,
                });
                await sendTextEmail({
                    to: vendor.email,
                    companyName: brand,
                    subject,
                    text,
                    html,
                });
            } catch (mailErr) {
                console.warn("Vendor offer email failed:", mailErr.message);
            }
        }

        const data = await populateOffer(VendorOffer.findById(offer._id)).lean();
        res.status(201).json({
            success: true,
            message: `Offer ${offerId} sent to ${vendor.companyName}`,
            data,
        });
    } catch (error) {
        next(error);
    }
};

const getOffersByLead = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }
        const rows = await populateOffer(
            VendorOffer.find({ lead: leadId }).sort({ createdAt: -1 })
        );
        for (const row of rows) await expireIfNeeded(row);
        const fresh = await populateOffer(
            VendorOffer.find({ lead: leadId }).sort({ createdAt: -1 })
        ).lean();
        res.status(200).json({ success: true, data: fresh });
    } catch (error) {
        next(error);
    }
};

const getOfferByIdAdmin = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid offer ID" });
        }
        let offer = await populateOffer(VendorOffer.findById(req.params.id));
        if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        offer = await expireIfNeeded(offer);
        res.status(200).json({ success: true, data: offer });
    } catch (error) {
        next(error);
    }
};

const cancelOffer = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid offer ID" });
        }
        const offer = await VendorOffer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        if (!["OFFERED"].includes(offer.status)) {
            return res.status(400).json({ success: false, message: "Only offered trips can be cancelled" });
        }
        offer.status = "CANCELLED";
        await offer.save();

        const lead = await Lead.findById(offer.lead);
        if (lead && String(lead.activeVendorOffer) === String(offer._id)) {
            lead.status = "CONFIRMED";
            lead.activeVendorOffer = null;
            lead.assignedVendor = null;
            await lead.save();
        }

        res.status(200).json({ success: true, message: "Offer cancelled", data: offer });
    } catch (error) {
        next(error);
    }
};

const assignDriver = async (req, res, next) => {
    try {
        const isVendorUser = req.accountRole === "VENDOR" || req.user?.userType === "VENDOR";
        if (isVendorUser) {
            return res.status(403).json({
                success: false,
                message: "Only admin / staff can assign drivers",
                code: "FORBIDDEN",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid offer ID" });
        }
        const { driverId, vehicleId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ success: false, message: "Driver is required" });
        }
        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({ success: false, message: "Car / vehicle is required" });
        }

        const offer = await VendorOffer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });

        if (offer.status !== "ACCEPTED") {
            return res.status(400).json({
                success: false,
                message: "Vendor must accept the offer first, then assign driver and car",
            });
        }

        const lead = await Lead.findById(offer.lead);
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

        if (
            ["TRIP_STARTED", "PAYMENT_PENDING", "COMPLETED", "LOST", "CANCELLED"].includes(lead.status)
        ) {
            return res.status(400).json({
                success: false,
                message: `Cannot assign driver when lead is ${lead.status}`,
            });
        }

        const isReassign = Boolean(offer.assignedDriver);
        if (isReassign && lead.status !== "DRIVER_ASSIGNED") {
            return res.status(400).json({
                success: false,
                message: "Driver can only be reassigned before the trip starts",
            });
        }
        if (!isReassign && !["VENDOR_ACCEPTED", "DRIVER_ASSIGNED"].includes(lead.status)) {
            return res.status(400).json({
                success: false,
                message: "Vendor must accept the offer before driver assignment",
            });
        }

        const driver = await Driver.findById(driverId);
        if (!driver || driver.status !== "ACTIVE") {
            return res.status(400).json({ success: false, message: "Active driver not found" });
        }
        if (driver.documentVerificationStatus && driver.documentVerificationStatus !== "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Driver KYC must be verified before assignment",
            });
        }
        if (String(driver.assignedVendor) !== String(offer.vendor)) {
            return res.status(400).json({
                success: false,
                message: "Select a driver from the assigned vendor's fleet",
            });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle || vehicle.status !== "ACTIVE") {
            return res.status(400).json({ success: false, message: "Active vehicle not found" });
        }
        if (String(vehicle.vendor) !== String(offer.vendor)) {
            return res.status(400).json({
                success: false,
                message: "Select a car from the assigned vendor's fleet",
            });
        }

        const pickupCode = isReassign && offer.pickupCode ? offer.pickupCode : generatePickupCode();
        offer.assignedDriver = driver._id;
        offer.assignedVehicle = vehicle._id;
        offer.driverAssignedAt = new Date();
        offer.pickupCode = pickupCode;
        offer.clientDetailsReleased = true;
        await offer.save();

        lead.status = "DRIVER_ASSIGNED";
        lead.assignedDriver = driver._id;
        lead.assignedVehicle = vehicle._id;
        lead.pickupCode = pickupCode;
        try {
            const { syncAmountsFromQuotation } = require("./trip.controller");
            await syncAmountsFromQuotation(lead);
        } catch (_) {
            /* ignore */
        }
        await lead.save();

        const vendor = await Vendor.findById(offer.vendor);
        const profile = await getOrCreateProfile();

        const brand = profile.companyName || "True Way Taxi";
        const travelStr = new Date(lead.travelDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
        const offersLink = vendorOffersUrl();
        const loginLink = vendorLoginUrl();
        const assignLabel = isReassign ? "Driver reassigned" : "Driver assigned";

        if (vendor?.email) {
            try {
                const subject = `${assignLabel} · Pickup code ${pickupCode}`;
                const text =
                    `Hello ${vendor.companyName},\n\n` +
                    `${assignLabel} for offer ${offer.offerId}.\n` +
                    `Pickup code: ${pickupCode}\n` +
                    `Driver: ${driver.name} (${driver.mobileNumber})\n` +
                    `Client: ${lead.customerName} · ${lead.mobileNumber}\n` +
                    `Login: ${loginLink}\nOffers: ${offersLink}\n`;
                const html = wrapEmail({
                    companyName: brand,
                    preheader: `Pickup code ${pickupCode} — client details released`,
                    title: assignLabel,
                    greeting: `Hello <strong>${escapeHtml(vendor.companyName)}</strong>,`,
                    bodyHtml:
                        `<p style="margin:0 0 12px;">${
                            isReassign
                                ? "The driver for this trip has been updated. Client details remain available."
                                : "A driver has been assigned. Client details are now available."
                        }</p>` +
                        highlightBox("Pickup code", pickupCode) +
                        detailRows([
                            { label: "Offer ID", value: offer.offerId },
                            { label: "Driver", value: `${driver.name} · ${driver.mobileNumber}` },
                            vehicle
                                ? {
                                      label: "Vehicle",
                                      value: vehicle.vehicleNumber || vehicle.vehicleId,
                                  }
                                : null,
                            { label: "Client name", value: lead.customerName },
                            { label: "Client phone", value: lead.mobileNumber },
                            { label: "Client email", value: lead.email || "—" },
                            { label: "Pickup", value: lead.pickupLocation },
                            { label: "Drop", value: lead.dropLocation },
                            { label: "Date / time", value: `${travelStr} · ${lead.pickupTime}` },
                            { label: "Your payout", value: money(offer.vendorPayout) },
                        ]) +
                        `<p style="margin:16px 0 0;color:#64748B;font-size:13px;">Share the pickup code only with the correct customer at pickup.</p>` +
                        `<p style="margin:12px 0 0;font-size:13px;">Login: <a href="${loginLink}" style="color:#0B3A6E;">${loginLink}</a></p>`,
                    ctaLabel: "Open trip offers",
                    ctaUrl: offersLink,
                });
                await sendTextEmail({
                    to: vendor.email,
                    companyName: brand,
                    subject,
                    text,
                    html,
                });
            } catch (e) {
                console.warn("Vendor client-details email failed:", e.message);
            }
        }

        if (lead.email) {
            try {
                const subject = isReassign
                    ? `Your driver has been updated`
                    : `Your trip is ready — driver details`;
                const text =
                    `Hello ${lead.customerName},\n\n` +
                    (isReassign
                        ? `Your driver has been updated.\n`
                        : `Your driver has been assigned.\n`) +
                    `Driver: ${driver.name}\nPhone: ${driver.mobileNumber}\n` +
                    `Pickup code: ${pickupCode}\n` +
                    `Route: ${lead.pickupLocation} → ${lead.dropLocation}\n`;
                const html = wrapEmail({
                    companyName: brand,
                    preheader: `${assignLabel} · pickup code ${pickupCode}`,
                    title: isReassign ? "Driver updated" : "Your trip is ready",
                    greeting: `Hello <strong>${escapeHtml(lead.customerName)}</strong>,`,
                    bodyHtml:
                        `<p style="margin:0 0 12px;">${
                            isReassign
                                ? "Your driver has been changed. Please use the same pickup code."
                                : "A driver has been assigned for your trip. Please keep the pickup code ready."
                        }</p>` +
                        highlightBox("Pickup code", pickupCode) +
                        detailRows([
                            { label: "Driver", value: driver.name },
                            { label: "Driver phone", value: driver.mobileNumber },
                            vehicle
                                ? {
                                      label: "Vehicle",
                                      value: vehicle.vehicleNumber || vehicle.vehicleId,
                                  }
                                : null,
                            { label: "Pickup", value: lead.pickupLocation },
                            { label: "Drop", value: lead.dropLocation },
                            { label: "Date / time", value: `${travelStr} · ${lead.pickupTime}` },
                        ]) +
                        `<p style="margin:16px 0 0;color:#64748B;font-size:13px;">Share this pickup code with the driver when they arrive.</p>`,
                });
                await sendTextEmail({
                    to: lead.email,
                    companyName: brand,
                    subject,
                    text,
                    html,
                });
            } catch (e) {
                console.warn("Client driver-details email failed:", e.message);
            }
        }

        const data = await populateOffer(VendorOffer.findById(offer._id));
        res.status(200).json({
            success: true,
            message: isReassign
                ? "Driver & car reassigned — customer notified"
                : "Driver & car assigned — client details released, customer notified",
            data: data.toObject?.() || data,
        });
    } catch (error) {
        next(error);
    }
};

// ─── Vendor-facing ───────────────────────────────────────────────────────────

const listMyOffers = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = { vendor: req.user._id };
        if (status) filter.status = status;

        const rows = await VendorOffer.find(filter).sort({ createdAt: -1 });
        for (const row of rows) await expireIfNeeded(row);

        const fresh = await populateOffer(
            VendorOffer.find(filter).sort({ createdAt: -1 })
        );
        const data = fresh.map((o) => sanitizeOfferForVendor(o));
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const getMyOffer = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid offer ID" });
        }
        let offer = await populateOffer(VendorOffer.findById(req.params.id));
        if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        if (String(offer.vendor._id || offer.vendor) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your offer" });
        }
        offer = await expireIfNeeded(offer);
        res.status(200).json({ success: true, data: sanitizeOfferForVendor(offer) });
    } catch (error) {
        next(error);
    }
};

const acceptOffer = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid offer ID" });
        }
        let offer = await VendorOffer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        if (String(offer.vendor) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your offer" });
        }
        offer = await expireIfNeeded(offer);
        if (offer.status !== "OFFERED") {
            return res.status(400).json({
                success: false,
                message: `Cannot accept offer in ${offer.status} status`,
            });
        }

        offer.status = "ACCEPTED";
        offer.acceptedAt = new Date();
        await offer.save();

        await Lead.findByIdAndUpdate(offer.lead, {
            status: "VENDOR_ACCEPTED",
            assignedVendor: offer.vendor,
            activeVendorOffer: offer._id,
        });

        const data = await populateOffer(VendorOffer.findById(offer._id));
        res.status(200).json({
            success: true,
            message: "Offer accepted. Admin will assign driver and car.",
            data: sanitizeOfferForVendor(data),
        });
    } catch (error) {
        next(error);
    }
};

const rejectOffer = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid offer ID" });
        }
        let offer = await VendorOffer.findById(req.params.id);
        if (!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        if (String(offer.vendor) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "Not your offer" });
        }
        offer = await expireIfNeeded(offer);
        if (offer.status !== "OFFERED") {
            return res.status(400).json({
                success: false,
                message: `Cannot reject offer in ${offer.status} status`,
            });
        }

        offer.status = "REJECTED";
        offer.rejectedAt = new Date();
        offer.rejectReason = String(req.body?.reason || "").trim();
        await offer.save();

        await Lead.findByIdAndUpdate(offer.lead, {
            status: "CONFIRMED",
            activeVendorOffer: null,
            assignedVendor: null,
        });

        res.status(200).json({
            success: true,
            message: "Offer rejected",
            data: sanitizeOfferForVendor(offer),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listFixedVendors,
    createFixedOffer,
    getOffersByLead,
    getOfferByIdAdmin,
    cancelOffer,
    assignDriver,
    listMyOffers,
    getMyOffer,
    acceptOffer,
    rejectOffer,
};
