"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  email: string;
  displayName: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          // Fetch notification count
          fetch("/api/notifications")
            .then((r) => r.json())
            .then((n) => setNotifCount(n.unreadCount || 0));
        }
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <nav
      className="border-b sticky top-0 z-50"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold"
          style={{ color: "var(--color-accent)", letterSpacing: "-0.03em" }}
        >
          bookmate
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/listings/create"
                className="btn-primary text-sm"
                style={{ padding: "0.5rem 1rem" }}
              >
                + New Listing
              </Link>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 cursor-pointer"
                  style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  {notifCount > 0 && (
                    <span
                      className="badge text-white"
                      style={{ backgroundColor: "var(--color-error)", fontSize: "0.65rem" }}
                    >
                      {notifCount}
                    </span>
                  )}
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-12 w-48 card shadow-lg py-2 px-0"
                    style={{ padding: 0 }}
                  >
                    <div
                      className="px-4 py-2 text-sm font-bold truncate"
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {user.displayName}
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/notifications"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                      style={{ fontFamily: "system-ui, sans-serif" }}
                    >
                      Notifications
                      {notifCount > 0 && (
                        <span
                          className="ml-2 badge text-white"
                          style={{
                            backgroundColor: "var(--color-error)",
                            fontSize: "0.6rem",
                          }}
                        >
                          {notifCount}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                      style={{
                        borderTop: "1px solid var(--color-border)",
                        fontFamily: "system-ui, sans-serif",
                        color: "var(--color-error)",
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="btn-secondary text-sm"
                style={{ padding: "0.5rem 1rem" }}
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="btn-primary text-sm"
                style={{ padding: "0.5rem 1rem" }}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
