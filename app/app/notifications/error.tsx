"use client";

import Link from "next/link";

export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-secondary)"
        strokeWidth={1.5}
        style={{ margin: "0 auto 1rem" }}
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <h2>Could not load notifications</h2>
      <p>
        {error.message || "There was a problem loading your notifications."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary" style={{ textDecoration: "none" }}>
          Go home
        </Link>
      </div>
    </div>
  );
}
