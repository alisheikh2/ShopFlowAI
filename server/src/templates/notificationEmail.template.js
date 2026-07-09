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

const formatCurrency = (amount) =>
  `${invoiceConfig.currency} ${Number(amount || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getOrderNumber = (order) =>
  order.invoiceNumber || order._id?.toString?.() || "N/A";

const getCustomerName = (order) =>
  order.user?.name ||
  order.billingAddress?.fullName ||
  order.shippingAddress?.fullName ||
  "Customer";

const getCustomerEmail = (order) => order.user?.email || "N/A";

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

const getItemsSummary = (order) =>
  (order.items || [])
    .map((item) => `${item.nameSnapshot || item.product?.name || "Product"} × ${item.quantity}`)
    .join(", ");

const getPaymentMethodLabel = (method) => {
  const labels = {
    cod: "Cash on Delivery",
    stripe: "Credit/Debit Card (Stripe)",
  };

  return labels[method] || method || "N/A";
};

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

const statusLabels = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusMessages = {
  processing: "Good news — your order is now being prepared by our team.",
  shipped: "Your order has been shipped and is on its way to you.",
  delivered: "Your order has been delivered. We hope you enjoy your purchase!",
  cancelled: "Your order has been cancelled. If a payment was captured, refund handling will follow the payment policy.",
};

const baseLayout = ({ preheader, title, subtitle, body, footerNote }) => `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0; padding:0; background:#F7F9FF; font-family:Arial, Helvetica, sans-serif; color:#020A2F;">
      <span style="display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">${escapeHtml(preheader)}</span>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F9FF; padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #DDE7FF; box-shadow:0 12px 32px rgba(2,10,47,0.08);">
              <tr>
                <td style="padding:0; background:#020A2F;">
                  <div style="background:linear-gradient(135deg,#0F67F5 0%,#020A2F 54%,#6D28E9 100%); padding:28px 30px; color:#ffffff;">
                    <div style="font-size:13px; letter-spacing:2.8px; text-transform:uppercase; color:#DDE7FF; font-weight:700;">ShopFlowAI</div>
                    <h1 style="margin:10px 0 6px; font-size:28px; line-height:1.2; font-weight:800;">${escapeHtml(title)}</h1>
                    <p style="margin:0; font-size:15px; line-height:1.6; color:#EAF0FF;">${escapeHtml(subtitle)}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 30px;">${body}</td>
              </tr>
              <tr>
                <td style="padding:22px 30px; background:#F7F9FF; border-top:1px solid #DDE7FF;">
                  <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:#334155;">
                    Need help? Contact us at
                    <a href="mailto:${escapeHtml(invoiceConfig.seller.supportEmail)}" style="color:#0F67F5; font-weight:700; text-decoration:none;">${escapeHtml(invoiceConfig.seller.supportEmail)}</a>
                    or ${escapeHtml(invoiceConfig.seller.supportPhone)}.
                  </p>
                  <p style="margin:0; font-size:12px; line-height:1.5; color:#64748B;">${escapeHtml(
                    footerNote ||
                      "This is an automated email from ShopFlowAI. Smart Shopping. Smarter Business.",
                  )}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const detailTable = (rows) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate; border-spacing:0; border:1px solid #DDE7FF; border-radius:14px; overflow:hidden; margin:18px 0;">
    ${rows
      .map(
        ([label, value], index) => `
          <tr>
            <td style="background:#F7F9FF; padding:13px 16px; ${
              index < rows.length - 1 ? "border-bottom:1px solid #DDE7FF;" : ""
            } width:42%; color:#64748B; font-size:13px; font-weight:700; text-transform:uppercase;">${escapeHtml(label)}</td>
            <td style="padding:13px 16px; ${
              index < rows.length - 1 ? "border-bottom:1px solid #DDE7FF;" : ""
            } font-size:15px; color:#020A2F;">${escapeHtml(value)}</td>
          </tr>
        `,
      )
      .join("")}
  </table>
