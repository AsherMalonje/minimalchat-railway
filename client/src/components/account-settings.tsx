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
