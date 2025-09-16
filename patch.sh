#!/bin/bash
set -e

echo "🚀 Running full project patch..."

# Make sure script runs from repo root
cd "$(dirname "$0")"

# Pull latest
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
EOF
echo "✅ server/routes/user.ts patched"

# --- 2. Add frontend AccountSettings component ---
cat << 'EOF' > client/src/components/account-settings.tsx
import React, { useState } from "react";

export default function AccountSettings({ user }) {
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
echo "✅ client/src/components/account-settings.tsx added"

# --- 3. Auto-import and render AccountSettings in App.tsx ---
APP_FILE="client/src/App.tsx"
TMP_FILE="client/src/App.tmp.tsx"

# Backup original App.tsx
cp "$APP_FILE" "$APP_FILE.bak"

# Insert import line if not already present
grep -qxF 'import AccountSettings from "./components/account-settings";' "$APP_FILE" || \
  sed -i '1i import AccountSettings from "./components/account-settings";' "$APP_FILE"

# Insert <AccountSettings user={mockUser} /> inside root div
# Create a simple mockUser for rendering
sed '/<div className=/a \
  <AccountSettings user={{ username: "Demo", isPrivate: false, avatarUrl: "" }} />' "$APP_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$APP_FILE"

echo "✅ AccountSettings auto-rendered in App.tsx"

# --- 4. Stage, commit, push ---
git add .
git commit -m "🔥 Full patch: backend fixes + AccountSettings auto-wired + Drizzle ORM"
git push origin main

echo "✅ Full patch applied successfully!"
