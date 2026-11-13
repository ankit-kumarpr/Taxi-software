const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const invoiceDir = path.join(__dirname, "..", "uploads", "invoices");
if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

const NAVY = "#0B3A6E";
const SLATE = "#1e293b";
const MUTED = "#64748B";
const LIGHT = "#F1F5F9";
const BORDER = "#CBD5E1";
const RED = "#b91c1c";
const ROW_BLUE = "#e8f0fe";

const money = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const resolveLocalPath = (url) => {
    if (!url) return null;
    const clean = String(url).replace(/^\//, "");
    const abs = path.join(__dirname, "..", clean);
    if (fs.existsSync(abs)) return abs;
    return null;
};

const parseUpiIds = (raw) =>
    String(raw || "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n) => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
};

const threeDigits = (n) => {
    if (n < 100) return twoDigits(n);
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ""}`.trim();
};

/** Indian numbering: crore / lakh / thousand */
const amountInWords = (amount) => {
    let n = Math.round(Number(amount) || 0);
    if (n === 0) return "Zero Rupees Only";
    const parts = [];
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const rest = n;
    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
    if (rest) parts.push(threeDigits(rest));
    return `${parts.join(" ")} Rupees Only`;
};

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const splitGst = (gstPercent, gstAmount) => {
    const totalPct = Number(gstPercent) || 0;
    const totalAmt = round2(gstAmount);
    const halfPct = round2(totalPct / 2);
    // Prefer equal split; adjust SGST for 1-paise remainder
    const cgst = round2(totalAmt / 2);
    const sgst = round2(totalAmt - cgst);
    return { halfPct, cgst, sgst, totalAmt, totalPct };
};

const paymentLabel = (payload) => {
    const pending = Number(payload.pendingAmount);
    const status = String(payload.paymentStatus || "").toUpperCase();
    const fullyPaid = status === "PAID" || (Number.isFinite(pending) && pending <= 0);
    if (fullyPaid) {
        const methods = (payload.payments || [])
            .filter((p) => p.status === "PAID")
            .map((p) => String(p.method || "").toLowerCase())
            .filter(Boolean);
        const uniq = [...new Set(methods)];
        return uniq.length ? `Paid (${uniq.join(" / ")})` : "Paid";
    }
    if (status === "PARTIALLY_PAID") return "Partially paid";
    return "Pending";
};

/**
 * Tax invoice PDF — CGST/SGST split (50/50 of GST %).
 * @returns {Promise<{ pdfUrl: string, absolutePath: string }>}
 */
const generateInvoicePdf = (payload) =>
    new Promise((resolve, reject) => {
        try {
            const invoiceId = payload.invoiceId || "DRAFT";
            const filename = `${invoiceId}-${Date.now()}.pdf`;
            const absolutePath = path.join(invoiceDir, filename);
            const pdfUrl = `/uploads/invoices/${filename}`;

            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 28, bottom: 28, left: 36, right: 36 },
                info: {
                    Title: `Invoice ${invoiceId}`,
                    Author: payload.company?.companyName || "True Way Taxi",
                },
            });

            const stream = fs.createWriteStream(absolutePath);
            doc.pipe(stream);

            const pageW = doc.page.width;
            const pageH = doc.page.height;
            const left = 36;
            const right = pageW - 36;
            const contentW = right - left;
            const company = payload.company || {};

            let y = 28;

            // —— Header: logo left · invoice meta right ——
            const logoPath = resolveLocalPath(company.logoUrl || company.logo?.url);
            const leftColW = contentW * 0.52;
            const rightColX = left + leftColW + 8;
            const rightColW = contentW - leftColW - 8;
            const headerTop = y;

            let logoDrawn = false;
            if (logoPath) {
                try {
                    doc.image(logoPath, left, y, { fit: [64, 64] });
                    logoDrawn = true;
                } catch (err) {
                    console.warn("Invoice logo failed:", err.message);
                }
            }
            if (!logoDrawn) {
                doc.roundedRect(left, y, 56, 56, 8).fill(NAVY);
                doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(12)
                    .text("TW", left, y + 20, { width: 56, align: "center" });
            }

            const textLeft = left + 72;
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(12)
                .text(company.companyName || "True Way Taxi", textLeft, headerTop, {
                    width: leftColW - 72,
                });
            const addr = [
                company.addressLine1,
                company.addressLine2,
                [company.city, company.state].filter(Boolean).join(", "),
                company.pinCode || "",
            ]
                .filter(Boolean)
                .join(", ");
            let leftY = headerTop + 16;
            if (addr) {
                doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
                    .text(addr, textLeft, leftY, { width: leftColW - 72 });
                leftY += 20;
            }
            const taxContact = [
                company.gstin ? `GSTIN: ${company.gstin}` : null,
                company.quotationPhone ? `Ph: ${company.quotationPhone}` : null,
                company.quotationEmail || null,
            ]
                .filter(Boolean)
                .join(" · ");
            if (taxContact) {
                doc.fillColor(SLATE).font("Helvetica").fontSize(7)
                    .text(taxContact, textLeft, leftY, { width: leftColW - 72 });
                leftY += 12;
            }

            // Right meta box
            const payText = paymentLabel(payload);
            const metaRows = [
                ["Invoice No", invoiceId],
                ["Booking No", payload.leadId || "—"],
                ["Date", formatDate(payload.invoiceDate || new Date())],
                ["Payment", payText],
            ];
            const metaBoxH = metaRows.length * 16 + 10;
            doc.roundedRect(rightColX, headerTop, rightColW, metaBoxH, 6)
                .fill(LIGHT)
                .strokeColor(BORDER)
                .lineWidth(0.7)
                .stroke();
            metaRows.forEach((row, i) => {
                const yy = headerTop + 6 + i * 16;
                doc.fillColor(MUTED).font("Helvetica").fontSize(7.5)
                    .text(`${row[0]}:`, rightColX + 8, yy, { width: 70 });
                doc.fillColor(i === 3 && payText.startsWith("Paid") ? "#047857" : SLATE)
                    .font("Helvetica-Bold")
                    .fontSize(8)
                    .text(row[1], rightColX + 78, yy, { width: rightColW - 86 });
            });

            y = Math.max(leftY, headerTop + metaBoxH) + 12;
            doc.moveTo(left, y).lineTo(right, y).strokeColor(BORDER).lineWidth(0.8).stroke();
            y += 10;

            // —— Customer & Journey ——
            doc.rect(left, y, contentW, 18).fill(LIGHT);
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(9)
                .text("Customer & Journey Details", left + 8, y + 5);
            y += 18;

            const half = contentW / 2;
            const travelLabel = payload.endDate
                ? `${formatDate(payload.travelDate)} to ${formatDate(payload.endDate)}`
                : formatDate(payload.travelDate);

            const leftBlock = [
                ["Name", payload.customerName || "—"],
                ["Address", payload.customerAddress || payload.pickupLocation || "—"],
                ["Mobile", payload.mobileNumber || "—"],
                ["Firm / Organization", payload.firmName || "—"],
                ["GSTIN", payload.customerGstin || "—"],
            ];
            const rightBlock = [
                ["From", payload.fromCity || payload.pickupLocation || "—"],
                ["To", payload.toCity || payload.dropLocation || "—"],
                ["Pickup", payload.pickupLocation || "—"],
                ["Drop", payload.dropLocation || "—"],
                ["Date", travelLabel],
                ["Vehicle No", payload.vehicleNumber || "—"],
                ["Type", payload.cabTypeName || "—"],
                ["Journey Type", payload.tripTypeName || "—"],
            ];

            const blockH = Math.max(leftBlock.length, rightBlock.length) * 14 + 10;
            doc.rect(left, y, contentW, blockH).strokeColor(BORDER).lineWidth(0.6).stroke();
            doc.moveTo(left + half, y).lineTo(left + half, y + blockH).strokeColor(BORDER).stroke();

            leftBlock.forEach((row, i) => {
                const yy = y + 6 + i * 14;
                doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text(`${row[0]}:`, left + 8, yy, { width: 90 });
                doc.fillColor(SLATE).font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8)
                    .text(row[1], left + 98, yy, { width: half - 106 });
            });
            rightBlock.forEach((row, i) => {
                const yy = y + 6 + i * 14;
                doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text(`${row[0]}:`, left + half + 8, yy, {
                    width: 78,
                });
                doc.fillColor(SLATE).font("Helvetica").fontSize(8)
                    .text(row[1], left + half + 86, yy, { width: half - 94 });
            });
            y += blockH + 12;

            // —— Fare & Charges ——
            doc.rect(left, y, contentW, 18).fill(LIGHT);
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(9)
                .text("Fare & Charges", left + 8, y + 5);
            y += 18;

            const colAmtW = 110;
            const colPartW = contentW - colAmtW;
            doc.rect(left, y, contentW, 16).fill(LIGHT);
            doc.rect(left, y, contentW, 16).strokeColor(BORDER).lineWidth(0.5).stroke();
            doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(8)
                .text("Particular", left + 8, y + 4);
            doc.text("Amount (Rs)", left + colPartW, y + 4, { width: colAmtW - 8, align: "right" });
            y += 16;

            const { halfPct, cgst, sgst, totalAmt } = splitGst(payload.gstPercent, payload.gstAmount);
            const received = round2(payload.advancePaid ?? 0);
            const balance = round2(payload.pendingAmount ?? Math.max(0, Number(payload.grandTotal || 0) - received));
            const totalPayable = round2(payload.grandTotal);

            const fareRows = [
                { label: "Journey Fare", value: money(payload.tripAmount), kind: "normal" },
                { label: "Toll Plaza", value: payload.tollNote || "Inclusive", kind: "text" },
                { label: "Parking Fee", value: payload.parkingNote || "—", kind: "text" },
                { label: "Night Charges", value: money(payload.nightCharges || 0), kind: "normal" },
                {
                    label: "Other Charges",
                    sub: "waiting / night / cancellation / extra luggage etc.",
                    value: money(payload.otherCharges || 0),
                    kind: "normal",
                },
                { label: "Discount", value: payload.discount != null ? money(payload.discount) : "—", kind: "text" },
                { label: "Tax Amount", value: money(totalAmt), kind: "bold" },
                { label: `CGST (${halfPct}%)`, value: money(cgst), kind: "indent" },
                { label: `SGST (${halfPct}%)`, value: money(sgst), kind: "indent" },
                { label: "Received Payment", value: money(received), kind: "normal" },
                { label: "Balance Amount", value: money(balance), kind: "normal" },
                { label: "Total Payable", value: money(totalPayable), kind: "total" },
            ];

            fareRows.forEach((row) => {
                const h = row.sub ? 28 : 18;
                if (y + h > pageH - 120) {
                    doc.addPage();
                    y = 36;
                }
                if (row.kind === "total") {
                    doc.rect(left, y, contentW, h).fill(ROW_BLUE);
                }
                doc.rect(left, y, contentW, h).strokeColor(BORDER).lineWidth(0.4).stroke();
                const labelX = row.kind === "indent" ? left + 20 : left + 8;
                doc.fillColor(SLATE)
                    .font(row.kind === "total" || row.kind === "bold" ? "Helvetica-Bold" : "Helvetica")
                    .fontSize(row.kind === "indent" ? 8 : 8.5)
                    .text(row.label, labelX, y + (row.sub ? 4 : 4), { width: colPartW - 16 });
                if (row.sub) {
                    doc.fillColor(MUTED).font("Helvetica").fontSize(6.5)
                        .text(row.sub, labelX, y + 14, { width: colPartW - 16 });
                }
                doc.fillColor(SLATE)
                    .font(row.kind === "total" || row.kind === "bold" ? "Helvetica-Bold" : "Helvetica")
                    .fontSize(8.5)
                    .text(row.value, left + colPartW, y + (row.sub ? 8 : 4), {
                        width: colAmtW - 8,
                        align: "right",
                    });
                y += h;
            });

            // Amount in words
            doc.rect(left, y, contentW, 22).strokeColor(BORDER).lineWidth(0.5).stroke();
            doc.fillColor(SLATE).font("Helvetica").fontSize(8)
                .text(`Amount in Words: ${amountInWords(totalPayable)}`, left + 8, y + 6, {
                    width: contentW - 16,
                });
            y += 30;

            // —— Bank / QR ——
            const upis = parseUpiIds(company.upiIds);
            const qrPath = resolveLocalPath(
                company.paymentQrImageUrl || company.paymentQrImage?.url
            );
            const bankBits = [
                company.accountHolderName || company.companyName,
                company.bankName,
                company.accountNumber ? `A/C: ${company.accountNumber}` : null,
                company.ifsc ? `IFSC: ${company.ifsc}` : null,
                upis[0] ? `UPI: ${upis[0]}` : null,
            ].filter(Boolean);

            if (bankBits.length || qrPath) {
                if (y > pageH - 140) {
                    doc.addPage();
                    y = 36;
                }
                doc.fillColor(SLATE).font("Helvetica").fontSize(8)
                    .text(`Bank Details: ${bankBits.join(" | ")}`, left, y, { width: contentW });
                y += 14;

                if (company.paymentWarningText) {
                    doc.fillColor(RED).font("Helvetica-Bold").fontSize(7.5)
                        .text(company.paymentWarningText, left, y, {
                            width: contentW,
                            align: "center",
                        });
                    y += 18;
                }

                if (qrPath || upis.length) {
                    const boxW = (contentW - 12) / 2;
                    const boxH = 110;
                    doc.roundedRect(left, y, boxW, boxH, 4)
                        .dash(3, { space: 2 })
                        .strokeColor("#16a34a")
                        .lineWidth(1)
                        .stroke();
                    doc.undash();
                    doc.fillColor(SLATE).font("Helvetica-Bold").fontSize(9)
                        .text("Online Payment", left, y + 8, { width: boxW, align: "center" });
                    if (qrPath) {
                        try {
                            doc.image(qrPath, left + boxW / 2 - 36, y + 24, { fit: [72, 72] });
                        } catch (err) {
                            console.warn("Invoice QR failed:", err.message);
                        }
                    }
                    if (upis.length) {
                        doc.fillColor(SLATE).font("Helvetica").fontSize(7)
                            .text(upis.join("\n"), left + 6, y + boxH - 18, {
                                width: boxW - 12,
                                align: "center",
                            });
                    }

                    doc.roundedRect(left + boxW + 12, y, boxW, boxH, 4)
                        .dash(3, { space: 2 })
                        .strokeColor("#16a34a")
                        .lineWidth(1)
                        .stroke();
                    doc.undash();
                    doc.roundedRect(left + boxW + 12 + boxW / 2 - 50, y + 30, 100, 28, 6).fill("#16a34a");
                    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11)
                        .text("PAY ONLINE", left + boxW + 12, y + 38, {
                            width: boxW,
                            align: "center",
                        });
                    doc.fillColor(MUTED).font("Helvetica").fontSize(7)
                        .text("Click to pay securely using UPI / Card / Net Banking", left + boxW + 18, y + 68, {
                            width: boxW - 12,
                            align: "center",
                        });
                    y += boxH + 10;
                }
            }

            doc.fillColor(MUTED).font("Helvetica").fontSize(7)
                .text("This is a system generated invoice.", left, pageH - 40, {
                    width: contentW,
                    align: "center",
                });

            doc.end();

            stream.on("finish", () => resolve({ pdfUrl, absolutePath }));
            stream.on("error", reject);
        } catch (error) {
            reject(error);
        }
    });

module.exports = { generateInvoicePdf, invoiceDir, amountInWords, splitGst };
