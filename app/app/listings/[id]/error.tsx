"use client";

import Link from "next/link";

export default function ListingError({
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
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1={12} y1={8} x2={12} y2={12} />
        <line x1={12} y1={16} x2={12.01} y2={16} />
      </svg>
      <h2>Could not load listing</h2>
      <p>
        {error.message || "This listing may not exist or could not be loaded right now."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary" style={{ textDecoration: "none" }}>
          Browse listings
        </Link>
      </div>
    </div>
  );
}
