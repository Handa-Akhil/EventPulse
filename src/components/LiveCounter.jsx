import { useEffect, useState } from "react";
import socket from "../socket";
import ShareButton from "./ShareButton";

export default function LiveCounter({ event }) {
  const [seatsLeft, setSeatsLeft] = useState(event?.seatsLeft ?? null);
  const [viewerCount, setViewerCount] = useState(0);
  const [countdown, setCountdown] = useState(null);

  // Socket.io: join event room for live updates
  useEffect(() => {
    if (!event?.id) return;

    socket.emit("join-event", event.id);

    const handleSeatsUpdated = (data) => {
      if (data.eventId === event.id) {
        setSeatsLeft(data.seatsLeft);
      }
    };

    const handleViewerCount = (data) => {
      if (data.eventId === event.id) {
        setViewerCount(data.viewerCount);
      }
    };

    socket.on("seats-updated", handleSeatsUpdated);
    socket.on("viewer-count", handleViewerCount);

    return () => {
      socket.emit("leave-event", event.id);
      socket.off("seats-updated", handleSeatsUpdated);
      socket.off("viewer-count", handleViewerCount);
    };
  }, [event?.id]);

  // Countdown timer
  useEffect(() => {
    if (!event?.eventDate) {
      setCountdown(null);
      return;
    }

    const eventTime = new Date(event.eventDate).getTime();
    if (isNaN(eventTime)) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = eventTime - now;

      if (diff <= 0) {
        setCountdown({ expired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds, expired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event?.eventDate]);

  return (
    <div className="live-counter">
      {/* Countdown */}
      {countdown && !countdown.expired && (
        <div className="live-counter__countdown">
          <div className="live-counter__countdown-header">
            <span className="eyebrow" style={{ margin: 0 }}>Event starts in</span>
            <ShareButton event={event} />
          </div>
          <div className="countdown-grid">
            <div className="countdown-unit">
              <strong>{countdown.days}</strong>
              <span>Days</span>
            </div>
            <div className="countdown-unit">
              <strong>{countdown.hours}</strong>
              <span>Hours</span>
            </div>
            <div className="countdown-unit">
              <strong>{countdown.minutes}</strong>
              <span>Min</span>
            </div>
            <div className="countdown-unit">
              <strong>{countdown.seconds}</strong>
              <span>Sec</span>
            </div>
          </div>
        </div>
      )}

      {countdown?.expired && (
        <div className="live-counter__live-badge">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1 }}>
            <span className="live-pulse" />
            <strong>Event is LIVE!</strong>
          </div>
          <ShareButton event={event} />
        </div>
      )}

      {/* Live stats */}
      <div className="live-counter__stats">
        {/* ... existing stats ... */}
        {typeof seatsLeft === "number" && (
          <div className="live-stat">
            <span className="live-stat__icon">💺</span>
            <div>
              <strong className={seatsLeft <= 10 ? "text-urgent" : ""}>
                {seatsLeft}
              </strong>
              <span>seats left</span>
            </div>
          </div>
        )}

        {viewerCount > 0 && (
          <div className="live-stat">
            <span className="live-stat__icon">
              <span className="live-pulse-small" />
              👀
            </span>
            <div>
              <strong>{viewerCount}</strong>
              <span>viewing now</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
