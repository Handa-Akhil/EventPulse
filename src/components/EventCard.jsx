import { Link } from "react-router-dom";
import ShareButton from "./ShareButton";
import { StarDisplay } from "./ReviewSection";

export default function EventCard({ event, averageRating = 0 }) {
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
        <div className="text-clamp--1" style={{ width: '100%' }}>
          <p className="text-clamp--1">{event.city}</p>
          <strong className="text-clamp--1">{event.dateLabel}</strong>
        </div>
      </div>

      <div className="event-card__body">
        <div className="event-card__meta">
          <h3 className="event-card__title text-clamp--1" title={event.title}>{event.title}</h3>
          <span className="text-clamp--1">
            {typeof event.distanceKm === "number"
              ? `${event.distanceKm.toFixed(1)} km away`
              : "Distance unavailable"}
          </span>
        </div>

        {averageRating > 0 && (
          <div className="event-card__rating">
            <StarDisplay rating={Math.round(averageRating)} size="0.85rem" />
            <span>{averageRating}</span>
          </div>
        )}

        <p className="text-clamp">{event.shortDescription}</p>

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
          <div className="event-card__pricing text-clamp--1">
            <strong>Rs. {event.price}</strong>
            <span className="text-clamp--1" title={event.venue}>{event.venue}</span>
          </div>
          <div className="event-card__actions">
            <Link className="button button--ghost" to={`/events/${event.id}`}>
              View details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}