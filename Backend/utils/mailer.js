const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    return transporter;
};

const sendQuotationEmail = async ({ to, subject, text, html, pdfAbsolutePath, companyName }) => {
    const tx = getTransporter();
    if (!tx) {
        const error = new Error("SMTP is not configured");
        error.status = 500;
        throw error;
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const attachments = [];
    if (pdfAbsolutePath && fs.existsSync(pdfAbsolutePath)) {
        attachments.push({
            filename: path.basename(pdfAbsolutePath),
            path: pdfAbsolutePath,
            contentType: "application/pdf",
        });
    }

    await tx.sendMail({
        from: `"${companyName || "True Way Taxi"}" <${from}>`,
        to,
        subject,
        text,
        html: html || undefined,
        attachments,
    });
};

const sendTextEmail = async ({ to, subject, text, html, companyName }) => {
    const tx = getTransporter();
    if (!tx) {
        const error = new Error("SMTP is not configured");
        error.status = 500;
        throw error;
    }
    if (!to) {
        const error = new Error("Recipient email is required");
        error.status = 400;
        throw error;
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    await tx.sendMail({
        from: `"${companyName || "True Way Taxi"}" <${from}>`,
        to,
        subject,
        text,
        html: html || undefined,
    });
};

module.exports = { sendQuotationEmail, sendTextEmail, getTransporter };
