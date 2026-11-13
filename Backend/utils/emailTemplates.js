const FRONTEND_URL = (process.env.FRONTEND_URL || "https://taxi-software.vercel.app").replace(/\/$/, "");

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const money = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;

/**
 * Professional branded HTML email shell.
 */
const wrapEmail = ({
    companyName = "True Way Taxi",
    preheader = "",
    title,
    greeting,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    footerNote,
}) => {
    const brand = escapeHtml(companyName);
    const btn =
        ctaLabel && ctaUrl
            ? `
      <tr>
        <td align="center" style="padding:28px 0 8px;">
          <a href="${escapeHtml(ctaUrl)}"
             style="display:inline-block;background:#0B3A6E;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;letter-spacing:0.2px;">
            ${escapeHtml(ctaLabel)}
          </a>
        </td>
      </tr>`
            : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title || brand)}</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EEF2F7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #Dbe3ef;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0B3A6E 0%,#1256A0 100%);padding:28px 32px;">
              <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;opacity:0.85;">Taxi CRM</div>
              <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">${brand}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#0B3A6E;">${escapeHtml(title)}</h1>
              ${greeting ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>` : ""}
              <div style="font-size:14px;line-height:1.7;color:#475569;">${bodyHtml}</div>
            </td>
          </tr>
          ${btn}
          <tr>
            <td style="padding:24px 32px 32px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                ${footerNote || `This is an automated message from ${brand}. Please do not reply to this email.`}
              </p>
            </td>
          </tr>
        </table>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;margin:16px 0 0;">© ${new Date().getFullYear()} ${brand}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const detailRows = (rows) => {
    const items = rows
        .filter((r) => r && r.value != null && String(r.value).trim() !== "")
        .map(
            (r) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;width:38%;">${escapeHtml(r.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;color:#0f172a;font-size:13px;font-weight:600;">${escapeHtml(r.value)}</td>
      </tr>`
        )
        .join("");
    return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin:8px 0 4px;background:#F8FAFC;">
      ${items}
    </table>`;
};

const highlightBox = (label, value) => `
  <div style="margin:16px 0;padding:16px 18px;border-radius:12px;background:#0B3A6E;color:#fff;">
    <div style="font-size:12px;opacity:0.85;letter-spacing:0.4px;text-transform:uppercase;">${escapeHtml(label)}</div>
    <div style="font-size:24px;font-weight:700;margin-top:4px;">${escapeHtml(value)}</div>
  </div>`;

const vendorLoginUrl = () => `${FRONTEND_URL}/`;
const vendorOffersUrl = () => `${FRONTEND_URL}/dashboard/vendor-offers`;

module.exports = {
    wrapEmail,
    detailRows,
    highlightBox,
    money,
    escapeHtml,
    vendorLoginUrl,
    vendorOffersUrl,
    FRONTEND_URL,
};
