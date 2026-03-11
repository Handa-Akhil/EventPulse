import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  return (
    <article className="event-card panel">
      <div
        className="event-card__poster"
        style={{ backgroundImage: event.heroGradient }}
      >
        <span className="tag">{event.category}</span>
        <div>
          <p>{event.city}</p>
          <strong>{event.dateLabel}</strong>
        </div>
      </div>

      <div className="event-card__body">
        <div className="event-card__meta">
          <h3>{event.title}</h3>
          <span>{event.distanceKm.toFixed(1)} km away</span>
        </div>
        <p>{event.shortDescription}</p>

        <div className="event-card__footer">
          <div>
            <strong>Rs. {event.price}</strong>
            <span>{event.venue}</span>
          </div>
          <Link className="button button--ghost" to={`/events/${event.id}`}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
