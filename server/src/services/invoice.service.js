const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Order = require("../models/order.model");
const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");
const { buildInvoiceEmail } = require("../templates/invoiceEmail.template");
const invoiceConfig = require("../config/invoice");

const SHOPFLOWAI_LOGO_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "shopflowai-logo.png",
);

const COLORS = {
  navy: "#020A2F",
  deepNavy: "#07145A",
  blue: "#0F67F5",
  purple: "#6D28E9",
  cyan: "#22D3EE",
  light: "#F7F9FF",
  lightBlue: "#EEF4FF",
  border: "#DDE7FF",
  borderStrong: "#BFD0FF",
  muted: "#64748B",
  slate: "#334155",
  white: "#FFFFFF",
};

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

const generateInvoiceNumber = (orderId) => {
  const raw = orderId?.toString?.() || `${Date.now()}`;
  const padded = raw.padEnd(14, "0");
  return `114-${padded.slice(0, 7)}-${padded.slice(-7)}`.toUpperCase();
};

const getOrderInvoiceNumber = (order) =>
  order.invoiceNumber || generateInvoiceNumber(order._id);

const getBuyerEmail = (order) => order.user?.email || "";
const getBuyerName = (order) =>
  order.billingAddress?.fullName || order.user?.name || order.shippingAddress?.fullName || "Customer";

const getAddressLines = (address = {}) =>
  [
    address.fullName,
    address.phone,
    address.address,
    [address.city, address.postalCode].filter(Boolean).join(" "),
    address.country,
  ].filter(Boolean);

const getPaymentMethodLabel = (method) => {
  const labels = {
    cod: "Cash on Delivery",
    stripe: "Credit/Debit Card (Stripe)",
  };

  return labels[method] || method || "N/A";
};

const getTransactionReference = (order) => {
  if (order.transactionReference) return order.transactionReference;
  if (order.paymentIntentId) return order.paymentIntentId;
  if (order.paymentMethod === "cod") return "COD - payable on delivery";
  return "Pending";
};

const getSku = (item) => {
  if (item.skuSnapshot) return item.skuSnapshot;
  if (item.product?.sku) return item.product.sku;
  const productId = item.product?._id || item.product;
  return productId ? `SKU-${productId.toString().slice(-8).toUpperCase()}` : "N/A";
};

const getItemDescription = (item) =>
  item.product?.description || item.nameSnapshot || item.product?.name || "Product";

const addLogo = (doc, x, y) => {
  if (fs.existsSync(SHOPFLOWAI_LOGO_PATH)) {
    doc.image(SHOPFLOWAI_LOGO_PATH, x, y, {
      width: 130,
    });
    return;
  }

  // Fallback logo if the PNG asset is unavailable.
  doc
    .save()
    .roundedRect(x, y, 42, 42, 10)
    .fill(COLORS.navy)
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("SF", x + 10, y + 14, { width: 22, align: "center" })
    .restore();

  doc
    .fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("ShopFlowAI", x + 52, y + 3);

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(9)
    .text("AI-powered commerce platform", x + 54, y + 28);
};

const addSectionTitle = (doc, title, x, y, width) => {
  doc
    .fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(title.toUpperCase(), x, y, { width });
  doc
    .moveTo(x, y + 13)
    .lineTo(x + width, y + 13)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();
  doc
    .moveTo(x, y + 13)
    .lineTo(x + Math.min(54, width), y + 13)
    .strokeColor(COLORS.blue)
    .lineWidth(2)
    .stroke();
};

const addKeyValue = (doc, label, value, x, y, width) => {
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica")
    .fontSize(8)
    .text(label, x, y, { width });
  doc
    .fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(value || "N/A", x, y + 10, { width });
};

const drawAddressBox = (doc, title, lines, x, y, width, height) => {
  doc
    .roundedRect(x, y, width, height, 8)
    .fillAndStroke(COLORS.light, COLORS.border);
  doc
    .roundedRect(x, y, 5, height, 3)
    .fill(title.toLowerCase().includes("shipping") ? COLORS.purple : COLORS.blue);

  addSectionTitle(doc, title, x + 14, y + 10, width - 28);

  doc.fillColor(COLORS.navy).font("Helvetica").fontSize(8.2);
  const content = lines.length ? lines.join("\n") : "N/A";
  doc.text(content, x + 14, y + 29, {
    width: width - 28,
    lineGap: 1.4,
  });
};

const ensureTableSpace = (doc, y, rowHeight) => {
  const bottom = doc.page.height - 68;
  if (y + rowHeight <= bottom) return y;

  doc.addPage();
  return 50;
};

