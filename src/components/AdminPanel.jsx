import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPendingEvents,
  getAllEvents,
  approveEvent,
  rejectEvent,
  deleteEvent,
} from "../services/adminService";

export default function AdminPanel({ onLogout }) {
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState("pending"); 
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      if (tab === "pending") {
        const data = await getPendingEvents();
        setEvents(data.events || []);
      } else {
        const data = await getAllEvents();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [tab]);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this event?")) return;
    await approveEvent(id);
    fetchEvents();
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason for the user:");
    if (reason === null) return;
    await rejectEvent(id, reason);
    fetchEvents();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) return;
    await deleteEvent(id);
    fetchEvents();
  };

  return (
    <main className="page-shell">
      <header className="topbar fade-up">
        <div className="brand-lockup">
          <span className="brand-mark">👑</span>
          <div>
            <p className="eyebrow">Moderation & Management</p>
            <h2>Admin Dashboard</h2>
          </div>
        </div>

        <div className="topbar__actions" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button className="button button--ghost" onClick={() => onLogout()}>
            Log out
          </button>
        </div>
      </header>

      <section className="section fade-up">
        <div className="chip-row" style={{ marginBottom: "24px" }}>
          <button
            className={`chip ${tab === "pending" ? "is-active" : ""}`}
            onClick={() => setTab("pending")}
          >
            Pending Review
          </button>
          <button
            className={`chip ${tab === "all" ? "is-active" : ""}`}
            onClick={() => setTab("all")}
          >
            All Events
          </button>
        </div>

        {loading ? (
          <div className="empty-state panel">
            <h3>Loading events...</h3>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state panel">
            <h3>No events found.</h3>
            <p>{tab === "pending" ? "You are all caught up on approvals!" : "There are no events in the system."}</p>
          </div>
        ) : (
          <div className="booking-list">
            {events.map((event) => (
              <article className="booking-item panel" key={event.id} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <span className="eyebrow" style={{ color: event.status === 'pending' ? 'orange' : event.status === 'approved' ? 'green' : 'red' }}>
                    Status: {event.status.toUpperCase()}
                  </span>
                  <h3 style={{ margin: "4px 0" }}>{event.title}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: 0.8, fontSize: "0.9rem", marginTop: "12px" }}>
                    <span>📍 {event.city} - {event.venue}</span>
                    <span>🗓️ {event.date_label}</span>
                    <span style={{ wordBreak: "break-all" }}>📧 {event.created_by_email || 'System'}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "auto", flexWrap: "wrap" }}>
                  {event.status === "pending" && (
                    <>
                      <button className="button" style={{ background: "#10b981", color: "white", flex: 1 }} onClick={() => handleApprove(event.id)}>
                        Approve
                      </button>
                      <button className="button" style={{ background: "#ef4444", color: "white", flex: 1 }} onClick={() => handleReject(event.id)}>
                        Reject
                      </button>
                    </>
                  )}
                  {tab === "all" && (
                    <button className="button button--ghost" style={{ color: "#ef4444", borderColor: "#ef4444", width: "100%" }} onClick={() => handleDelete(event.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}