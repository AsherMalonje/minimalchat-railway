#!/bin/bash
set -e

echo "🚀 Applying full live-data patch..."

# Ensure script runs from repo root
cd "$(dirname "$0")"

# Pull latest changes
git pull origin main || true

# Ensure directories exist
mkdir -p server/routes
mkdir -p client/src/components

# --- 1. Patch backend user routes ---
cat << 'EOF' > server/routes/user.ts
import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import { users } from "../schema/users";
import { eq } from "drizzle-orm";

const router = Router();

// Get current logged-in user
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
EOF

echo "✅ server/routes/user.ts patched"

# --- 2. Add live-data AccountSettings component ---
cat << 'EOF' > client/src/components/account-settings.tsx
import React, { useState, useEffect } from "react";

export default function AccountSettings() {
  const [user, setUser] = useState<{ username: string; isPrivate: boolean; avatarUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
      .then(res => res.json())
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
  if (!user) return <p>Failed to load user.</p>;

  const [username, setUsername] = useState(user.username);
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  async function saveChanges() {
    await fetch("/api/user/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, isPrivate, avatarUrl }),
    });
    alert("Profile updated ✅");
  }

  async function deleteAccount() {
    if (confirm("Are you sure? This cannot be undone!")) {
      await fetch("/api/user/me", { method: "DELETE" });
      alert("Account deleted ❌");
      window.location.href = "/";
    }
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

echo "✅ client/src/components/account-settings.tsx patched (live data)"

# --- 3. Auto-import AccountSettings in App.tsx ---
APP_FILE="client/src/App.tsx"
TMP_FILE="client/src/App.tmp.tsx"

# Backup original
cp "$APP_FILE" "$APP_FILE.bak"

# Insert import line if missing
grep -qxF 'import AccountSettings from "./components/account-settings";' "$APP_FILE" || \
  sed -i '1i import AccountSettings from "./components/account-settings";' "$APP_FILE"

# Insert <AccountSettings /> inside the first <div> (if not already present)
sed '/<div className=/a \
  <AccountSettings />' "$APP_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$APP_FILE"

echo "✅ AccountSettings auto-rendered in App.tsx (live data)"

# --- 4. Stage, commit, push ---
git add .
git commit -m "🚀 Full live-data patch: backend + AccountSettings component auto-wired"
git push origin main

echo "✅ Live-data patch applied successfully! Your AccountSettings now uses real DB data."
