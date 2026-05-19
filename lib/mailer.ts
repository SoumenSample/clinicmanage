import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  // Don't throw here because some environments (e.g., local dev) may not have SMTP configured.
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendVerificationEmail(to: string, name: string, otp: string) {
  if (!transporter || !SMTP_HOST) {
    console.warn('SMTP not configured, skipping sending email');
    return;
  }

  const html = `
    <p>Hi ${name},</p>
    <p>Your verification code is: <strong>${otp}</strong></p>
    <p>This code will expire in 10 minutes.</p>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: 'Your PharmaManage verification code',
    html,
    text: `Your verification code is: ${otp}`,
  });
}

export default transporter;
