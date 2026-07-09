const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
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
