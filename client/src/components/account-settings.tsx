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
