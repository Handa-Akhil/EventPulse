import { useEffect, useState } from "react";
import { fetchReviews, submitReview } from "../services/api";

function StarDisplay({ rating, size = "1rem" }) {
  return (
    <span className="star-display" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? "star filled" : "star"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <span className="star-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= (hover || value) ? "star filled" : "star"}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          role="button"
          tabIndex={0}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export { StarDisplay };

export default function ReviewSection({ eventId, currentUserId }) {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [eventId]);

  const loadReviews = async () => {
    try {
      const data = await fetchReviews(eventId);
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
      setTotalReviews(data.totalReviews);
      setHasReviewed(data.reviews.some((r) => r.userId === currentUserId));
    } catch (error) {
      console.error("Failed to load reviews:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setMessage("Please select a rating.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await submitReview({ eventId, rating, comment });
      setMessage("Review submitted successfully!");
      setRating(0);
      setComment("");
      await loadReviews();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="review-section panel fade-up">
      <div className="review-header">
        <div>
          <span className="eyebrow">Reviews & Ratings</span>
          <h3>What people say</h3>
        </div>
        <div className="review-summary">
          <strong className="review-avg">{averageRating}</strong>
          <StarDisplay rating={Math.round(averageRating)} size="1.2rem" />
          <span className="review-count">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Review form */}
      {!hasReviewed && (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="review-form__rating">
            <span>Your rating</span>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <textarea
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="review-textarea"
          />
          <button
            type="submit"
            className="button button--primary"
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
          {message && (
            <p className={message.includes("success") ? "message message--success" : "message message--error"}>
              {message}
            </p>
          )}
        </form>
      )}

      {hasReviewed && (
        <p className="message message--success" style={{ marginTop: "1rem" }}>
          ✅ You've already reviewed this event.
        </p>
      )}

      {/* Review list */}
      <div className="review-list">
        {reviews.map((review) => (
          <article className="review-card" key={review.id}>
            <div className="review-card__header">
              <div className="review-card__avatar">
                {review.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{review.userName}</strong>
                <StarDisplay rating={review.rating} size="0.85rem" />
              </div>
            </div>
            {review.comment && <p>{review.comment}</p>}
          </article>
        ))}

        {reviews.length === 0 && (
          <p className="supporting-text">No reviews yet. Be the first to review!</p>
        )}
      </div>
    </section>
  );
}
