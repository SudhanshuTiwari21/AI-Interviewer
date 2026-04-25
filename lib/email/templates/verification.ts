type Args = {
  name: string;
  verificationUrl: string;
  ttlHours: number;
};

const BRAND_COLOR = "#0e1220";
const ACCENT = "#3a66f5";

export function verificationEmail({ name, verificationUrl, ttlHours }: Args) {
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
                  <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;color:${BRAND_COLOR};">Hiro Interview</div>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 32px 0 32px;">
                  <h1 style="margin:16px 0 8px;font-size:22px;line-height:1.3;color:${BRAND_COLOR};">Verify your email, ${safeName}</h1>
                  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3e4658;">
                    Welcome to Hiro. Please confirm this email address so we can secure your account and start your first interview.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:8px 32px 8px 32px;">
                  <a href="${verificationUrl}"
                     style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">
                    Verify email
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px 0 32px;">
                  <p style="margin:0 0 6px;font-size:12px;color:#5b6478;">Or paste this link into your browser:</p>
                  <p style="margin:0 0 18px;font-size:12px;word-break:break-all;color:${ACCENT};">
                    <a href="${verificationUrl}" style="color:${ACCENT};text-decoration:none;">${verificationUrl}</a>
                  </p>
                  <p style="margin:0 0 4px;font-size:12px;color:#5b6478;">
                    This link expires in ${ttlHours} hour${ttlHours === 1 ? "" : "s"}.
                  </p>
                  <p style="margin:0 0 24px;font-size:12px;color:#8a93a6;">
                    If you didn't create an Hiro account, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px 28px 32px;border-top:1px solid #eef0f4;">
                  <p style="margin:18px 0 0;font-size:11px;color:#8a93a6;">
                    Hiro Interview · automated message · please do not reply.
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

Welcome to Hiro. Please verify your email by opening this link:

${verificationUrl}

This link expires in ${ttlHours} hour${ttlHours === 1 ? "" : "s"}.

If you didn't create an Hiro account, you can ignore this message.

— Hiro Interview`;

  return {
    subject: "Verify your email · Hiro Interview",
    html,
    text,
  };
}
