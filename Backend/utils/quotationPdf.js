const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const quotationDir = path.join(__dirname, "..", "uploads", "quotations");
if (!fs.existsSync(quotationDir)) fs.mkdirSync(quotationDir, { recursive: true });

const NAVY = "#0B3A6E";
const BLUE = "#1d4ed8";
const SLATE = "#1e293b";
const MUTED = "#64748B";
const BORDER = "#94a3b8";
const RED = "#b91c1c";
const LIGHT = "#f8fafc";

const money = (n) =>
    `Rs ${Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const formatDateTime = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const resolveLocalPath = (url) => {
    if (!url) return null;
    const clean = String(url).replace(/^\//, "");
    const abs = path.join(__dirname, "..", clean);
    if (fs.existsSync(abs)) return abs;
    return null;
};

const calcTotalDays = (start, end) => {
    if (!start) return 1;
    const s = new Date(start);
    const e = new Date(end || start);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.floor(Math.max(0, e - s) / 86400000) + 1;
};

const parseUpiIds = (raw) =>
    String(raw || "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

/**
 * Boarding-pass style quotation PDF.
 * @returns {Promise<{ pdfUrl: string, absolutePath: string }>}
 */
const generateQuotationPdf = (quotation) =>
    new Promise((resolve, reject) => {
        try {
            const filename = `${quotation.quotationId}-${Date.now()}.pdf`;
            const absolutePath = path.join(quotationDir, filename);
            const pdfUrl = `/uploads/quotations/${filename}`;

            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 28, bottom: 28, left: 32, right: 32 },
                info: {
                    Title: `Quotation ${quotation.quotationId}`,
                    Author: quotation.company?.companyName || "True Way Taxi",
                },
            });

            const stream = fs.createWriteStream(absolutePath);
            doc.pipe(stream);

            const pageW = doc.page.width;
            const pageH = doc.page.height;
            const left = 32;
            const right = pageW - 32;
            const contentW = right - left;
            const company = quotation.company || {};

            let y = 28;

            // —— Header banner (uploaded) or fallback letterhead ——
            const headerPath = resolveLocalPath(company.quotationHeaderImageUrl);
            if (headerPath) {
                try {
                    const maxH = 150;
                    doc.image(headerPath, left, y, { fit: [contentW, maxH], align: "center" });
                    y += maxH + 8;
                } catch (err) {
                    console.warn("Quotation header image failed:", err.message);
                }
            } else {
                doc.rect(left, y, contentW, 28).fill(NAVY);
                doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11)
                    .text("BOARDING PASS", left + 12, y + 8, { continued: false });
                doc.fillColor("#FFFFFF").font("Helvetica").fontSize(8)
                    .text("FEELING OF ROYAL RIDE", left, y + 10, { width: contentW - 12, align: "right" });
                y += 36;

                const logoPath = resolveLocalPath(company.logoUrl);
                if (logoPath) {
                    try {
                        doc.image(logoPath, left + contentW / 2 - 28, y, { fit: [56, 56], align: "center" });
                        y += 60;
                    } catch {
                        /* ignore */
                    }
                }
                doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(14)
                    .text(company.companyName || "True Way Taxi", left, y, { width: contentW, align: "center" });
                y += 18;
                const addr = [
                    company.addressLine1,
                    company.addressLine2,
                    [company.city, company.state, company.pinCode].filter(Boolean).join(", "),
                ]
                    .filter(Boolean)
                    .join(" · ");
                if (addr) {
                    doc.fillColor(MUTED).font("Helvetica").fontSize(8)
                        .text(addr, left, y, { width: contentW, align: "center" });
                    y += 12;
                }
                if (company.quotationPhone || company.quotationEmail) {
                    doc.fillColor(SLATE).font("Helvetica").fontSize(8)
                        .text(
                            [company.quotationPhone && `Booking: ${company.quotationPhone}`, company.quotationEmail]
                                .filter(Boolean)
                                .join("  |  "),
                            left,
                            y,
                            { width: contentW, align: "center" }
                        );
                    y += 14;
                }
            }

            // Meta row
            doc.moveTo(left, y).lineTo(right, y).dash(2, { space: 2 }).strokeColor(BLUE).lineWidth(0.8).stroke();
            doc.undash();
            y += 8;
            doc.fillColor(SLATE).font("Helvetica").fontSize(8.5)
                .text(`Date & Time: ${formatDateTime(quotation.createdAt || new Date())}`, left, y);
            doc.font("Helvetica-Bold")
                .text(`Booking No: ${quotation.quotationId || "—"}`, left, y, {
                    width: contentW,
                    align: "right",
                });
            y += 16;
            doc.moveTo(left, y).lineTo(right, y).strokeColor(BORDER).lineWidth(0.6).stroke();
            y += 10;

            // —— Ticket detail rows ——
            const travelLabel = quotation.endDate
                ? `${formatDate(quotation.travelDate)} to ${formatDate(quotation.endDate)}`
                : formatDate(quotation.travelDate);
            const totalDays = calcTotalDays(quotation.travelDate, quotation.endDate);
            const schedule =
                quotation.pickupLocation && quotation.dropLocation
                    ? `${quotation.pickupLocation} to ${quotation.dropLocation}`
                    : "—";

            const detailRows = [
                ["Client Name", `${quotation.customerName || "—"}${quotation.mobileNumber ? `  ·  ${quotation.mobileNumber}` : ""}`],
                ["Travelling Date", travelLabel],
                ["Pickup Time", quotation.pickupTime || "—"],
                ["Pickup Address", quotation.pickupLocation || "—"],
                ["Drop Address", quotation.dropLocation || "—"],
                ["Travel Schedule", schedule],
                ["Travel Type", quotation.tripTypeName || "—"],
                ["Total Days", String(totalDays)],
                ["Vehicle Type", quotation.cabTypeName || "—"],
                [
                    "Base Fare",
                    `${money(quotation.tripAmount)}${
                        Number(quotation.gstAmount) > 0
                            ? `  |  GST (${quotation.gstPercent || 0}%): ${money(quotation.gstAmount)}  |  Total: ${money(quotation.grandTotal)}`
                            : `  |  Total: ${money(quotation.grandTotal)}`
                    }`,
                ],
            ];
            if (quotation.notes) {
                detailRows.push(["Special Note", quotation.notes]);
            }

            const labelW = 110;
            detailRows.forEach((row, idx) => {
                const bg = idx % 2 === 0 ? LIGHT : "#FFFFFF";
                const textH = doc.heightOfString(row[1], {
                    width: contentW - labelW - 16,
                    font: "Helvetica",
                    fontSize: 9,
                });
                const rowH = Math.max(22, textH + 10);
                if (y + rowH > pageH - 40) {
                    doc.addPage();
                    y = 36;
                }
                doc.rect(left, y, contentW, rowH).fill(bg);
                doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(8)
                    .text(row[0], left + 8, y + 6, { width: labelW - 4 });
                doc.fillColor(SLATE).font("Helvetica").fontSize(9)
                    .text(row[1], left + labelW, y + 5, { width: contentW - labelW - 12 });
                doc.rect(left, y, contentW, rowH).strokeColor("#e2e8f0").lineWidth(0.4).stroke();
                y += rowH;
            });

            y += 14;

            // —— Payment details ——
            const hasBank =
                company.bankName ||
                company.accountNumber ||
                company.ifsc ||
                company.accountHolderName ||
                company.upiIds ||
                company.paymentQrImageUrl;

            if (hasBank) {
                if (y > pageH - 200) {
                    doc.addPage();
                    y = 36;
                }
                doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11)
                    .text("Company Payment Details", left, y);
                y += 4;
                doc.moveTo(left, y + 12).lineTo(left + 170, y + 12).strokeColor(NAVY).lineWidth(1).stroke();
                y += 18;

                const qrPath = resolveLocalPath(company.paymentQrImageUrl);
                const upis = parseUpiIds(company.upiIds);
                const qrSize = 96;
                const showQrCol = Boolean(qrPath || upis.length);
                const bankW = showQrCol ? contentW - qrSize - 20 : contentW;
                const qrX = right - qrSize;

                const bankRows = [
                    ["Bank Name", company.bankName || "—"],
                    ["Account Number", company.accountNumber || "—"],
                    ["IFSC Code", company.ifsc || "—"],
                    ["Account Holder Name", company.accountHolderName || "—"],
                ];

                let bankY = y;
                bankRows.forEach((row, idx) => {
                    const rh = 20;
                    doc.rect(left, bankY, bankW, rh).fill(idx % 2 === 0 ? LIGHT : "#fff");
                    doc.rect(left, bankY, bankW, rh).strokeColor("#e2e8f0").lineWidth(0.4).stroke();
                    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(row[0], left + 6, bankY + 5, { width: 120 });
                    doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(8.5)
                        .text(row[1], left + 126, bankY + 5, { width: bankW - 132 });
                    bankY += rh;
                });

                let qrBottom = y;
                if (qrPath) {
                    try {
                        doc.roundedRect(qrX - 2, y - 2, qrSize + 4, qrSize + 4, 4)
                            .strokeColor(BORDER).lineWidth(0.8).stroke();
                        doc.image(qrPath, qrX, y, { fit: [qrSize, qrSize] });
                        qrBottom = y + qrSize + 6;
                    } catch (err) {
                        console.warn("Quotation QR failed:", err.message);
                    }
                }

                if (upis.length) {
                    const upiY = qrPath ? qrBottom : y;
                    doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(7.5)
                        .text("UPI ID:", qrX, upiY, { width: qrSize, align: "center" });
                    doc.fillColor(SLATE).font("Helvetica").fontSize(7)
                        .text(upis.join("\n"), qrX, upiY + 11, {
                            width: qrSize,
                            align: "center",
                            lineGap: 1,
                        });
                    qrBottom = upiY + 11 + upis.length * 10 + 4;
                }

                y = Math.max(bankY, qrBottom) + 8;
            }

            if (company.paymentWarningText) {
                if (y > pageH - 60) {
                    doc.addPage();
                    y = 36;
                }
                doc.fillColor(RED).font("Helvetica-Bold").fontSize(8.5)
                    .text(company.paymentWarningText, left, y, { width: contentW, align: "center" });
                y += 24;
            }

            // —— Terms ——
            if (company.termsAndConditions) {
                if (y > pageH - 100) {
                    doc.addPage();
                    y = 36;
                }
                doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11)
                    .text("Terms & Conditions (For Customer)", left, y);
                y += 14;
                doc.fillColor(SLATE).font("Helvetica").fontSize(8)
                    .text(company.termsAndConditions, left, y, {
                        width: contentW,
                        align: "left",
                        lineGap: 2,
                    });
            }

            doc.end();

            stream.on("finish", () => resolve({ pdfUrl, absolutePath }));
            stream.on("error", reject);
        } catch (error) {
            reject(error);
        }
    });

module.exports = { generateQuotationPdf, quotationDir };
