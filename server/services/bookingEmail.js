import { config } from "../config.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSuggestedEventLine(event) {
  const distanceLabel =
    event.distanceKm !== null && event.distanceKm !== undefined
      ? ` | ${event.distanceKm.toFixed(1)} km away`
      : "";

  return `${event.title} | ${event.category} | ${event.dateLabel} | ${event.venue} | Rs. ${event.price}${distanceLabel}`;
}

function buildEmailText({ user, booking, bookedEvent, suggestedEvents }) {
  const suggestedSection =
    suggestedEvents.length > 0
      ? suggestedEvents.map(formatSuggestedEventLine).join("\n")
      : "No additional nearby recommendations are available right now.";

  return [
    `Hi ${user.name},`,
    "",
    "Your booking has been confirmed successfully.",
    "",
    `Event: ${bookedEvent.title}`,
    `Venue: ${bookedEvent.venue}`,
    `Date: ${booking.dateLabel}`,
    `Time: ${booking.slot}`,
    `Tickets: ${booking.quantity}`,
    `Total: Rs. ${booking.total}`,
    `Booking reference: ${booking.id.slice(-6).toUpperCase()}`,
    "",
    "Other events you can also book:",
    suggestedSection,
    "",
    "Thank you for using EventPulse.",
  ].join("\n");
}

function buildEmailHtml({ user, booking, bookedEvent, suggestedEvents }) {
  const suggestedSection =
    suggestedEvents.length > 0
      ? suggestedEvents
          .map(
            (event) => `
              <li style="margin-bottom:12px;">
                <strong>${escapeHtml(event.title)}</strong><br />
                ${escapeHtml(event.category)} | ${escapeHtml(event.dateLabel)}<br />
                ${escapeHtml(event.venue)}<br />
                Rs. ${escapeHtml(event.price)}
                ${
                  event.distanceKm !== null && event.distanceKm !== undefined
                    ? ` | ${escapeHtml(event.distanceKm.toFixed(1))} km away`
                    : ""
                }
              </li>
            `,
          )
          .join("")
      : "<li>No additional nearby recommendations are available right now.</li>";

  return `
    <div style="font-family: Arial, sans-serif; color: #1b1b1b; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">Booking confirmed</h2>
      <p>Hi ${escapeHtml(user.name)}, your booking has been confirmed successfully.</p>

      <div style="padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Event:</strong> ${escapeHtml(bookedEvent.title)}</p>
        <p style="margin: 0 0 8px;"><strong>Venue:</strong> ${escapeHtml(bookedEvent.venue)}</p>
        <p style="margin: 0 0 8px;"><strong>Date:</strong> ${escapeHtml(booking.dateLabel)}</p>
        <p style="margin: 0 0 8px;"><strong>Time:</strong> ${escapeHtml(booking.slot)}</p>
        <p style="margin: 0 0 8px;"><strong>Tickets:</strong> ${escapeHtml(booking.quantity)}</p>
        <p style="margin: 0 0 8px;"><strong>Total:</strong> Rs. ${escapeHtml(booking.total)}</p>
        <p style="margin: 0;"><strong>Booking reference:</strong> ${escapeHtml(booking.id.slice(-6).toUpperCase())}</p>
      </div>

      <h3 style="margin-bottom: 10px;">Other events you can book</h3>
      <ul style="padding-left: 20px;">
        ${suggestedSection}
      </ul>

      <p style="margin-top: 20px;">Thank you for using EventPulse.</p>
    </div>
  `;
}

async function loadTransporter() {
  if (!config.mail.host || !config.mail.from) {
    return null;
  }

  try {
    const { default: nodemailer } = await import("nodemailer");

    return nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth:
        config.mail.user && config.mail.pass
          ? {
              user: config.mail.user,
              pass: config.mail.pass,
            }
          : undefined,
    });
  } catch (error) {
    if (error && error.code === "ERR_MODULE_NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

export async function sendBookingConfirmationEmail({
  user,
  booking,
  bookedEvent,
  suggestedEvents,
}) {
  const transporter = await loadTransporter();

  if (!transporter) {
    return {
      emailSent: false,
      message:
        "Booking confirmed. Email notifications are not configured yet on the server.",
    };
  }

  try {
    await transporter.sendMail({
      from: config.mail.from,
      to: user.email,
      subject: `Booking confirmed: ${bookedEvent.title}`,
      text: buildEmailText({ user, booking, bookedEvent, suggestedEvents }),
      html: buildEmailHtml({ user, booking, bookedEvent, suggestedEvents }),
    });

    return {
      emailSent: true,
      message: `Booking confirmed. A confirmation email was sent to ${user.email}.`,
    };
  } catch (error) {
    console.error("Failed to send booking confirmation email", error);

    return {
      emailSent: false,
      message:
        "Booking confirmed, but the confirmation email could not be delivered from the server.",
    };
  }
}
