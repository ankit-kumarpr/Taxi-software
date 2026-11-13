const CompanyProfile = require("../models/CompanyProfile");
const { toDocumentMeta, removeLocalFile } = require("../config/upload");

const getOrCreateProfile = async () => {
    let profile = await CompanyProfile.findOne({ key: "default" });
    if (!profile) {
        profile = await CompanyProfile.create({
            key: "default",
            companyName: "True Way Taxi",
            gstPercent: 5,
        });
    }
    return profile;
};

const getCompanyProfile = async (req, res, next) => {
    try {
        const profile = await getOrCreateProfile();
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
};

const updateCompanyProfile = async (req, res, next) => {
    try {
        const profile = await getOrCreateProfile();
        const fields = [
            "companyName",
            "addressLine1",
            "addressLine2",
            "city",
            "state",
            "pinCode",
            "landmark",
            "gstin",
            "quotationPhone",
            "quotationEmail",
            "bankName",
            "accountNumber",
            "ifsc",
            "accountHolderName",
            "upiIds",
            "paymentWarningText",
            "termsAndConditions",
        ];

        fields.forEach((key) => {
            if (req.body[key] !== undefined) {
                profile[key] = String(req.body[key] || "").trim();
            }
        });

        if (req.body.gstPercent !== undefined && req.body.gstPercent !== "") {
            const gst = Number(req.body.gstPercent);
            if (!Number.isFinite(gst) || gst < 0 || gst > 100) {
                return res.status(400).json({
                    success: false,
                    message: "GST % must be between 0 and 100",
                });
            }
            profile.gstPercent = Math.round(gst * 100) / 100;
        }

        if (
            req.body.defaultFixedCompanySharePercent !== undefined &&
            req.body.defaultFixedCompanySharePercent !== ""
        ) {
            const share = Number(req.body.defaultFixedCompanySharePercent);
            if (!Number.isFinite(share) || share < 0 || share > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Default FIXED company share % must be between 0 and 100",
                });
            }
            profile.defaultFixedCompanySharePercent = Math.round(share * 100) / 100;
        }

        if (!profile.companyName) {
            return res.status(400).json({ success: false, message: "Company name is required" });
        }

        const logoFile = req.files?.logo?.[0];
        if (logoFile) {
            if (profile.logo?.url) removeLocalFile(profile.logo);
            profile.logo = toDocumentMeta(logoFile, "company");
        }

        const headerFile = req.files?.quotationHeaderImage?.[0];
        if (headerFile) {
            if (profile.quotationHeaderImage?.url) removeLocalFile(profile.quotationHeaderImage);
            profile.quotationHeaderImage = toDocumentMeta(headerFile, "company");
        }

        const qrFile = req.files?.paymentQrImage?.[0];
        if (qrFile) {
            if (profile.paymentQrImage?.url) removeLocalFile(profile.paymentQrImage);
            profile.paymentQrImage = toDocumentMeta(qrFile, "company");
        }

        profile.updatedBy = req.user?._id || null;
        await profile.save();

        res.status(200).json({
            success: true,
            message: "Company profile saved",
            data: profile,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCompanyProfile,
    updateCompanyProfile,
    getOrCreateProfile,
};
