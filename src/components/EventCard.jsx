import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  const posterUrl = `/images/events/${event.id}.jpg`;

  return (
    <article className="event-card panel">
      <div
        className="event-card__poster"
        style={{
          backgroundImage: `url(${posterUrl}), ${event.heroGradient}`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
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
          <span>
            {typeof event.distanceKm === "number"
              ? `${event.distanceKm.toFixed(1)} km away`
              : "Distance unavailable"}
          </span>
        </div>

        <p>{event.shortDescription}</p>

        {event.recommendationReason ? (
          <p className="event-card__reason">{event.recommendationReason}</p>
        ) : null}

        {typeof event.seatsLeft === "number" ? (
          <p className="event-card__reason">
            {event.seatsLeft > 0
              ? `${event.seatsLeft} seats left`
              : "Sold out"}
          </p>
        ) : null}

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