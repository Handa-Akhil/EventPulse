import nodemailer from "nodemailer";
import { config } from "../config.js";

async function runTest() {
  console.log("🚀 Starting SMTP diagnostic...");
  console.log(`📡 Host: ${config.mail.host}`);
  console.log(`🔌 Port: ${config.mail.port}`);
  console.log(`👤 User: ${config.mail.user}`);
  
  if (!config.mail.user || !config.mail.pass) {
     console.error("❌ ERROR: SMTP_USER or SMTP_PASS is missing in config!");
     process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
  });

  try {
    console.log("⏳ Verifying connection...");
    await transporter.verify();
    console.log("✅ SUCCESS: SMTP connection is verified and ready!");
    
    console.log("📧 Attempting to send a test email...");
    const info = await transporter.sendMail({
      from: config.mail.from,
      to: config.mail.user,
      subject: "EventPulse SMTP Test",
      text: "Connection verified. Everything is working!",
    });
    console.log(`✅ Email sent: ${info.response}`);
  } catch (error) {
    console.error("\n❌ DIAGNOSTIC FAILED!");
    console.error(`🔴 Error: ${error.message}`);
    if (error.message.includes("535")) {
      console.error("💡 TIP: This usually means the App Password is wrong or 'Less Secure Apps' is off.");
    }
    process.exit(1);
  }
}

runTest();
