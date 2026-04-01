import express from "express";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// POST new notification
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { message, type } = req.body;
    const pool = await getPool();
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    await pool.execute(
      "INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)",
      [id, req.user.id, message, type || "info"]
    );
    res.status(201).json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// GET notifications for current user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );

    const notifications = rows.map((r) => ({
      id: r.id,
      message: r.message,
      type: r.type,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

// PUT mark single notification as read
router.put("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.execute(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT mark all notifications as read
router.put("/read-all", requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.execute(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
