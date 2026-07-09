const User = require("../models/user.model");
const ROLES = require("../constants/roles");
const invoiceConfig = require("../config/invoice");
const sendEmail = require("../utils/sendEmail");
const {
  buildAdminNewOrderEmail,
  buildLowStockAlertEmail,
  buildOrderConfirmationEmail,
  buildOrderStatusUpdateEmail,
  buildPaymentFailedEmail,
  buildPaymentSuccessEmail,
} = require("../templates/notificationEmail.template");

const getLowStockThreshold = () => {
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD);
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : 5;
};

const parseEmails = (value = "") =>
  value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

const getAdminRecipients = async () => {
  const envRecipients = parseEmails(process.env.ADMIN_NOTIFICATION_EMAILS);

  if (envRecipients.length > 0) {
    return envRecipients;
  }

  const admins = await User.find({ role: ROLES.ADMIN }).select("email");
  const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

  if (adminEmails.length > 0) {
    return adminEmails;
  }

  return [invoiceConfig.seller.supportEmail].filter(Boolean);
};

const safeSendEmail = async (mailOptions, context) => {
  try {
    if (!mailOptions.to || (Array.isArray(mailOptions.to) && mailOptions.to.length === 0)) {
      return false;
    }

    await sendEmail(mailOptions);
    return true;
  } catch (error) {
    console.error(`${context} email failed:`, error.message);
    return false;
  }
};

const sendOrderConfirmationEmail = async (order) => {
  const email = buildOrderConfirmationEmail(order);

  return safeSendEmail(
    {
      to: order.user?.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    },
    `Order confirmation (${order._id})`,
  );
};

const sendPaymentSuccessEmail = async (order) => {
  const email = buildPaymentSuccessEmail(order);

  return safeSendEmail(
    {
      to: order.user?.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    },
    `Payment success (${order._id})`,
  );
};

const sendPaymentFailedEmail = async (order) => {
  const email = buildPaymentFailedEmail(order);

  return safeSendEmail(
    {
      to: order.user?.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    },
    `Payment failed (${order._id})`,
  );
};

const sendOrderStatusUpdateEmail = async (order, status) => {
  const email = buildOrderStatusUpdateEmail(order, status);

  return safeSendEmail(
    {
      to: order.user?.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    },
    `Order status update (${order._id}:${status})`,
  );
};

const sendAdminNewOrderEmail = async (order) => {
  try {
    const recipients = await getAdminRecipients();
    const email = buildAdminNewOrderEmail(order);

    return await safeSendEmail(
      {
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      `Admin new order (${order._id})`,
    );
  } catch (error) {
    console.error(`Admin new order (${order._id}) email failed:`, error.message);
    return false;
  }
};

const sendLowStockAlertEmail = async (product) => {
  try {
    const threshold = getLowStockThreshold();

    if (Number(product.stock) > threshold) {
      return false;
    }

    const recipients = await getAdminRecipients();
    const email = buildLowStockAlertEmail(product, threshold);

    return await safeSendEmail(
      {
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      `Low stock alert (${product._id})`,
    );
  } catch (error) {
    console.error(`Low stock alert (${product._id}) email failed:`, error.message);
    return false;
  }
};

const sendLowStockAlertsForOrder = async (order) => {
  const sent = [];

  for (const item of order.items || []) {
    const product = item.product;

    if (!product || typeof product !== "object") {
      continue;
    }

    const wasSent = await sendLowStockAlertEmail(product);

    if (wasSent) {
      sent.push(product._id?.toString?.() || product.name);
    }
  }

  return sent;
};

module.exports = {
  getAdminRecipients,
  getLowStockThreshold,
  sendAdminNewOrderEmail,
  sendLowStockAlertEmail,
  sendLowStockAlertsForOrder,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendPaymentFailedEmail,
  sendPaymentSuccessEmail,
};
