/** Expected KYC / onboarding documents for a vendor. */
const VENDOR_DOCUMENT_FIELDS = [
    { key: "aadhaarDocument", label: "Aadhaar Document" },
    { key: "panDocument", label: "PAN Document" },
    { key: "cancelledCheque", label: "Cancelled Cheque / Bank Proof" },
    { key: "companyRegistrationDocument", label: "Company Registration" },
    { key: "gstCertificate", label: "GST Certificate" },
];

const hasDocFile = (doc) => Boolean(doc && doc.url);

/**
 * @returns {{ key: string, label: string }[]}
 */
const getPendingVendorDocuments = (vendor) => {
    if (!vendor) return [...VENDOR_DOCUMENT_FIELDS];
    return VENDOR_DOCUMENT_FIELDS.filter((f) => !hasDocFile(vendor[f.key]));
};

const getUploadedVendorDocuments = (vendor) => {
    if (!vendor) return [];
    return VENDOR_DOCUMENT_FIELDS.filter((f) => hasDocFile(vendor[f.key]));
};

module.exports = {
    VENDOR_DOCUMENT_FIELDS,
    getPendingVendorDocuments,
    getUploadedVendorDocuments,
    hasDocFile,
};
