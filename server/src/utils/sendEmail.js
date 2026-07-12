const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Render's outbound network doesn't reliably support IPv6, and Gmail's
  // SMTP host resolves an AAAA (IPv6) record that then fails with
  // ENETUNREACH. Forcing IPv4 avoids that and prevents the ~2 minute
  // connection timeout blocking the request.
  family: 4,
});

const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  await transporter.sendMail({
    from: `"ShopFlowAI" <${process.env.EMAIL_FROM || process.env.SMTP_USER || "shopflowai.dev@gmail.com"}>`,
    to,
    subject,
    text,
    html,
    attachments,
  });
};

module.exports = sendEmail;