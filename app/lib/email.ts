import nodemailer from "nodemailer";

/**
 * Check SMTP config live from process.env on each call — not at module load time.
 * Module-level constants would be frozen when the file is first imported,
 * permanently returning false if SMTP vars aren't set at that exact moment.
 */
function checkConfigured(): boolean {
  return (
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_FROM
  );
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!checkConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      ...(process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          }
        : {}),
    });
  }
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html: html || text,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return checkConfigured();
}
