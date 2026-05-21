import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      connectionTimeout: config.mail.timeoutMs,
      greetingTimeout: config.mail.timeoutMs,
      socketTimeout: config.mail.timeoutMs,
      auth: {
        user: config.mail.user,
        pass: config.mail.pass,
      },
    });
  }

  return transporter;
}

export async function sendEmail(to, subject, text, html) {
  if (!config.mail.user || !config.mail.pass) {
    throw new Error("Email configuration missing. Set SMTP_USER and SMTP_PASS.");
  }

  try {
    const info = await getTransporter().sendMail({
      from: config.mail.from || `"EventPulse" <${config.mail.user}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    if (config.logging.enableEmailDebug) {
      console.info("Email sent", {
        to,
        response: info.response,
      });
    }

    return info;
  } catch (error) {
    console.error("Email delivery failed", {
      to,
      code: error.code,
      message: error.message,
    });
    throw error;
  }
}
