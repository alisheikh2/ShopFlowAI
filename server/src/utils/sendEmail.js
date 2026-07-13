const { Resend } = require("resend");

// Resend sends over HTTPS (the Resend API), not raw SMTP. This matters
// because many hosting platforms — Render's free tier included — block or
// unreliably route outbound SMTP (ports 25/465/587), which caused emails to
// fail with "Connection timeout" no matter how the SMTP transport was
// configured. HTTPS to api.resend.com is never blocked the same way.
let resendClient = null;
const getResendClient = () => {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  const { error } = await getResendClient().emails.send({
    from: `ShopFlowAI <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`,
    to,
    subject,
    html,
    text,
    // Resend accepts a Buffer directly for `content` — no base64 conversion needed.
    attachments: attachments.map(({ filename, content }) => ({ filename, content })),
  });

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend");
  }
};

module.exports = sendEmail;
