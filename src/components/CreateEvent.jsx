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
            <p className="eyebrow">Create Event</p>
            <h2>Submit Your Event</h2>
          </div>
        </div>
        <Link className="button button--ghost" to="/">
          Cancel
        </Link>
      </header>

      <section className="section fade-up">
        <div className="panel create-event-panel">
          <div className="create-event-header">
            <h3>Submit an Event for Review</h3>
            <p className="create-event-subtitle">Your event will be pending admin approval before it becomes visible to others.</p>
          </div>

          {error && <p className="message message--error">{error}</p>}
          {success && <p className="message message--success">✓ Event submitted successfully! Admins will review it soon.</p>}

          <form onSubmit={handleSubmit} className="create-event-form">
            {/* Basic Information Section */}
            <div className="form-section">
              <div className="form-section-label">Basic Information</div>
              
              <label className="form-control">
                <span className="form-control-label">Event Title</span>
                <input 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange} 
                  placeholder="e.g., Summer Music Festival" 
                  required 
                />
              </label>

              <div className="form-group-row">
                <label className="form-control">
                  <span className="form-control-label">Category</span>
                  <select name="category" value={formData.category} onChange={handleChange}>
                    <option value="Music">Music</option>
                    <option value="Tech">Tech</option>
                    <option value="Art">Art</option>
                    <option value="Sports">Sports</option>
                    <option value="Business">Business</option>
                  </select>
                </label>
                <label className="form-control">
                  <span className="form-control-label">City</span>
                  <select name="city" value={formData.city} onChange={handleChange} required>
                    {CITY_OPTIONS.map((city) => (
                      <option key={city.city} value={city.city}>{city.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Location & Timing Section */}
            <div className="form-section">
              <div className="form-section-label">Location & Timing</div>
              
              <label className="form-control">
                <span className="form-control-label">Venue Name</span>
                <input 
                  name="venue" 
                  value={formData.venue} 
                  onChange={handleChange} 
                  placeholder="e.g., Royal Palace Grounds" 
                  required 
                />
              </label>

              <label className="form-control">
                <span className="form-control-label">Event Date</span>
                <input 
                  type="date" 
                  name="eventDate" 
                  value={formData.eventDate} 
                  onChange={handleChange} 
                  required 
                />
              </label>
            </div>

            {/* Pricing & Capacity Section */}
            <div className="form-section">
              <div className="form-section-label">Pricing & Capacity</div>
              
              <div className="form-group-row">
                <label className="form-control">
                  <span className="form-control-label">Price (₹)</span>
                  <input 
                    type="number" 
                    name="price" 
                    value={formData.price} 
                    onChange={handleChange} 
                    min="0" 
                    placeholder="100" 
                    required 
                  />
                </label>
                <label className="form-control">
                  <span className="form-control-label">Total Seats</span>
                  <input 
                    type="number" 
                    name="totalSeats" 
                    value={formData.totalSeats} 
                    onChange={handleChange} 
                    min="1" 
                    placeholder="100" 
                    required 
                  />
                </label>
              </div>
            </div>

            {/* Event Description Section */}
            <div className="form-section">
              <div className="form-section-label">Event Story</div>
              
              <label className="form-control description-control">
                <span className="form-control-label">Tell Your Event's Story</span>
                <textarea 
                  name="shortDescription" 
                  value={formData.shortDescription} 
                  onChange={handleChange} 
                  rows="8" 
                  placeholder="Describe what makes your event special and authentic. Share the experience, atmosphere, and why people should attend..."
                  required 
                />
              </label>
            </div>

            {/* Submit Button */}
            <div className="form-section-actions">
              <button 
                type="submit" 
                className="button button--primary button--lg" 
                disabled={loading || success}
              >
                {loading ? "Submitting..." : success ? "Event Submitted!" : "Submit Event for Approval"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
