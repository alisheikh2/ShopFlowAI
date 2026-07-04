const verificationEmailTemplate = (name, verificationUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2>Welcome to ShopFlow AI 👋</h2>

      <p>Hi <strong>${name}</strong>,</p>

      <p>
        Thank you for creating your account.
        Please verify your email address by clicking the button below.
      </p>

      <p style="margin:30px 0;">
        <a
          href="${verificationUrl}"
          style="
            background:#111827;
            color:#ffffff;
            padding:12px 24px;
            text-decoration:none;
            border-radius:6px;
            display:inline-block;
          "
        >
          Verify Email
        </a>
      </p>

      <p>
        If the button doesn't work, copy and paste this link into your browser:
      </p>

      <p>${verificationUrl}</p>

      <hr />

      <small>
        This verification link will expire in 1 hour.
      </small>
    </div>
  `;
};

module.exports = {
  verificationEmailTemplate,
};