const drawTableHeader = (doc, y) => {
  const x = 40;
  const headerFill = doc
    .linearGradient(x, y, x + 515, y)
    .stop(0, COLORS.blue)
    .stop(0.58, COLORS.deepNavy)
    .stop(1, COLORS.purple);
  doc.roundedRect(x, y, 515, 21, 4).fill(headerFill);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(7.5);
  doc.text("PRODUCT DESCRIPTION", x + 8, y + 7, { width: 170 });
  doc.text("ASIN/SKU", x + 188, y + 7, { width: 70 });
  doc.text("QTY", x + 268, y + 7, { width: 32, align: "right" });
  doc.text("UNIT PRICE", x + 310, y + 7, { width: 65, align: "right" });
  doc.text("TAX", x + 385, y + 7, { width: 50, align: "right" });
  doc.text("LINE TOTAL", x + 445, y + 7, { width: 60, align: "right" });
  return y + 21;
};

const drawLineItem = (doc, item, y, index) => {
  const x = 40;
  const description = getItemDescription(item);
  const productName = item.nameSnapshot || item.product?.name || "Product";
  const lineSubtotal = Number(item.priceSnapshot || 0) * Number(item.quantity || 0);
  const itemTax = Number(item.taxSnapshot || 0);
  const lineTotal = lineSubtotal + itemTax;

  const descriptionHeight = doc
    .font("Helvetica")
    .fontSize(8)
    .heightOfString(description, { width: 170 });
  const rowHeight = Math.max(38, descriptionHeight + 22);
  y = ensureTableSpace(doc, y, rowHeight);

  if (index % 2 === 0) {
    doc.rect(x, y, 515, rowHeight).fill(COLORS.lightBlue);
  }

  doc.strokeColor(COLORS.border).lineWidth(0.8).rect(x, y, 515, rowHeight).stroke();

  doc
    .fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(8.4)
    .text(productName, x + 8, y + 6, { width: 170 });
  doc
    .fillColor(COLORS.slate)
    .font("Helvetica")
    .fontSize(7.5)
    .text(description, x + 8, y + 18, { width: 170, lineGap: 1 });

  doc.fillColor(COLORS.navy).font("Helvetica").fontSize(8);
  doc.text(getSku(item), x + 188, y + 10, { width: 70 });
  doc.text(String(item.quantity || 0), x + 268, y + 10, {
    width: 32,
    align: "right",
  });
  doc.text(formatCurrency(item.priceSnapshot), x + 300, y + 10, {
    width: 75,
    align: "right",
  });
  doc.text(formatCurrency(itemTax), x + 385, y + 10, {
    width: 50,
    align: "right",
  });
  doc.font("Helvetica-Bold").text(formatCurrency(lineTotal), x + 435, y + 10, {
    width: 70,
    align: "right",
  });

  return y + rowHeight;
};

