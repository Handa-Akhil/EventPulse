import { Link } from "react-router-dom";

export default function BookingSuccessModal({
  booking,
  notification,
  onClose,
}) {
  if (!booking) {
    return null;
  }

  const reference = booking.id.slice(-6).toUpperCase();

  return (
    <div className="modal-backdrop">
      <div className="modal-card panel fade-up success-modal">
        <div className="modal-card__header">
          <div>
            <span className="eyebrow">Booking successful</span>
            <h2>Your tickets are confirmed.</h2>
          </div>
          <span className="results-pill">Ref {reference}</span>
        </div>

        <p className="lead">
          {booking.title} is booked for {booking.dateLabel} at {booking.slot}.
        </p>

        <div className="success-modal__summary">
          <article className="meta-tile">
            <span>Venue</span>
            <strong>{booking.venue}</strong>
          </article>
          <article className="meta-tile">
            <span>Tickets</span>
            <strong>{booking.quantity}</strong>
          </article>
          <article className="meta-tile">
            <span>Total paid</span>
            <strong>Rs. {booking.total}</strong>
          </article>
          <article className="meta-tile">
            <span>Booking reference</span>
            <strong>{reference}</strong>
          </article>
        </div>

        <p
          className={
            notification?.emailSent ? "message message--success" : "message"
          }
        >
          {notification?.message || "Booking confirmed successfully."}
        </p>

        <div className="modal-actions">
          <button className="button button--ghost" onClick={onClose} type="button">
            Continue browsing
          </button>
          <Link className="button button--primary" to="/">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
