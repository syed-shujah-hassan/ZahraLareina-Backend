import nodemailer from 'nodemailer';

// Configure your SMTP credentials via environment variables:
// EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM

let cachedTransporter = null;

const getTransporter = () => {
  const hasSmtpConfig = !!process.env.EMAIL_HOST && !!process.env.EMAIL_USER;

  if (!hasSmtpConfig) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return cachedTransporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com';
  const transporter = getTransporter();

  // In development, if no SMTP config is present, just log instead of trying to send
  if (!transporter) {
    console.log('DEV ONLY - Email:', { to, subject, html });
    return;
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async ({ to, code }) => {
  const html = `
    <p>Welcome to ZahraLareina Luxe!</p>
    <p>Your verification code is:</p>
    <h2 style="letter-spacing:4px;">${code}</h2>
    <p>This code will expire in 10 minutes.</p>
  `;

  await sendEmail({
    to,
    subject: 'Verify your email address',
    html,
  });
};
