import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import EventCard from "./EventCard";
import { CITY_OPTIONS, DEFAULT_CITY } from "../data/events";
import { fetchCurrentLocation } from "../utils/geo";
import {
  fetchNearbyEvents,
  fetchRecommendedEvents,
  fetchSavedLocation,
  fetchUserBookings,
  saveUserLocation,
} from "../services/api";

export default function Dashboard({ currentUser, onLogout }) {
  const [location, setLocation] = useState(currentUser.savedLocation ?? null);
  const [events, setEvents] = useState([]);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [locationError, setLocationError] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [recommendedError, setRecommendedError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const deferredSearch = useDeferredValue(searchTerm);
  const attemptedLocationRef = useRef(Boolean(currentUser.savedLocation));
  const preferenceList = currentUser.preferences ?? [];
  const categories = ["All", ...preferenceList];

  const persistLocation = async (nextLocation) => {
    setLocation(nextLocation);

    try {
      await saveUserLocation(nextLocation);
    } catch (error) {
      setLocationError(error.message);
    }
  };

  const detectLocation = async () => {
    setIsResolvingLocation(true);
    setLocationError("");

    try {
      const resolvedLocation = await fetchCurrentLocation();
      await persistLocation(resolvedLocation);
    } catch (error) {
      const fallbackLocation = location || DEFAULT_CITY;

      if (!location) {
        await persistLocation(DEFAULT_CITY);
      }

      // Better error messages for different scenarios
      if (error.message.includes("permission")) {
        setLocationError(
          `Location permission denied. To enable: Click the lock icon in your browser's address bar → Site settings → Allow location access. Then try again.`,
        );
      } else if (error.message.includes("unavailable")) {
        setLocationError(error.message);
      } else if (error.message.includes("timeout")) {
        setLocationError(error.message);
      } else {
        setLocationError(
          `${error.message} Using ${fallbackLocation.city} instead.`,
        );
      }
    } finally {
      setIsResolvingLocation(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadDashboardMeta() {
      setBookingsError("");
      setIsLoadingBookings(true);

      try {
        const [savedLocation, bookings] = await Promise.all([
          fetchSavedLocation(),
          fetchUserBookings(3),
        ]);

        if (ignore) {
          return;
        }

        if (savedLocation) {
          setLocation(savedLocation);
          attemptedLocationRef.current = true;
        }

        setRecentBookings(bookings);
      } catch (error) {
        if (!ignore) {
          setBookingsError(error.message);
        }
      } finally {
        if (!ignore) {
          setIsLoadingBookings(false);
        }
      }
    }

    void loadDashboardMeta();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (attemptedLocationRef.current || location) {
      return;
    }

    // Don't auto-detect location on first load
    // Instead, just set to default city and let user choose
    if (!currentUser.savedLocation) {
      attemptedLocationRef.current = true;
      setLocation(DEFAULT_CITY);
      return;
    }

    attemptedLocationRef.current = true;
    void detectLocation();
  }, [location, currentUser.savedLocation]);

  useEffect(() => {
    let ignore = false;

    async function loadRecommendedEvents() {
      if (!location) {
        setRecommendedEvents([]);
        return;
      }

      setRecommendedError("");
      setIsLoadingRecommended(true);

      try {
        const recommended = await fetchRecommendedEvents({
          lat: location.lat,
          lng: location.lng,
          search: deferredSearch.trim(),
          rangeKm: 40,
        });

        if (!ignore) {
          setRecommendedEvents(recommended);
        }
      } catch (error) {
        if (!ignore) {
          setRecommendedEvents([]);
          setRecommendedError(error.message);
        }
      } finally {
        if (!ignore) {
          setIsLoadingRecommended(false);
        }
      }
    }

    void loadRecommendedEvents();

    return () => {
      ignore = true;
    };
  }, [deferredSearch, location?.lat, location?.lng]);

  useEffect(() => {
    let ignore = false;

    async function loadEvents() {
      if (!location || preferenceList.length === 0) {
        setEvents([]);
        return;
      }

      setEventsError("");
      setIsLoadingEvents(true);

      try {
        const nearbyEvents = await fetchNearbyEvents({
          lat: location.lat,
          lng: location.lng,
          search: deferredSearch.trim(),
          category: activeCategory,
          rangeKm: 40,
        });

        if (!ignore) {
          setEvents(nearbyEvents);
        }
      } catch (error) {
        if (!ignore) {
          setEvents([]);
          setEventsError(error.message);
        }
      } finally {
        if (!ignore) {
          setIsLoadingEvents(false);
        }
      }
    }

    void loadEvents();

    return () => {
      ignore = true;
    };
  }, [
    activeCategory,
    deferredSearch,
    location?.lat,
    location?.lng,
    preferenceList.join("|"),
  ]);

  const handleManualCityChange = (event) => {
    const city = CITY_OPTIONS.find((option) => option.city === event.target.value);

    if (!city) {
      return;
    }

    setLocationError("");
    startTransition(() => {
      setActiveCategory("All");
      setLocation(city);
    });

    void saveUserLocation(city).catch((error) => {
      setLocationError(error.message);
    });
  };

  return (
    <main className="page-shell dashboard-shell">
      <header className="topbar fade-up">
        <div className="brand-lockup">
          <span className="brand-mark">EP</span>
          <div>
            <p className="eyebrow">Personalized event dashboard</p>
            <h2>EventPulse</h2>
          </div>
        </div>

        <div className="topbar__actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link to="/create-event" className="button button--primary" style={{ padding: "8px 16px" }}>
            + Create Event
          </Link>
          <div className="topbar__user">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.email}</span>
          </div>
          <button
            className="button button--ghost"
            onClick={() => void onLogout()}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="hero-panel panel fade-up">
        <div className="hero-panel__content">
          <span className="eyebrow">
            {location?.source === "gps" ? "Detected from your device" : "Manual city mode"}
          </span>
          <h1>Your next plan should be close, relevant, and easy to book.</h1>
          <p className="lead">
            Showing events within 40 km of{" "}
            <strong>{location?.label || "your selected city"}</strong>, filtered
            by your saved preferences from MySQL.
          </p>

          <div className="location-controls">
            <div className="control-card">
              <span>Current location</span>
              <strong>{location?.label || "Detecting your city..."}</strong>
            </div>
            <label className="control-card">
              <span>Change city</span>
              <select
                onChange={handleManualCityChange}
                value={location?.city || DEFAULT_CITY.city}
              >
                {CITY_OPTIONS.map((city) => (
                  <option key={city.city} value={city.city}>
                    {city.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button--secondary"
              disabled={isResolvingLocation}
              onClick={() => void detectLocation()}
              type="button"
            >
              {isResolvingLocation ? "Refreshing..." : "Use current location"}
            </button>
          </div>

          {locationError ? <p className="message">{locationError}</p> : null}
        </div>

        <div className="hero-panel__metrics">
          <article className="metric-card">
            <strong>{recommendedEvents.length}</strong>
            <span>recommended events</span>
          </article>
          <article className="metric-card">
            <strong>{preferenceList.length}</strong>
            <span>saved preference categories</span>
          </article>
          <article className="metric-card">
            <strong>{recentBookings.length}</strong>
            <span>recent MySQL-backed bookings</span>
          </article>
        </div>
      </section>

      <section className="section fade-up">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Personalized for the signed-in user</span>
            <h2>Recommended for you</h2>
          </div>
        </div>

        {recommendedError ? (
          <p className="message message--error">{recommendedError}</p>
        ) : null}

        {isLoadingRecommended ? (
          <div className="empty-state panel">
            <h3>Loading recommendations...</h3>
            <p>Finding events based on your bookings and interests.</p>
          </div>
        ) : recommendedEvents.length > 0 ? (
          <div className="event-grid">
            {recommendedEvents.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state panel">
            <h3>No recommendations yet.</h3>
            <p>Book a few events or set preferences to see personalized suggestions.</p>
          </div>
        )}
      </section>

      <section className="section fade-up">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Filtered from the API</span>
            <h2>Nearby events you can book now</h2>
          </div>
          <div className="search-row">
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by event, venue, city, or category"
              type="search"
              value={searchTerm}
            />
          </div>
        </div>

        <div className="chip-row">
          {categories.map((category) => (
            <button
              className={activeCategory === category ? "chip is-active" : "chip"}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {eventsError ? <p className="message message--error">{eventsError}</p> : null}

        {isLoadingEvents ? (
          <div className="empty-state panel">
            <h3>Loading nearby events...</h3>
            <p>Fetching personalized results from the backend.</p>
          </div>
        ) : events.length > 0 ? (
          <div className="event-grid">
            {events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state panel">
            <h3>No matching events in range right now.</h3>
            <p>
              Try another city, refresh your current location, or switch to a
              different preference chip to see more results.
            </p>
          </div>
        )}
      </section>

      <section className="section fade-up">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Synced from MySQL</span>
            <h2>Recent bookings</h2>
          </div>
          <Link className="button button--ghost" to="/">
            Dashboard top
          </Link>
        </div>

        {bookingsError ? <p className="message message--error">{bookingsError}</p> : null}

        {isLoadingBookings ? (
          <div className="empty-state panel">
            <h3>Loading bookings...</h3>
            <p>Reading your latest booking history from the API.</p>
          </div>
        ) : recentBookings.length > 0 ? (
          <div className="booking-list">
            {recentBookings.map((booking) => (
              <article className="booking-item panel" key={booking.id}>
                <strong>{booking.title}</strong>
                <span>
                  {booking.dateLabel} at {booking.slot}
                </span>
                <span>{booking.venue}</span>
                <span>
                  {booking.quantity} ticket(s) | Rs. {booking.total}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state panel">
            <h3>No bookings yet.</h3>
            <p>Open any event card, choose a showtime, and complete a booking.</p>
          </div>
        )}
      </section>
    </main>
  );
}