const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const authEmailLayout = ({ preheader, title, subtitle, body, footerNote }) => `
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
                    <a href="mailto:shopflowai.dev@gmail.com" style="color:#0F67F5; font-weight:700; text-decoration:none;">shopflowai.dev@gmail.com</a>
                    or +923346956216.
                  </p>
                  <p style="margin:0; font-size:12px; line-height:1.5; color:#64748B;">
                    ${escapeHtml(footerNote || "This is an automated email from ShopFlowAI. Smart Shopping. Smarter Business.")}
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

const authButton = (url, label) => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 22px;">
    <tr>
      <td style="border-radius:12px; background:#0F67F5; background:linear-gradient(135deg,#0F67F5,#6D28E9);">
        <a href="${escapeHtml(url)}" style="display:inline-block; padding:14px 24px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:800; border-radius:12px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>
`;

const fallbackLinkBox = (url) => `
  <div style="background:#EEF4FF; border-left:4px solid #0F67F5; border-radius:12px; padding:14px 16px; color:#334155; font-size:13px; line-height:1.6; word-break:break-all;">
    <strong style="color:#020A2F;">Button not working?</strong><br />
    Copy and paste this link into your browser:<br />
    <a href="${escapeHtml(url)}" style="color:#0F67F5; font-weight:700; text-decoration:none;">${escapeHtml(url)}</a>
  </div>
`;

const verificationEmailTemplate = (name, verificationUrl) => {
  const body = `
    <p style="margin:0 0 14px; font-size:16px; line-height:1.6;">Hi <strong>${escapeHtml(name)}</strong>,</p>
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      Thank you for creating your ShopFlowAI account. Please verify your email address to activate your account and start shopping smarter.
    </p>

    ${authButton(verificationUrl, "Verify Email")}

    ${fallbackLinkBox(verificationUrl)}

    <div style="margin-top:22px; padding:14px 16px; background:#FFF7ED; border-left:4px solid #F97316; border-radius:12px; color:#7C2D12; font-size:13px; line-height:1.6;">
      This verification link will expire in <strong>24 hours</strong>. If you did not create this account, you can safely ignore this email.
    </div>
  `;

  return authEmailLayout({
    preheader: "Verify your ShopFlowAI account to activate your profile.",
    title: "Verify your email",
    subtitle: "One quick step to activate your ShopFlowAI account.",
    body,
    footerNote: "This verification email was sent because a ShopFlowAI account was created using this email address.",
  });
};

const passwordResetEmailTemplate = (name, resetUrl) => {
  const body = `
    <p style="margin:0 0 14px; font-size:16px; line-height:1.6;">Hi <strong>${escapeHtml(name)}</strong>,</p>
    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
      We received a request to reset your ShopFlowAI password. Click the button below to create a new password securely.
    </p>

    ${authButton(resetUrl, "Reset Password")}

    ${fallbackLinkBox(resetUrl)}

    <div style="margin-top:22px; padding:14px 16px; background:#FFF7ED; border-left:4px solid #F97316; border-radius:12px; color:#7C2D12; font-size:13px; line-height:1.6;">
      This password reset link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email or contact support.
    </div>
  `;

  return authEmailLayout({
    preheader: "Reset your ShopFlowAI password securely.",
    title: "Reset your password",
    subtitle: "Use the secure link below to choose a new password.",
    body,
    footerNote: "This password reset email was sent because a reset request was made for your ShopFlowAI account.",
  });
};

const invoiceEmailTemplate = (order, invoice) => {
  const customerName =
    order.user?.name || order.billingAddress?.fullName || order.shippingAddress?.fullName || "Customer";

  return `
    <div style="font-family: Arial, sans-serif; max-width:640px; margin:auto; color:#020A2F;">
      <div style="background:linear-gradient(135deg,#0F67F5,#020A2F 58%,#6D28E9); color:#ffffff; padding:22px 26px; border-radius:12px 12px 0 0;">
        <h1 style="margin:0; font-size:24px;">ShopFlowAI Invoice</h1>
        <p style="margin:8px 0 0; color:#DDE7FF;">Smart Shopping. Smarter Business. Your professional PDF invoice is attached.</p>
      </div>

      <div style="border:1px solid #DDE7FF; border-top:0; padding:26px; border-radius:0 0 12px 12px;">
        <p>Hi <strong>${escapeHtml(customerName)}</strong>,</p>

        <p>
          Thank you for shopping with ShopFlowAI. Your order has been placed successfully,
          and the PDF invoice is attached with this email.
        </p>

        <table style="width:100%; border-collapse:collapse; margin:22px 0;">
          <tr>
            <td style="padding:10px; border:1px solid #DDE7FF; background:#F7F9FF; width:42%;"><strong>Invoice / Order ID</strong></td>
            <td style="padding:10px; border:1px solid #DDE7FF;">${escapeHtml(invoice.invoiceNumber)}</td>
          </tr>
          <tr>
            <td style="padding:10px; border:1px solid #DDE7FF; background:#F7F9FF;"><strong>Payment Method</strong></td>
            <td style="padding:10px; border:1px solid #DDE7FF;">${escapeHtml(invoice.paymentMethod)}</td>
          </tr>
          <tr>
            <td style="padding:10px; border:1px solid #DDE7FF; background:#F7F9FF;"><strong>Grand Total</strong></td>
            <td style="padding:10px; border:1px solid #DDE7FF;"><strong>${escapeHtml(invoice.formattedTotal)}</strong></td>
          </tr>
        </table>

        <p>
          If you have any questions about your order or invoice, reply to this email and our support team will help you.
        </p>

        <hr style="border:none; border-top:1px solid #DDE7FF; margin:24px 0;" />

        <small style="color:#64748B;">
          This is an automated email from ShopFlowAI. Please keep the attached invoice for your records.
        </small>
      </div>
    </div>
  `;
};

module.exports = {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  invoiceEmailTemplate,
};
