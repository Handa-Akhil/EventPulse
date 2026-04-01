import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchUserBookings, fetchBookingTicket } from "../services/api";
import ETicket from "./ETicket";

export default function MyTickets() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [activeQr, setActiveQr] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserBookings(0); // 0 = no limit
      setBookings(data);
    } catch (error) {
      console.error("Failed to load bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewTicket = async (booking) => {
    try {
      const data = await fetchBookingTicket(booking.id);
      setActiveTicket(data.booking);
      setActiveQr(data.qrDataUrl);
    } catch (error) {
      console.error("Failed to load ticket:", error);
    }
  };

  return (
    <main className="page-shell">
      <header className="topbar fade-up">
        <div className="brand-lockup">
          <span className="brand-mark">🎫</span>
          <div>
            <p className="eyebrow">Your Booked Events</p>
            <h2>My Tickets</h2>
          </div>
        </div>
        <Link className="button button--ghost" to="/">
          Back to Dashboard
        </Link>
      </header>

      <section className="section fade-up">
        {isLoading ? (
          <div className="empty-state panel">
            <h3>Loading tickets...</h3>
            <p>Fetching your booking history.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state panel">
            <h3>No tickets yet</h3>
            <p>Book an event to see your e-tickets here.</p>
            <Link className="button button--primary" to="/">
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="tickets-grid">
            {bookings.map((booking) => {
              const reference = booking.id.slice(-6).toUpperCase();
              return (
                <article className="ticket-card panel" key={booking.id}>
                  <div className="ticket-card__accent" />
                  <div className="ticket-card__body">
                    <div className="ticket-card__info">
                      <span className="eyebrow">{booking.dateLabel}</span>
                      <h3>{booking.title}</h3>
                      <p className="supporting-text">{booking.venue}</p>
                    </div>
                    <div className="ticket-card__meta">
                      <div className="ticket-card__detail">
                        <span>Time</span>
                        <strong>{booking.slot}</strong>
                      </div>
                      <div className="ticket-card__detail">
                        <span>Tickets</span>
                        <strong>{booking.quantity}</strong>
                      </div>
                      <div className="ticket-card__detail">
                        <span>Total</span>
                        <strong>Rs. {booking.total}</strong>
                      </div>
                      <div className="ticket-card__detail">
                        <span>Ref</span>
                        <strong>{reference}</strong>
                      </div>
                    </div>
                    <button
                      className="button button--primary"
                      onClick={() => viewTicket(booking)}
                      type="button"
                    >
                      🎟️ View E-Ticket
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* E-Ticket Modal */}
      {activeTicket && (
        <ETicket
          booking={activeTicket}
          qrDataUrl={activeQr}
          onClose={() => {
            setActiveTicket(null);
            setActiveQr(null);
          }}
        />
      )}
    </main>
  );
}
