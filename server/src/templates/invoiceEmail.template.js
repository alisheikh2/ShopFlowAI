const invoiceConfig = require("../config/invoice");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (date) =>
  new Date(date || Date.now()).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const getCustomerName = (order) =>
  order.user?.name ||
  order.billingAddress?.fullName ||
  order.shippingAddress?.fullName ||
  "Customer";

const formatAddress = (address = {}) =>
  [
    address.fullName,
    address.phone,
    address.address,
    [address.city, address.postalCode].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

const getItemCount = (order) =>
  (order.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

const getPaymentStatusLabel = (order) => {
  if (order.paymentMethod === "cod" && order.paymentStatus === "pending") {
    return "Pending - Pay on Delivery";
  }

  const labels = {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };

  return labels[order.paymentStatus] || order.paymentStatus || "Pending";
};

const buildInvoiceEmailSubject = (order, invoice) =>
  `Your ShopFlowAI Invoice ${invoice.invoiceNumber} is attached`;

const buildInvoiceEmailText = (order, invoice) => {
  const customerName = getCustomerName(order);

  return [
    `Hi ${customerName},`,
    "",
    "Thank you for shopping with ShopFlowAI. Your order has been placed successfully and your PDF invoice is attached with this email.",
    "",
    `Invoice / Order ID: ${invoice.invoiceNumber}`,
    `Invoice Date: ${invoice.invoiceDate}`,
    `Payment Method: ${invoice.paymentMethod}`,
    `Payment Status: ${getPaymentStatusLabel(order)}`,
    `Grand Total: ${invoice.formattedTotal}`,
    `Delivery Method: ${order.deliveryMethod || invoiceConfig.defaultDeliveryMethod}`,
    "",
    `Shipping To: ${formatAddress(order.shippingAddress)}`,
    "",
    `For support, contact ${invoiceConfig.seller.supportEmail} or ${invoiceConfig.seller.supportPhone}.`,
    "",
    "Smart Shopping. Smarter Business.",
    "ShopFlowAI",
  ].join("\n");
};

const buildInvoiceEmailHtml = (order, invoice) => {
  const customerName = getCustomerName(order);
  const shippingAddress = formatAddress(order.shippingAddress);
  const itemCount = getItemCount(order);
  const paymentStatus = getPaymentStatusLabel(order);
  const deliveryMethod = order.deliveryMethod || invoiceConfig.defaultDeliveryMethod;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(buildInvoiceEmailSubject(order, invoice))}</title>
      </head>
      <body style="margin:0; padding:0; background:#F7F9FF; font-family:Arial, Helvetica, sans-serif; color:#020A2F;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F9FF; padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #DDE7FF; box-shadow:0 12px 32px rgba(2,10,47,0.08);">
                <tr>
                  <td style="padding:0; background:#020A2F;">
                    <div style="background:linear-gradient(135deg,#0F67F5 0%,#020A2F 54%,#6D28E9 100%); padding:28px 30px; color:#ffffff;">
                      <div style="font-size:13px; letter-spacing:2.8px; text-transform:uppercase; color:#DDE7FF; font-weight:700;">ShopFlowAI</div>
                      <h1 style="margin:10px 0 6px; font-size:28px; line-height:1.2; font-weight:800;">Your invoice is ready</h1>
                      <p style="margin:0; font-size:15px; line-height:1.6; color:#EAF0FF;">Smart Shopping. Smarter Business. Your professional PDF invoice is attached with this email.</p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px 30px 8px;">
                    <p style="margin:0 0 14px; font-size:16px; line-height:1.6;">Hi <strong>${escapeHtml(customerName)}</strong>,</p>
                    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
                      Thank you for shopping with ShopFlowAI. Your order has been placed successfully.
                      Please find your official PDF invoice attached for your records.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:18px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate; border-spacing:0; border:1px solid #DDE7FF; border-radius:14px; overflow:hidden;">
                      <tr>
                        <td style="background:#F7F9FF; padding:14px 16px; border-bottom:1px solid #DDE7FF; width:42%; color:#64748B; font-size:13px; font-weight:700; text-transform:uppercase;">Invoice / Order ID</td>
                        <td style="padding:14px 16px; border-bottom:1px solid #DDE7FF; font-size:15px; font-weight:800; color:#020A2F;">${escapeHtml(invoice.invoiceNumber)}</td>
                      </tr>
                      <tr>
                        <td style="background:#F7F9FF; padding:14px 16px; border-bottom:1px solid #DDE7FF; color:#64748B; font-size:13px; font-weight:700; text-transform:uppercase;">Invoice Date</td>
                        <td style="padding:14px 16px; border-bottom:1px solid #DDE7FF; font-size:15px; color:#020A2F;">${escapeHtml(invoice.invoiceDate)}</td>
                      </tr>
                      <tr>
                        <td style="background:#F7F9FF; padding:14px 16px; border-bottom:1px solid #DDE7FF; color:#64748B; font-size:13px; font-weight:700; text-transform:uppercase;">Grand Total</td>
                        <td style="padding:14px 16px; border-bottom:1px solid #DDE7FF; font-size:16px; color:#6D28E9; font-weight:800;">${escapeHtml(invoice.formattedTotal)}</td>
                      </tr>
                      <tr>
                        <td style="background:#F7F9FF; padding:14px 16px; border-bottom:1px solid #DDE7FF; color:#64748B; font-size:13px; font-weight:700; text-transform:uppercase;">Payment</td>
                        <td style="padding:14px 16px; border-bottom:1px solid #DDE7FF; font-size:15px; color:#020A2F;">${escapeHtml(invoice.paymentMethod)} · <strong>${escapeHtml(paymentStatus)}</strong></td>
                      </tr>
                      <tr>
                        <td style="background:#F7F9FF; padding:14px 16px; color:#64748B; font-size:13px; font-weight:700; text-transform:uppercase;">Items</td>
                        <td style="padding:14px 16px; font-size:15px; color:#020A2F;">${escapeHtml(itemCount)} item${itemCount === 1 ? "" : "s"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:2px 30px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:16px; background:#EEF4FF; border-left:4px solid #0F67F5; border-radius:12px;">
                          <div style="font-size:13px; color:#64748B; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Shipping Details</div>
                          <div style="font-size:14px; line-height:1.6; color:#334155;">
                            <strong>Delivery Method:</strong> ${escapeHtml(deliveryMethod)}<br />
                            <strong>Shipping To:</strong> ${escapeHtml(shippingAddress || "N/A")}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 30px 26px;">
                    <div style="background:#ffffff; border:1px dashed #BFD0FF; border-radius:14px; padding:16px; color:#334155; font-size:14px; line-height:1.6;">
                      <strong style="color:#020A2F;">Attachment:</strong>
                      ShopFlowAI-Invoice-${escapeHtml(invoice.invoiceNumber)}.pdf
                      <br />Please download and keep this invoice for your records.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:22px 30px; background:#F7F9FF; border-top:1px solid #DDE7FF;">
                    <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:#334155;">
                      Need help? Contact us at
                      <a href="mailto:${escapeHtml(invoiceConfig.seller.supportEmail)}" style="color:#0F67F5; font-weight:700; text-decoration:none;">${escapeHtml(invoiceConfig.seller.supportEmail)}</a>
                      or ${escapeHtml(invoiceConfig.seller.supportPhone)}.
                    </p>
                    <p style="margin:0; font-size:12px; line-height:1.5; color:#64748B;">
                      This is an automated email from ShopFlowAI. If you did not place this order, please contact support immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildInvoiceEmail = (order, invoice) => {
  const normalizedInvoice = {
    invoiceDate: formatDate(order.createdAt),
    ...invoice,
  };

  return {
    subject: buildInvoiceEmailSubject(order, normalizedInvoice),
    html: buildInvoiceEmailHtml(order, normalizedInvoice),
    text: buildInvoiceEmailText(order, normalizedInvoice),
  };
};

module.exports = {
  buildInvoiceEmail,
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
  buildInvoiceEmailText,
};
