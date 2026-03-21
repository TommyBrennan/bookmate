"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setNotifCount(data.user.unreadNotificationCount || 0);
        }
      })
      .catch(() => {
        // Auth check failed — stay logged out
      });
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMenuOpen(false);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    setMobileMenuOpen(false);
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
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg sm:text-xl font-bold"
          style={{ color: "var(--color-accent)", letterSpacing: "-0.03em" }}
          onClick={() => setMobileMenuOpen(false)}
        >
          bookmate
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/listings/create"
                className="btn-primary text-sm"
                style={{ padding: "0.5rem 1rem" }}
              >
                + New Listing
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 cursor-pointer"
                  style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                  aria-label={`User menu for ${user.displayName}${notifCount > 0 ? `, ${notifCount} unread notifications` : ""}`}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
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
                    role="menu"
                    aria-label="User menu"
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
                      role="menuitem"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/notifications"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                      style={{ fontFamily: "system-ui, sans-serif" }}
                      role="menuitem"
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
                      role="menuitem"
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

        {/* Mobile hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {user && notifCount > 0 && (
            <Link
              href="/notifications"
              className="badge text-white"
              style={{ backgroundColor: "var(--color-error)", fontSize: "0.65rem" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {notifCount}
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            style={{ background: "none", border: "none" }}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth={2} strokeLinecap="round">
                <line x1={6} y1={6} x2={18} y2={18} />
                <line x1={6} y1={18} x2={18} y2={6} />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth={2} strokeLinecap="round">
                <line x1={3} y1={6} x2={21} y2={6} />
                <line x1={3} y1={12} x2={21} y2={12} />
                <line x1={3} y1={18} x2={21} y2={18} />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden border-t"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
          }}
        >
          <div className="px-4 py-3 space-y-1">
            {user ? (
              <>
                <div
                  className="px-3 py-2 text-sm font-bold flex items-center gap-2"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  {user.displayName}
                </div>
                <Link
                  href="/listings/create"
                  className="block px-3 py-2.5 text-sm font-semibold rounded-lg"
                  style={{
                    backgroundColor: "var(--color-accent)",
                    color: "white",
                    textAlign: "center",
                    fontFamily: "system-ui, sans-serif",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  + New Listing
                </Link>
                <Link
                  href="/profile"
                  className="block px-3 py-2.5 text-sm rounded-lg"
                  style={{ fontFamily: "system-ui, sans-serif", color: "var(--color-text)" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/notifications"
                  className="block px-3 py-2.5 text-sm rounded-lg"
                  style={{ fontFamily: "system-ui, sans-serif", color: "var(--color-text)" }}
                  onClick={() => setMobileMenuOpen(false)}
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
                  className="w-full text-left px-3 py-2.5 text-sm rounded-lg cursor-pointer"
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    color: "var(--color-error)",
                    background: "none",
                    border: "none",
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex gap-3 py-1">
                <Link
                  href="/auth/login"
                  className="btn-secondary text-sm flex-1 text-center"
                  style={{ padding: "0.5rem 1rem" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="btn-primary text-sm flex-1 text-center"
                  style={{ padding: "0.5rem 1rem" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
