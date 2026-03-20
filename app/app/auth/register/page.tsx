"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <h1 className="text-2xl mb-1">Create an account</h1>
        <p
          className="mb-6"
          style={{
            color: "var(--color-text-secondary)",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.9rem",
          }}
        >
          Join Bookmate to find your reading companions
        </p>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: "rgba(192, 57, 43, 0.08)",
              color: "var(--color-error)",
              fontFamily: "system-ui, sans-serif",
            }}
            role="alert"
            id="register-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="register-name"
              className="block text-sm font-semibold mb-1"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Display name
            </label>
            <input
              id="register-name"
              type="text"
              className="input-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="How others will see you"
              autoComplete="name"
              aria-describedby={error ? "register-error" : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-semibold mb-1"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby={error ? "register-error" : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-semibold mb-1"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-describedby={error ? "register-error" : undefined}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p
          className="text-sm text-center mt-4"
          style={{
            color: "var(--color-text-secondary)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
