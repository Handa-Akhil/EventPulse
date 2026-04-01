import { useState } from "react";

export default function ShareButton({ event, onToggle }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = `${window.location.origin}/events/${event.id}`;
  const shareText = `Check out "${event.title}" at ${event.venue} on EventPulse!`;

  const copyLink = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareWhatsApp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`,
      "_blank"
    );
  };

  const shareInstagram = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Instagram doesn't have a direct share URL for web, opening search/home
    window.open(`https://www.instagram.com/`, "_blank");
    alert("Share this event on your Instagram Story or Feed!");
  };

  const shareMore = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      copyLink(e);
    }
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !open;
    setOpen(nextState);
    if (onToggle) onToggle(nextState);
  };

  return (
    <div className="share-wrapper">
      <button
        className="button button--ghost share-btn"
        onClick={handleToggle}
        type="button"
        title="Share event"
      >
        📤 Share
      </button>

      {open && (
        <div className="share-dropdown panel fade-up">
          <button onClick={copyLink} className="share-dropdown__item" type="button">
            {copied ? "✅ Copied!" : "🔗 Copy link"}
          </button>
          <button onClick={shareWhatsApp} className="share-dropdown__item" type="button">
            💬 WhatsApp
          </button>
          <button onClick={shareInstagram} className="share-dropdown__item" type="button">
            📸 Instagram
          </button>
          <button onClick={shareMore} className="share-dropdown__item" type="button">
            ➕ More...
          </button>
        </div>
      )}
    </div>
  );
}
