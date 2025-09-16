import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import { users } from "../schema/users";
import { eq } from "drizzle-orm";

const router = Router();

// Get current user profile
router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

// Update username, privacy, avatar
router.put("/me", requireAuth, async (req, res) => {
  const { username, isPrivate, avatarUrl } = req.body;
  await db.update(users)
    .set({ username, isPrivate, avatarUrl })
    .where(eq(users.id, req.user.id));
  res.json({ success: true });
});

// Delete account
router.delete("/me", requireAuth, async (req, res) => {
  await db.delete(users)
    .where(eq(users.id, req.user.id));
  res.json({ success: true });
});

export default router;
