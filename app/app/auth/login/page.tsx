"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
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
    <div className="max-w-md mx-auto mt-4 sm:mt-12">
      <div className="card">
        <h1 className="text-2xl mb-1">Welcome back</h1>
        <p
          className="mb-6"
          style={{
            color: "var(--color-text-secondary)",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.9rem",
          }}
        >
          Sign in to continue reading with your groups
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
            id="login-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold mb-1"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold mb-1"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
              autoComplete="current-password"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p
          className="text-sm text-center mt-4"
          style={{
            color: "var(--color-text-secondary)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
