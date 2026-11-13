const path = require("path");
const fs = require("fs");
const multer = require("multer");

const vendorUploadRoot = path.join(__dirname, "..", "uploads", "vendors");
const driverUploadRoot = path.join(__dirname, "..", "uploads", "drivers");
const vehicleUploadRoot = path.join(__dirname, "..", "uploads", "vehicles");
const companyUploadRoot = path.join(__dirname, "..", "uploads", "company");
const employeeUploadRoot = path.join(__dirname, "..", "uploads", "employees");
const leadUploadRoot = path.join(__dirname, "..", "uploads", "leads");
const blogUploadRoot = path.join(__dirname, "..", "uploads", "blogs");
const serviceUploadRoot = path.join(__dirname, "..", "uploads", "services");
const packageUploadRoot = path.join(__dirname, "..", "uploads", "packages");

[vendorUploadRoot, driverUploadRoot, vehicleUploadRoot, companyUploadRoot, employeeUploadRoot, leadUploadRoot, blogUploadRoot, serviceUploadRoot, packageUploadRoot].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const allowedMime = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "application/pdf",
]);

const imageOnlyMime = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
]);

const makeUploader = (dest) =>
    multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, dest),
            filename: (req, file, cb) => {
                const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
                cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
            },
        }),
        limits: { fileSize: 8 * 1024 * 1024, files: 15 },
        fileFilter: (req, file, cb) => {
            if (!allowedMime.has(file.mimetype)) {
                const error = new Error("Only jpg, png, webp, avif, or pdf files are allowed");
                error.status = 400;
                return cb(error);
            }
            cb(null, true);
        },
    });

const makeImageUploader = (dest) =>
    multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, dest),
            filename: (req, file, cb) => {
                const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
                cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024, files: 1 },
        fileFilter: (req, file, cb) => {
            if (!imageOnlyMime.has(file.mimetype)) {
                const error = new Error("Only jpg, png, webp, or avif images are allowed");
                error.status = 400;
                return cb(error);
            }
            cb(null, true);
        },
    });

const makeBlogUploader = (dest) =>
    multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, dest),
            filename: (req, file, cb) => {
                const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
                cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
            },
        }),
        limits: { fileSize: 8 * 1024 * 1024, files: 20 },
        fileFilter: (req, file, cb) => {
            if (!imageOnlyMime.has(file.mimetype)) {
                const error = new Error("Only jpg, png, webp, or avif images are allowed");
                error.status = 400;
                return cb(error);
            }
            cb(null, true);
        },
    });

const vendorUpload = makeUploader(vendorUploadRoot);
const driverUpload = makeUploader(driverUploadRoot);
const vehicleUpload = makeUploader(vehicleUploadRoot);
/** Company profile may send logo + quotation header + payment QR together */
const companyUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, companyUploadRoot),
        filename: (req, file, cb) => {
            const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter: (req, file, cb) => {
        if (!imageOnlyMime.has(file.mimetype)) {
            const error = new Error("Only jpg, png, webp, or avif images are allowed");
            error.status = 400;
            return cb(error);
        }
        cb(null, true);
    },
});
const employeeUpload = makeUploader(employeeUploadRoot);
const leadUpload = makeUploader(leadUploadRoot);
const blogUpload = makeBlogUploader(blogUploadRoot);
const serviceUpload = makeBlogUploader(serviceUploadRoot);
const packageUpload = makeBlogUploader(packageUploadRoot);

const vendorDocFields = [
    { name: "cancelledCheque", maxCount: 1 },
    { name: "aadhaarDocument", maxCount: 1 },
    { name: "panDocument", maxCount: 1 },
    { name: "companyRegistrationDocument", maxCount: 1 },
    { name: "gstCertificate", maxCount: 1 },
    { name: "otherDocuments", maxCount: 10 },
];

const driverDocFields = [
    { name: "aadhaarDocument", maxCount: 1 },
    { name: "drivingLicenceDocument", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "otherDocuments", maxCount: 10 },
];

const vehicleDocFields = [
    { name: "rcDocument", maxCount: 1 },
    { name: "insuranceDocument", maxCount: 1 },
    { name: "pucDocument", maxCount: 1 },
    { name: "fitnessCertificate", maxCount: 1 },
    { name: "permitDocument", maxCount: 1 },
    { name: "vehiclePhoto", maxCount: 1 },
    { name: "otherImages", maxCount: 10 },
];

const wrapUpload = (uploader, fields) => (req, res, next) => {
    uploader.fields(fields)(req, res, (error) => {
        if (!error) return next();
        const message =
            error.code === "LIMIT_FILE_SIZE"
                ? "Each file must be 8 MB or smaller"
                : error.message || "Could not upload documents";
        return res.status(error.status || 400).json({ success: false, message });
    });
};

const receiveVendorDocuments = wrapUpload(vendorUpload, vendorDocFields);
const receiveDriverDocuments = wrapUpload(driverUpload, driverDocFields);
const receiveVehicleDocuments = wrapUpload(vehicleUpload, vehicleDocFields);
const receiveCompanyLogo = wrapUpload(companyUpload, [
    { name: "logo", maxCount: 1 },
    { name: "quotationHeaderImage", maxCount: 1 },
    { name: "paymentQrImage", maxCount: 1 },
]);
/** Any number of named docs: documents[0], documents[1], ... + documentNames[] */
const receiveEmployeeDocuments = wrapUpload(employeeUpload, [{ name: "documents", maxCount: 15 }]);
const receiveLeadConfirmDocuments = wrapUpload(leadUpload, [
    { name: "addressProof", maxCount: 1 },
]);
const receiveBlogMedia = wrapUpload(blogUpload, [
    { name: "mainImage", maxCount: 1 },
    { name: "otherImages", maxCount: 12 },
]);
const receiveServiceMedia = wrapUpload(serviceUpload, [
    { name: "mainImage", maxCount: 1 },
    { name: "otherImages", maxCount: 12 },
]);
const receivePackageMedia = wrapUpload(packageUpload, [
    { name: "mainImage", maxCount: 1 },
    { name: "otherImages", maxCount: 12 },
]);

const toDocumentMeta = (file, folder = "vendors") => {
    if (!file) return null;
    return {
        url: `/uploads/${folder}/${file.filename}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
    };
};

const removeLocalFile = (doc) => {
    if (!doc?.url) return;
    const filename = path.basename(doc.url);
    let folder = vendorUploadRoot;
    if (doc.url.includes("/drivers/")) folder = driverUploadRoot;
    else if (doc.url.includes("/vehicles/")) folder = vehicleUploadRoot;
    else if (doc.url.includes("/company/")) folder = companyUploadRoot;
    else if (doc.url.includes("/employees/")) folder = employeeUploadRoot;
    else if (doc.url.includes("/leads/")) folder = leadUploadRoot;
    else if (doc.url.includes("/blogs/")) folder = blogUploadRoot;
    else if (doc.url.includes("/services/")) folder = serviceUploadRoot;
    else if (doc.url.includes("/packages/")) folder = packageUploadRoot;
    fs.promises.unlink(path.join(folder, filename)).catch(() => {});
};

module.exports = {
    receiveVendorDocuments,
    receiveDriverDocuments,
    receiveVehicleDocuments,
    receiveCompanyLogo,
    receiveEmployeeDocuments,
    receiveLeadConfirmDocuments,
    receiveBlogMedia,
    receiveServiceMedia,
    receivePackageMedia,
    toDocumentMeta,
    removeLocalFile,
};