`;

const buildOrderConfirmationEmail = (order) => {
  const orderNumber = getOrderNumber(order);
  const subject = `Order confirmed: ${orderNumber}`;
  const body = `
    <p style="margin:0 0 14px; font-size:16px; line-height:1.6;">Hi <strong>${escapeHtml(
      getCustomerName(order),
    )}</strong>,</p>
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      Thank you for shopping with ShopFlowAI. Your order has been received successfully and our team will process it shortly.
    </p>
    ${detailTable([
      ["Order ID", orderNumber],
      ["Order Date", formatDate(order.createdAt)],
      ["Items", getItemsSummary(order) || "N/A"],
      ["Payment Method", getPaymentMethodLabel(order.paymentMethod)],
      ["Payment Status", getPaymentStatusLabel(order)],
      ["Grand Total", formatCurrency(order.totalAmount)],
      ["Shipping To", formatAddress(order.shippingAddress) || "N/A"],
    ])}
    <div style="background:#EEF4FF; border-left:4px solid #0F67F5; border-radius:12px; padding:14px 16px; color:#334155; font-size:14px; line-height:1.6;">
      Your invoice email is sent separately with a PDF attachment for your records.
    </div>
  `;

  return {
    subject,
    html: baseLayout({
      preheader: `Your ShopFlowAI order ${orderNumber} has been confirmed.`,
      title: "Order confirmed",
      subtitle: "We have received your order successfully.",
      body,
    }),
    text: [
      `Hi ${getCustomerName(order)},`,
      `Your ShopFlowAI order ${orderNumber} has been confirmed.`,
      `Payment: ${getPaymentMethodLabel(order.paymentMethod)} (${getPaymentStatusLabel(order)})`,
      `Total: ${formatCurrency(order.totalAmount)}`,
      `Shipping To: ${formatAddress(order.shippingAddress)}`,
    ].join("\n"),
  };
};

const buildPaymentSuccessEmail = (order) => {
  const orderNumber = getOrderNumber(order);
  const subject = `Payment received for order ${orderNumber}`;
  const body = `
    <p style="margin:0 0 14px; font-size:16px; line-height:1.6;">Hi <strong>${escapeHtml(
      getCustomerName(order),
    )}</strong>,</p>
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      We have successfully received your payment. Your order is now being processed.
    </p>
    ${detailTable([
      ["Order ID", orderNumber],
      ["Amount Paid", formatCurrency(order.totalAmount)],
      ["Payment Method", getPaymentMethodLabel(order.paymentMethod)],
      ["Transaction Ref.", order.transactionReference || order.paymentIntentId || "N/A"],
      ["Order Status", statusLabels[order.orderStatus] || order.orderStatus || "Processing"],
    ])}
  `;

  return {
    subject,
    html: baseLayout({
      preheader: `Payment received for ShopFlowAI order ${orderNumber}.`,
      title: "Payment successful",
      subtitle: "Your payment has been received and your order is processing.",
      body,
    }),
    text: [
      `Hi ${getCustomerName(order)},`,
      `Payment received for order ${orderNumber}.`,
      `Amount Paid: ${formatCurrency(order.totalAmount)}`,
      `Transaction Ref: ${order.transactionReference || order.paymentIntentId || "N/A"}`,
    ].join("\n"),
  };
};

const buildPaymentFailedEmail = (order) => {
  const orderNumber = getOrderNumber(order);
  const subject = `Payment failed for order ${orderNumber}`;
  const body = `
    <p style="margin:0 0 14px; font-size:16px; line-height:1.6;">Hi <strong>${escapeHtml(
      getCustomerName(order),
    )}</strong>,</p>
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      We could not complete the payment for your order. Please try again from your order/payment page.
    </p>
    ${detailTable([
      ["Order ID", orderNumber],
      ["Payment Method", getPaymentMethodLabel(order.paymentMethod)],
      ["Amount", formatCurrency(order.totalAmount)],
      ["Payment Status", "Failed"],
    ])}
    <div style="background:#FFF7ED; border-left:4px solid #F97316; border-radius:12px; padding:14px 16px; color:#7C2D12; font-size:14px; line-height:1.6;">
      If money was deducted, it is usually reversed automatically by your bank/payment provider.
    </div>
  `;

  return {
    subject,
    html: baseLayout({
      preheader: `Payment failed for ShopFlowAI order ${orderNumber}.`,
      title: "Payment failed",
      subtitle: "Your payment could not be completed.",
      body,
    }),
    text: [
      `Hi ${getCustomerName(order)},`,
      `Payment failed for order ${orderNumber}.`,
      `Amount: ${formatCurrency(order.totalAmount)}`,
      "Please try again from your order/payment page.",
    ].join("\n"),
  };
};

const buildOrderStatusUpdateEmail = (order, status) => {
  const orderNumber = getOrderNumber(order);
  const label = statusLabels[status] || status;
  const subject = `Order ${orderNumber} is now ${label}`;
  const body = `
    <p style="margin:0 0 14px; font-size:16px; line-height:1.6;">Hi <strong>${escapeHtml(
      getCustomerName(order),
    )}</strong>,</p>
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      ${escapeHtml(statusMessages[status] || `Your order status has been updated to ${label}.`)}
    </p>
    ${detailTable([
      ["Order ID", orderNumber],
      ["New Status", label],
      ["Payment Status", getPaymentStatusLabel(order)],
      ["Grand Total", formatCurrency(order.totalAmount)],
      ["Delivery Method", order.deliveryMethod || invoiceConfig.defaultDeliveryMethod],
      ["Shipping To", formatAddress(order.shippingAddress) || "N/A"],
    ])}
  `;

  return {
    subject,
    html: baseLayout({
      preheader: `Your ShopFlowAI order ${orderNumber} is now ${label}.`,
      title: `Order ${label}`,
      subtitle: statusMessages[status] || `Your order status has changed to ${label}.`,
      body,
    }),
    text: [
      `Hi ${getCustomerName(order)},`,
      `Your order ${orderNumber} is now ${label}.`,
      `Payment Status: ${getPaymentStatusLabel(order)}`,
      `Total: ${formatCurrency(order.totalAmount)}`,
    ].join("\n"),
  };
};

const buildAdminNewOrderEmail = (order) => {
  const orderNumber = getOrderNumber(order);
  const subject = `New order received: ${orderNumber}`;
  const body = `
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      A new order has been placed on ShopFlowAI. Review it in the admin dashboard.
    </p>
    ${detailTable([
      ["Order ID", orderNumber],
      ["Customer", `${getCustomerName(order)} (${getCustomerEmail(order)})`],
      ["Items", getItemsSummary(order) || "N/A"],
      ["Payment Method", getPaymentMethodLabel(order.paymentMethod)],
      ["Payment Status", getPaymentStatusLabel(order)],
      ["Grand Total", formatCurrency(order.totalAmount)],
      ["Shipping To", formatAddress(order.shippingAddress) || "N/A"],
    ])}
  `;

  return {
    subject,
    html: baseLayout({
      preheader: `New ShopFlowAI order ${orderNumber} received.`,
      title: "New order received",
      subtitle: "A customer has placed a new order.",
      body,
      footerNote: "This notification was sent to ShopFlowAI admins/sellers.",
    }),
    text: [
      `New order received: ${orderNumber}`,
      `Customer: ${getCustomerName(order)} (${getCustomerEmail(order)})`,
      `Payment: ${getPaymentMethodLabel(order.paymentMethod)} (${getPaymentStatusLabel(order)})`,
      `Total: ${formatCurrency(order.totalAmount)}`,
    ].join("\n"),
  };
};

const buildLowStockAlertEmail = (product, threshold) => {
  const subject = `Low stock alert: ${product.name}`;
  const body = `
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      Inventory for this product is at or below the configured low-stock threshold. Please restock soon.
    </p>
    ${detailTable([
      ["Product", product.name],
      ["SKU", product.sku || `SKU-${product._id.toString().slice(-8).toUpperCase()}`],
      ["Current Stock", String(product.stock ?? 0)],
      ["Low Stock Threshold", String(threshold)],
      ["Price", formatCurrency(product.discountPrice > 0 ? product.discountPrice : product.price)],
    ])}
  `;

  return {
    subject,
    html: baseLayout({
      preheader: `${product.name} is low in stock.`,
      title: "Low stock alert",
      subtitle: "A product needs inventory attention.",
      body,
      footerNote: "This inventory notification was sent to ShopFlowAI admins/sellers.",
    }),
    text: [
      `Low stock alert: ${product.name}`,
      `SKU: ${product.sku || `SKU-${product._id.toString().slice(-8).toUpperCase()}`}`,
      `Current Stock: ${product.stock ?? 0}`,
      `Threshold: ${threshold}`,
    ].join("\n"),
  };
};

module.exports = {
  buildAdminNewOrderEmail,
  buildLowStockAlertEmail,
  buildOrderConfirmationEmail,
  buildOrderStatusUpdateEmail,
  buildPaymentFailedEmail,
  buildPaymentSuccessEmail,
};
