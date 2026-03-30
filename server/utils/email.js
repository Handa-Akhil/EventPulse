import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create a generic transporter. Fallback to testing configurations.
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER || "test@ethereal.email",
      pass: process.env.SMTP_PASS || "testpass",
    },
  });
};

export const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = getTransporter();


    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || `"EventPulse Admin" <${process.env.SMTP_USER || 'admin@eventpulse.com'}>`, // Sender address
      to,
      subject,
      text,
      html: html || text,
    });

    console.log(`✉️ Email sent to ${to}: ${subject}`);
    if (process.env.SMTP_HOST === "smtp.ethereal.email") {
      console.log(`✉️ Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
  }
};
