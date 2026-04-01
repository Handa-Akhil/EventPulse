import nodemailer from "nodemailer";
import { config } from "../config.js";
import fs from "fs";

let transporter = null;

// Initialize transporter with proper configuration
function getTransporter() {
  if (!transporter) {
    const mailConfig = {
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: {
        user: config.mail.user,
        pass: config.mail.pass,
      },
    };

    // Log configuration (without exposing password)
    console.log(`📧 Email Config: host=${mailConfig.host}, port=${mailConfig.port}, user=${mailConfig.auth.user}`);
    
    transporter = nodemailer.createTransport(mailConfig);
  }
  return transporter;
}

export async function sendEmail(to, subject, text, html) {
  if (!config.mail.user || !config.mail.pass) {
    const errorMsg = `[${new Date().toISOString()}] ❌ Email configuration missing: SMTP_USER (${config.mail.user}) or SMTP_PASS is not set.\n`;
    fs.appendFileSync("debug-email.log", errorMsg);
    console.error(errorMsg);
    throw new Error("Email configuration missing");
  }

  try {
    const transporter = getTransporter();
    
    const info = await transporter.sendMail({
      from: config.mail.from || `"EventPulse" <${config.mail.user}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    const successMsg = `[${new Date().toISOString()}] ✉️ Email sent successfully to ${to}: ${info.response}\n`;
    fs.appendFileSync("debug-email.log", successMsg);
    console.log(successMsg);
    return info;
  } catch (error) {
    const failMsg = `[${new Date().toISOString()}] ❌ Email sending failed to ${to}: ${error.message}\nError Stack: ${error.code}\n`;
    fs.appendFileSync("debug-email.log", failMsg);
    console.error(failMsg);
    throw error;
  }
}