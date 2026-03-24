"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Notification {
  id: number;
  listing_id: number;
  type: string;
  message: string;
  is_read: number;
  created_at: string;
  book_title: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load notifications");
        return r.json();
      })
      .then((data) => {
        setNotifications(data.notifications || []);
        // Mark all as read (fire-and-forget with silent catch)
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).catch(() => {});
      })
      .catch(() => {
        setError("Could not load notifications. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
        <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl mb-4 sm:mb-6">Notifications</h1>
        <div className="text-center py-12">
          <p
            className="text-sm mb-4"
            style={{ color: "var(--color-error)", fontFamily: "system-ui, sans-serif" }}
            role="alert"
          >
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl mb-4 sm:mb-6">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}>
            No notifications yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.listing_id ? `/listings/${n.listing_id}` : "#"}
              className="card block hover:shadow-sm transition-shadow"
              style={{
                borderLeftWidth: "3px",
                borderLeftColor: n.is_read
                  ? "var(--color-border)"
                  : "var(--color-accent)",
              }}
              aria-label={`${!n.is_read ? "Unread: " : ""}${n.message}`}
            >
              {!n.is_read && (
                <span className="sr-only">Unread</span>
              )}
              <p
                className="text-sm"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {n.message}
              </p>
              <p
                className="text-xs mt-1"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {new Date(n.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
