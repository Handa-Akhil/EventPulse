import { useEffect, useState } from "react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/api";
import socket from "../socket";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Listen for real-time notifications
    const handleNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all read:", error);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case "booking": return "🎫";
      case "approval": return "✅";
      case "info": return "ℹ️";
      default: return "🔔";
    }
  };

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="notif-wrapper">
      <button
        className="notif-bell"
        onClick={() => setOpen(!open)}
        type="button"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown panel fade-up">
          <div className="notif-dropdown__header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                className="notif-mark-all"
                onClick={handleMarkAllRead}
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-dropdown__list">
            {notifications.length === 0 ? (
              <p className="notif-empty">No notifications yet</p>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <button
                  key={notif.id}
                  className={`notif-item ${notif.isRead ? "" : "is-unread"}`}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                  type="button"
                >
                  <span className="notif-item__icon">{getNotifIcon(notif.type)}</span>
                  <div className="notif-item__content">
                    <p>{notif.message}</p>
                    <span className="notif-item__time">{timeAgo(notif.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
