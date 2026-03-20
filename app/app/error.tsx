"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <div
        style={{
          fontSize: "3rem",
          marginBottom: "1rem",
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-error)"
          strokeWidth={1.5}
          style={{ margin: "0 auto" }}
        >
          <circle cx={12} cy={12} r={10} />
          <line x1={12} y1={8} x2={12} y2={12} />
          <line x1={12} y1={16} x2={12.01} y2={16} />
        </svg>
      </div>
      <h2>Something went wrong</h2>
      <p>
        {error.message || "An unexpected error occurred. Please try again."}
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
