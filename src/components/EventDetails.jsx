
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createBooking,
  fetchEventDetails,
  fetchSavedLocation,
} from "../services/api";

export default function EventDetails() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [selectedShowtime, setSelectedShowtime] = useState("");
  const [quantity, setQuantity] = useState(2);
  const [bookingMessage, setBookingMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadEvent() {
      setIsLoading(true);
      setLoadError("");
      setBookingMessage("");

      try {
        let savedLocation = null;

        try {
          savedLocation = await fetchSavedLocation();
        } catch {
          savedLocation = null;
        }

        const eventDetails = await fetchEventDetails(eventId, savedLocation);

        if (!ignore) {
          setEvent(eventDetails);
          setSelectedShowtime(eventDetails.showtimes[0] ?? "");
          setQuantity(
            typeof eventDetails.seatsLeft === "number"
              ? Math.min(2, Math.max(1, eventDetails.seatsLeft || 1))
              : 2,
          );
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error.message);
          setEvent(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadEvent();

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const adjustQuantity = (delta) => {
    const maxTickets =
      typeof event?.seatsLeft === "number"
        ? Math.min(20, Math.max(1, event.seatsLeft))
        : 20;

    setQuantity((current) => Math.min(maxTickets, Math.max(1, current + delta)));
  };

  const handleBooking = async () => {
    if (!event || !selectedShowtime) {
      return;
    }

    setIsBooking(true);

    try {
      const booking = await createBooking({
        eventId: event.id,
        slot: selectedShowtime,
        quantity,
      });

      setBookingMessage(
        `Booking confirmed. Reference ${booking.id.slice(-6).toUpperCase()} for ${booking.quantity} ticket(s) at ${booking.slot}.`,
      );

      if (typeof event.seatsLeft === "number") {
        const updatedSeatsLeft = Math.max(event.seatsLeft - booking.quantity, 0);

        setEvent((current) =>
          current
            ? {
                ...current,
                seatsLeft: updatedSeatsLeft,
              }
            : current,
        );

        setQuantity(Math.min(2, Math.max(1, updatedSeatsLeft || 1)));
      }
    } catch (error) {
      setBookingMessage(error.message);
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <main className="page-shell details-page">
        <div className="empty-state panel fade-up">
          <h2>Loading event details...</h2>
          <p>Fetching event information from the backend.</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="page-shell details-page">
        <div className="empty-state panel fade-up">
          <h2>Event not found.</h2>
          <p>{loadError || "The selected event is unavailable."}</p>
          <Link className="button button--primary" to="/">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const posterUrl = `/images/events/${event.id}.jpg`;
  const total = quantity * event.price;
  const isSoldOut = typeof event.seatsLeft === "number" && event.seatsLeft <= 0;
  const maxTickets =
    typeof event.seatsLeft === "number"
      ? Math.min(20, Math.max(1, event.seatsLeft))
      : 20;

  return (
    <main className="page-shell details-page">
      <div className="details-actions fade-up">
        <button className="button button--ghost" onClick={() => navigate(-1)} type="button">
          Back
        </button>
        <Link className="button button--ghost" to="/">
          Dashboard
        </Link>
      </div>

      <section className="details-hero panel fade-up">
        <div
          className="details-hero__visual"
          style={{
            backgroundImage: `url(${posterUrl}), ${event.heroGradient}`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <span className="tag">{event.category}</span>
          <h1>{event.title}</h1>
          <p>{event.shortDescription}</p>
        </div>

        <div className="details-summary">
          <span className="eyebrow">{event.city}</span>
          <h2>{event.venue}</h2>
          <div className="details-meta">
            <span>{event.dateLabel}</span>
            <span>{event.duration}</span>
            <span>{event.language}</span>
            <span>{event.audience}</span>
          </div>
          <p>{event.description}</p>
          <div className="chip-row">
            {event.highlights.map((highlight) => (
              <span className="chip static" key={highlight}>
                {highlight}
              </span>
            ))}
          </div>

          {typeof event.seatsLeft === "number" ? (
            <p className="supporting-text">
              {event.seatsLeft > 0
                ? `${event.seatsLeft} seats left`
                : "Sold out"}
            </p>
          ) : null}

          {event.distanceKm !== null && event.distanceKm !== undefined ? (
            <p className="supporting-text">
              Approx. {event.distanceKm.toFixed(1)} km from your selected location.
            </p>
          ) : null}
        </div>
      </section>

      <section className="details-grid fade-up">
        <article className="panel content-card">
          <span className="eyebrow">About this event</span>
          <h3>What to expect</h3>
          <p>{event.description}</p>
          <ul className="detail-list">
            <li>Venue: {event.venue}</li>
            <li>Date: {event.dateLabel}</li>
            <li>Language: {event.language}</li>
            <li>Audience: {event.audience}</li>
            {typeof event.seatCapacity === "number" ? (
              <li>Total seats: {event.seatCapacity}</li>
            ) : null}
            {typeof event.seatsLeft === "number" ? (
              <li>Seats left: {event.seatsLeft}</li>
            ) : null}
          </ul>
        </article>

        <aside className="panel booking-card">
          <span className="eyebrow">Book tickets</span>
          <h3>Reserve your seats</h3>

          <div className="booking-block">
            <span>Select showtime</span>
            <div className="showtime-list">
              {event.showtimes.map((showtime) => (
                <button
                  className={selectedShowtime === showtime ? "chip is-active" : "chip"}
                  disabled={isSoldOut}
                  key={showtime}
                  onClick={() => setSelectedShowtime(showtime)}
                  type="button"
                >
                  {showtime}
                </button>
              ))}
            </div>
          </div>

          <div className="booking-block">
            <span>Tickets</span>
            <div className="quantity-control">
              <button
                className="chip"
                disabled={isSoldOut || quantity <= 1}
                onClick={() => adjustQuantity(-1)}
                type="button"
              >
                -
              </button>
              <strong>{quantity}</strong>
              <button
                className="chip"
                disabled={isSoldOut || quantity >= maxTickets}
                onClick={() => adjustQuantity(1)}
                type="button"
              >
                +
              </button>
            </div>
          </div>

          {typeof event.seatsLeft === "number" ? (
            <div className="pricing-row">
              <span>Availability</span>
              <strong>{event.seatsLeft > 0 ? `${event.seatsLeft} left` : "Sold out"}</strong>
            </div>
          ) : null}

          <div className="pricing-row">
            <span>Price per ticket</span>
            <strong>Rs. {event.price}</strong>
          </div>
          <div className="pricing-row total">
            <span>Total</span>
            <strong>Rs. {total}</strong>
          </div>

          <button
            className="button button--primary"
            disabled={isBooking || isSoldOut || !selectedShowtime}
            onClick={() => void handleBooking()}
            type="button"
          >
            {isBooking ? "Booking..." : isSoldOut ? "Sold out" : "Book event"}
          </button>

          {bookingMessage ? (
            <p
              className={
                bookingMessage.startsWith("Booking confirmed")
                  ? "message message--success"
                  : "message message--error"
              }
            >
              {bookingMessage}
            </p>
          ) : null}

          {loadError ? <p className="message message--error">{loadError}</p> : null}
        </aside>
      </section>
    </main>
  );
}