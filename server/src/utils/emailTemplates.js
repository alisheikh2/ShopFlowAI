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
        This verification link will expire in 24 hours.
      </small>
    </div>
  `;
};

const passwordResetEmailTemplate = (name, resetUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2>Password Reset Request</h2>

      <p>Hi <strong>${name}</strong>,</p>

      <p>
        We received a request to reset your ShopFlow AI password.
        Click the button below to choose a new one.
      </p>

      <p style="margin:30px 0;">
        
          <a href="${resetUrl}"
          style="
            background:#111827;
            color:#ffffff;
            padding:12px 24px;
            text-decoration:none;
            border-radius:6px;
            display:inline-block;
          "
        >
          Reset Password
        </a>
      </p>

      <p>
        If the button doesn't work, copy and paste this link into your browser:
      </p>

      <p>${resetUrl}</p>

      <hr />

      <small>
        This password reset link will expire in 1 hour.
        If you didn't request this, you can safely ignore this email.
      </small>
    </div>
  `;
};

module.exports = {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
};
