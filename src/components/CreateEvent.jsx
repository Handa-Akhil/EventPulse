import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserEvent } from "../services/api";
import { CITY_OPTIONS, DEFAULT_CITY } from "../data/events";

export default function CreateEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    category: "Music",
    city: DEFAULT_CITY.city,
    venue: "",
    price: 0,
    totalSeats: 100,
    eventDate: "",
    duration: "2h",
    language: "English",
    audience: "Family",
    shortDescription: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
   
      const dateObj = new Date(formData.eventDate);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      const submissionData = {
        ...formData,
        dateLabel: formattedDate,
      };

      await createUserEvent(submissionData);
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000); 
    } catch (err) {
      setError(err.message || "Failed to submit event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <header className="topbar fade-up">
        <div className="brand-lockup">
          <span className="brand-mark">EP</span>
          <div>
            <p className="eyebrow">User Submissions</p>
            <h2>Create New Event</h2>
          </div>
        </div>
        <Link className="button button--ghost" to="/">
          Cancel
        </Link>
      </header>

      <section className="section fade-up">
        <div className="panel" style={{ maxWidth: 600, margin: "auto" }}>
          <h3>Submit an Event for Review</h3>
          <p>Your event will be pending admin approval before it becomes visible to others.</p>

          {error && <p className="message message--error">{error}</p>}
          {success && <p className="message message--success">Event submitted successfully! Admins will review it soon.</p>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <label>
              <strong>Title</strong>
              <input name="title" value={formData.title} onChange={handleChange} required />
            </label>

            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ flex: 1 }}>
                <strong>Category</strong>
                <select name="category" value={formData.category} onChange={handleChange}>
                  <option value="Music">Music</option>
                  <option value="Tech">Tech</option>
                  <option value="Art">Art</option>
                  <option value="Sports">Sports</option>
                  <option value="Business">Business</option>
                </select>
              </label>
              <label style={{ flex: 1 }}>
                <strong>City</strong>
                <select name="city" value={formData.city} onChange={handleChange} required>
                  {CITY_OPTIONS.map((city) => (
                    <option key={city.city} value={city.city}>{city.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
               <label style={{ flex: 1 }}>
                  <strong>Venue</strong>
                  <input name="venue" value={formData.venue} onChange={handleChange} required />
               </label>
               <label style={{ flex: 1 }}>
                  <strong>Date</strong>
                  <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} required />
               </label>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
               <label style={{ flex: 1 }}>
                  <strong>Price (₹)</strong>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} min="0" required />
               </label>
               <label style={{ flex: 1 }}>
                  <strong>Total Seats</strong>
                  <input type="number" name="totalSeats" value={formData.totalSeats} onChange={handleChange} min="1" required />
               </label>
            </div>

            <label>
              <strong>Short Description</strong>
              <textarea 
                name="shortDescription" 
                value={formData.shortDescription} 
                onChange={handleChange} 
                rows="3" 
                required 
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginTop: 4 }}
              />
            </label>

            <button type="submit" className="button button--primary" disabled={loading || success}>
              {loading ? "Submitting..." : "Submit Event"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
