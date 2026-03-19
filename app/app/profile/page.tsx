"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/auth/login");
          return;
        }
        setDisplayName(data.user.displayName);
        setBio(data.user.bio || "");
        setEmail(data.user.email);
        setLoading(false);
      });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Profile updated!");
      } else {
        setMessage(data.error || "Failed to update");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
        <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl mb-6">Your Profile</h1>

      <form onSubmit={handleSave} className="card space-y-4">
        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Email
          </label>
          <input
            type="email"
            className="input-field"
            value={email}
            disabled
            style={{ opacity: 0.6 }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Display name
          </label>
          <input
            type="text"
            className="input-field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Bio
          </label>
          <textarea
            className="input-field"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell other readers about yourself..."
          />
        </div>

        {message && (
          <p
            className="text-sm"
            style={{
              color: message.includes("updated")
                ? "var(--color-success)"
                : "var(--color-error)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
