import { useState } from "react";
import { toggleFavorite } from "../services/api";

export default function FavoriteButton({ eventId, initialFavorited = false, onToggle }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [animating, setAnimating] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    try {
      const result = await toggleFavorite(eventId);
      setFavorited(result);
      if (onToggle) onToggle(eventId, result);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  return (
    <button
      className={`favorite-btn ${favorited ? "is-favorited" : ""} ${animating ? "is-animating" : ""}`}
      onClick={handleClick}
      type="button"
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <span className="favorite-btn__icon">
        {favorited ? "❤️" : "🤍"}
      </span>
    </button>
  );
}
