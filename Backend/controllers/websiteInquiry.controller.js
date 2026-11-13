const Lead = require("../models/Lead");
const TripType = require("../models/TripType");
const CarType = require("../models/CarType");
const { generateLeadId } = require("../utils/generateLeadId");
const { notifyNewLead } = require("../services/notification.service");

const assertActiveTripType = async (tripTypeId) => {
    const trip = await TripType.findById(tripTypeId).lean();
    if (!trip || trip.status !== "ACTIVE") {
        const err = new Error("Invalid or inactive trip type");
        err.status = 400;
        throw err;
    }
    return trip;
};

const assertActiveCabType = async (cabTypeId) => {
    const cab = await CarType.findById(cabTypeId).lean();
    if (!cab || cab.status !== "ACTIVE") {
        const err = new Error("Invalid or inactive cab type");
        err.status = 400;
        throw err;
    }
};

const resolveLeadEndDate = (travelDate, endDate, durationType) => {
    if (durationType !== "MULTI_DAY") return null;
    if (!endDate) {
        const err = new Error("End date is required for multi-day trips");
        err.status = 400;
        throw err;
    }
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
        const err = new Error("Invalid end date");
        err.status = 400;
        throw err;
    }
    const start = new Date(travelDate);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (endDay < startDay) {
        const err = new Error("End date cannot be before travel date");
        err.status = 400;
        throw err;
    }
    return end;
};

/** Public dropdown options for website inquiry form */
const getInquiryOptions = async (req, res, next) => {
    try {
        const [tripTypes, cabTypes] = await Promise.all([
            TripType.find({ status: "ACTIVE" })
                .select("name durationType")
                .sort({ name: 1 })
                .lean(),
            CarType.find({ status: "ACTIVE" }).select("name").sort({ name: 1 }).lean(),
        ]);
        res.status(200).json({
            success: true,
            data: { tripTypes, cabTypes },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Public website inquiry → creates a PENDING lead with leadSource=WEBSITE.
 * Does not accept a custom leadSource from the client.
 */
const createWebsiteInquiry = async (req, res, next) => {
    try {
        const {
            customerName,
            mobileNumber,
            email,
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
        const mobileDigits = String(mobileNumber).replace(/\D/g, "");
        if (mobileDigits.length < 10) {
            return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number" });
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
            customerName: String(customerName).trim(),
            mobileNumber: mobileDigits.slice(-10),
            email: email?.trim() ? String(email).toLowerCase().trim() : null,
            leadSource: "WEBSITE",
            pickupLocation: String(pickupLocation).trim(),
            dropLocation: String(dropLocation).trim(),
            travelDate: date,
            endDate: resolvedEndDate,
            pickupTime: String(pickupTime).trim(),
            tripType,
            cabType,
            customerRequirements: customerRequirements ? String(customerRequirements).trim() : "",
            remarks: remarks
                ? String(remarks).trim()
                : "Inquiry submitted from website",
            status: "PENDING",
            createdBy: null,
        });

        notifyNewLead(lead).catch((err) => {
            console.error("notifyNewLead (website) failed:", err.message);
        });

        res.status(201).json({
            success: true,
            message: "Inquiry submitted successfully. Our team will contact you shortly.",
            data: {
                leadId: lead.leadId,
                _id: lead._id,
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
    getInquiryOptions,
    createWebsiteInquiry,
};
