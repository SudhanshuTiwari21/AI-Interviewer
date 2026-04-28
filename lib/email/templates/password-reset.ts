type Args = {
  name: string;
  resetUrl: string;
  ttlMinutes: number;
};

const BRAND_COLOR = "#0e1220";
const ACCENT = "#3a66f5";

export function passwordResetEmail({ name, resetUrl, ttlMinutes }: Args) {
  const safeName = (name || "there").trim().split(/\s+/)[0] || "there";

  const html = `
  <!doctype html>
  <html>
    <body style="margin:0;background:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0e1220;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e7eaf0;overflow:hidden;">
              <tr>
                <td style="padding:28px 32px 8px 32px;">
                  <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;color:${BRAND_COLOR};">Selectwise</div>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 32px 0 32px;">
                  <h1 style="margin:16px 0 8px;font-size:22px;line-height:1.3;color:${BRAND_COLOR};">Reset your password, ${safeName}</h1>
                  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3e4658;">
                    We received a request to reset your Selectwise password. Use the secure button below to set a new password.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:8px 32px 8px 32px;">
                  <a href="${resetUrl}"
                     style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">
                    Reset password
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px 0 32px;">
                  <p style="margin:0 0 6px;font-size:12px;color:#5b6478;">Or paste this link into your browser:</p>
                  <p style="margin:0 0 18px;font-size:12px;word-break:break-all;color:${ACCENT};">
                    <a href="${resetUrl}" style="color:${ACCENT};text-decoration:none;">${resetUrl}</a>
                  </p>
                  <p style="margin:0 0 4px;font-size:12px;color:#5b6478;">
                    This link expires in ${ttlMinutes} minute${ttlMinutes === 1 ? "" : "s"}.
                  </p>
                  <p style="margin:0 0 24px;font-size:12px;color:#8a93a6;">
                    If you did not request this, you can ignore this email safely.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px 28px 32px;border-top:1px solid #eef0f4;">
                  <p style="margin:18px 0 0;font-size:11px;color:#8a93a6;">
                    Selectwise · automated message · please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const text = `Hi ${safeName},

We received a request to reset your Selectwise password.

Reset link:
${resetUrl}

This link expires in ${ttlMinutes} minute${ttlMinutes === 1 ? "" : "s"}.

If you did not request this reset, you can ignore this message.

— Selectwise`;

  return {
    subject: "Reset your password · Selectwise",
    html,
    text,
  };
}