const addFooter = (doc) => {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const pageNumber = i + 1;
    const totalPages = range.count;

    doc
      .moveTo(40, doc.page.height - 62)
      .lineTo(555, doc.page.height - 62)
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .stroke();

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Thank you for shopping with ShopFlowAI. For support: ${invoiceConfig.seller.supportEmail}`,
        40,
        doc.page.height - 52,
        { width: 380, lineBreak: false },
      )
      .text(`Page ${pageNumber} of ${totalPages}`, 485, doc.page.height - 52, {
        width: 70,
        align: "right",
        lineBreak: false,
      });
  }
};

const generateInvoicePdfBuffer = async (order) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      bufferPages: true,
      info: {
        Title: `Invoice ${getOrderInvoiceNumber(order)}`,
        Author: "ShopFlowAI",
        Subject: `Order Invoice ${getOrderInvoiceNumber(order)}`,
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    addLogo(doc, 40, 14);

    const invoiceHeaderFill = doc
      .linearGradient(390, 30, 555, 66)
      .stop(0, COLORS.blue)
      .stop(0.5, COLORS.deepNavy)
      .stop(1, COLORS.purple);

    doc.roundedRect(390, 30, 165, 36, 9).fill(invoiceHeaderFill);
    doc
      .fillColor(COLORS.white)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("INVOICE", 405, 40, { width: 135, align: "center" });

    addKeyValue(doc, "ORDER ID", getOrderInvoiceNumber(order), 390, 78, 165);
    addKeyValue(doc, "INVOICE DATE", formatDate(order.createdAt), 390, 108, 165);

    doc
      .moveTo(40, 138)
      .lineTo(555, 138)
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .stroke();

    // Seller / payment summary
    drawAddressBox(
      doc,
      "Seller Information",
      [
        invoiceConfig.seller.legalName,
        invoiceConfig.seller.businessAddress,
        invoiceConfig.seller.taxId,
        invoiceConfig.seller.supportEmail,
        invoiceConfig.seller.supportPhone,
      ],
      40,
      150,
      250,
      104,
    );

    doc
      .roundedRect(305, 150, 250, 104, 8)
      .fillAndStroke(COLORS.light, COLORS.border);
    doc.roundedRect(305, 150, 5, 104, 3).fill(COLORS.purple);
    addSectionTitle(doc, "Payment Details", 319, 160, 222);
    addKeyValue(doc, "PAYMENT METHOD", getPaymentMethodLabel(order.paymentMethod), 319, 182, 105);
    addKeyValue(doc, "PAYMENT STATUS", order.paymentStatus || "pending", 440, 182, 95);
    addKeyValue(doc, "TRANSACTION REF.", getTransactionReference(order), 319, 218, 218);

    // Buyer / shipping
    const buyerLines = getAddressLines(order.billingAddress || order.shippingAddress);
    if (getBuyerEmail(order)) buyerLines.push(getBuyerEmail(order));

    drawAddressBox(doc, "Buyer Information", buyerLines, 40, 270, 250, 112);
    drawAddressBox(
      doc,
      "Shipping Information",
      [
        ...(getAddressLines(order.shippingAddress) || []),
        `Delivery Method: ${order.deliveryMethod || invoiceConfig.defaultDeliveryMethod}`,
      ],
      305,
      270,
      250,
      112,
    );

    // Line items
    let y = 405;
    doc
      .fillColor(COLORS.navy)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Line Items", 40, y);
    y += 22;
    y = drawTableHeader(doc, y);

    (order.items || []).forEach((item, index) => {
      y = drawLineItem(doc, item, y, index);
    });

    y = ensureTableSpace(doc, y + 14, 118);

    // Summary box
    const summaryX = 335;
    const summaryY = y;
    doc
      .roundedRect(summaryX, summaryY, 220, 112, 8)
      .fillAndStroke(COLORS.light, COLORS.border);
    doc.roundedRect(summaryX, summaryY, 5, 112, 3).fill(COLORS.blue);
    addSectionTitle(doc, "Financial Summary", summaryX + 14, summaryY + 10, 192);

    const summaryRows = [
      ["Subtotal", formatCurrency(order.subtotal)],
      ["Shipping Fees", formatCurrency(order.shippingFee)],
      [`Tax Breakdown (${invoiceConfig.taxRate}% rate)`, formatCurrency(order.tax)],
      ["Grand Total", formatCurrency(order.totalAmount)],
    ];

    let summaryRowY = summaryY + 33;
    summaryRows.forEach(([label, value], index) => {
      const isTotal = index === summaryRows.length - 1;
      if (isTotal) {
        doc
          .moveTo(summaryX + 14, summaryRowY - 5)
          .lineTo(summaryX + 206, summaryRowY - 5)
          .strokeColor(COLORS.borderStrong)
          .lineWidth(1)
          .stroke();
      }

      doc
        .fillColor(isTotal ? COLORS.purple : COLORS.slate)
        .font(isTotal ? "Helvetica-Bold" : "Helvetica")
        .fontSize(isTotal ? 11 : 9)
        .text(label, summaryX + 14, summaryRowY, { width: 105 })
        .text(value, summaryX + 116, summaryRowY, { width: 90, align: "right" });
      summaryRowY += isTotal ? 20 : 18;
    });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "This is a computer-generated invoice and is valid without a physical signature.",
        40,
        summaryY + 16,
        { width: 260, lineGap: 2 },
      );

    addFooter(doc);
    doc.end();
  });

const sendOrderInvoiceEmail = async (order) => {
  const invoiceNumber = getOrderInvoiceNumber(order);
  const pdfBuffer = await generateInvoicePdfBuffer(order);
  const invoiceEmail = buildInvoiceEmail(order, {
    invoiceNumber,
    formattedTotal: formatCurrency(order.totalAmount),
    paymentMethod: getPaymentMethodLabel(order.paymentMethod),
  });

  await sendEmail({
    to: getBuyerEmail(order),
    subject: invoiceEmail.subject,
    html: invoiceEmail.html,
    text: invoiceEmail.text,
    attachments: [
      {
        filename: `ShopFlowAI-Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  await Order.findByIdAndUpdate(order._id, {
    invoiceEmailSentAt: new Date(),
  });

  return { invoiceNumber, pdfBuffer };
};

const getInvoicePdfForOrder = async (orderId, requestedBy) => {
  const order = await Order.findById(orderId)
    .populate("user", "name email")
    .populate("items.product", "name slug images description sku");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (
    requestedBy.role !== "admin" &&
    order.user?._id?.toString() !== requestedBy.userId.toString()
  ) {
    throw new ApiError(403, "You are not authorized to view this invoice");
  }

  const invoiceNumber = getOrderInvoiceNumber(order);
  const pdfBuffer = await generateInvoicePdfBuffer(order);

  return { invoiceNumber, pdfBuffer };
};

module.exports = {
  formatCurrency,
  generateInvoiceNumber,
  generateInvoicePdfBuffer,
  getInvoicePdfForOrder,
  sendOrderInvoiceEmail,
};
