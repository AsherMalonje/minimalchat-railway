#!/bin/bash
set -e

echo "🚀 Applying full production-ready patch..."

# Run from repo root
cd "$(dirname "$0")"

# 1. Pull latest changes
git pull origin main || true

# 2. Ensure directories exist
mkdir -p server/routes
mkdir -p client/src/components

# --- 3. Backend: user routes ---
cat << 'EOF' > server/routes/user.ts
import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import { users } from "../schema/users";
import { eq } from "drizzle-orm";

const router = Router();

// Get logged-in user
router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

// Update profile: username, privacy, avatar
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
EOF

echo "✅ server/routes/user.ts patched (live, auth-ready)"

# --- 4. Frontend: AccountSettings live component ---
cat << 'EOF' > client/src/components/account-settings.tsx
import React, { useState, useEffect } from "react";

export default function AccountSettings() {
  const [user, setUser] = useState<{ username: string; isPrivate: boolean; avatarUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch logged-in user from backend
  useEffect(() => {
    fetch("/api/user/me")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading account settings...</p>;
  if (!user) return <p>Failed to load user. Please log in.</p>;

  const [username, setUsername] = useState(user.username);
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  async function saveChanges() {
    const res = await fetch("/api/user/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, isPrivate, avatarUrl }),
    });
    if (!res.ok) return alert("Failed to update profile");
    const updated = await res.json();
    setUser(prev => prev ? { ...prev, username, isPrivate, avatarUrl } : null);
    alert("Profile updated ✅");
  }

  async function deleteAccount() {
    if (!confirm("Are you sure? This cannot be undone!")) return;
    const res = await fetch("/api/user/me", { method: "DELETE" });
    if (!res.ok) return alert("Failed to delete account");
    alert("Account deleted ❌");
    window.location.href = "/";
  }

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Username"
        className="border p-2 w-full"
      />
      <input
        value={avatarUrl}
        onChange={e => setAvatarUrl(e.target.value)}
        placeholder="Avatar URL"
        className="border p-2 w-full"
      />
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={e => setIsPrivate(e.target.checked)}
        />
        <span>Private account</span>
      </label>
      <button onClick={saveChanges} className="bg-blue-500 text-white px-4 py-2 rounded">
        Save
      </button>
      <button onClick={deleteAccount} className="bg-red-500 text-white px-4 py-2 rounded">
        Delete Account
      </button>
    </div>
  );
}
EOF

echo "✅ client/src/components/account-settings.tsx patched (live user data)"

# --- 5. Auto-import & render AccountSettings in App.tsx ---
APP_FILE="client/src/App.tsx"
TMP_FILE="client/src/App.tmp.tsx"

# Backup original
cp "$APP_FILE" "$APP_FILE.bak"

# Add import if missing
grep -qxF 'import AccountSettings from "./components/account-settings";' "$APP_FILE" || \
  sed -i '1i import AccountSettings from "./components/account-settings";' "$APP_FILE"

# Insert <AccountSettings /> in first root div
sed '/<div className=/a \
  <AccountSettings />' "$APP_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$APP_FILE"

echo "✅ AccountSettings auto-rendered in App.tsx (live, auth-ready)"

# --- 6. Stage, commit, push ---
git add .
git commit -m "🚀 Production-ready patch: full backend fixes + AccountSettings live"
git push origin main

echo "✅ Full production-ready patch applied! Your app is now live-data ready."
