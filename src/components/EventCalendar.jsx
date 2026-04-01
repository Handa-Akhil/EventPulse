import { useState } from "react";
import { Link } from "react-router-dom";

export default function EventCalendar({ events = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Parse event dates into a lookup map
  const eventsByDate = {};
  for (const event of events) {
    if (!event.eventDate && !event.dateLabel) continue;

    let dateKey;
    if (event.eventDate) {
      const d = new Date(event.eventDate);
      if (!isNaN(d.getTime())) {
        dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }
    }

    if (!dateKey && event.dateLabel) {
      // Try parsing dateLabel (e.g. "Sat, 15 Mar 2026")
      const d = new Date(event.dateLabel);
      if (!isNaN(d.getTime())) {
        dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }
    }

    if (dateKey) {
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push(event);
    }
  }

  const today = new Date();
  const isToday = (day) =>
    today.getDate() === day &&
    today.getMonth() === month &&
    today.getFullYear() === year;

  const getEventsForDay = (day) => {
    const key = `${year}-${month}-${day}`;
    return eventsByDate[key] || [];
  };

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div className="cal-cell cal-cell--empty" key={`empty-${i}`} />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    const hasEvents = dayEvents.length > 0;

    cells.push(
      <div
        className={`cal-cell ${isToday(day) ? "cal-cell--today" : ""} ${hasEvents ? "cal-cell--has-events" : ""}`}
        key={day}
      >
        <div className="cal-cell__day">{day}</div>
        {hasEvents && (
          <div className="cal-cell__events">
            {dayEvents.slice(0, 3).map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="cal-event-tag"
                title={`${event.title} at ${event.venue}`}
              >
                {event.title}
              </Link>
            ))}
            {dayEvents.length > 3 && (
              <div className="cal-event-tag cal-event-tag--more">
                +{dayEvents.length - 3} more...
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="calendar panel">
      <div className="calendar__nav">
        <button className="button button--ghost" onClick={prevMonth} type="button">
          ←
        </button>
        <h3>{monthNames[month]} {year}</h3>
        <button className="button button--ghost" onClick={nextMonth} type="button">
          →
        </button>
      </div>

      <div className="calendar__header">
        {dayNames.map((day) => (
          <div className="cal-header-cell" key={day}>{day}</div>
        ))}
      </div>

      <div className="calendar__grid">
        {cells}
      </div>
    </div>
  );
}
