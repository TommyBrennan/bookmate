"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookCover from "@/components/BookCover";

interface ReadingItem {
  id: number;
  book_title: string;
  book_author: string;
  book_cover_url: string;
  reading_pace: string;
  start_date: string;
  meeting_format: string;
  is_full: number;
  telegram_link: string;
  member_count: number;
  max_group_size: number;
  author_name: string;
  joined_at: string;
}

interface Reputation {
  averageScore: number;
  totalRatings: number;
  completedGroups: number;
  groupsRated: number;
  breakdown: Record<number, number>;
  recentRatings: {
    score: number;
    comment: string;
    created_at: string;
    book_title: string;
  }[];
}

type TabKey = "profile" | "reading" | "genres" | "reputation";

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Reading activity
  const [active, setActive] = useState<ReadingItem[]>([]);
  const [history, setHistory] = useState<ReadingItem[]>([]);
  const [upcoming, setUpcoming] = useState<ReadingItem[]>([]);
  const [readingLoading, setReadingLoading] = useState(false);

  // Genres
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genresSaving, setGenresSaving] = useState(false);
  const [genresMessage, setGenresMessage] = useState("");

  // Reputation
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);

  // Track which tabs have been fetched to avoid redundant requests
  const fetchedTabs = useRef<Set<string>>(new Set());

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
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const fetchReading = useCallback(() => {
    setReadingLoading(true);
    fetch("/api/profile/reading")
      .then((r) => r.json())
      .then((data) => {
        setActive(data.active || []);
        setHistory(data.history || []);
        setUpcoming(data.upcoming || []);
        setReadingLoading(false);
      })
      .catch(() => setReadingLoading(false));
  }, []);

  const fetchGenres = useCallback(() => {
    setGenresLoading(true);
    fetch("/api/profile/genres")
      .then((r) => r.json())
      .then((data) => {
        setUserGenres(data.genres || []);
        setAvailableGenres(data.available || []);
        setGenresLoading(false);
      })
      .catch(() => setGenresLoading(false));
  }, []);

  const fetchReputation = useCallback(() => {
    setReputationLoading(true);
    fetch("/api/profile/reputation")
      .then((r) => r.json())
      .then((data) => {
        setReputation(data.reputation || null);
        setReputationLoading(false);
      })
      .catch(() => setReputationLoading(false));
  }, []);

  useEffect(() => {
    if (fetchedTabs.current.has(activeTab)) return;
    fetchedTabs.current.add(activeTab);
    if (activeTab === "reading") fetchReading();
    if (activeTab === "genres") fetchGenres();
    if (activeTab === "reputation") fetchReputation();
  }, [activeTab, fetchReading, fetchGenres, fetchReputation]);

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

  const toggleGenre = (genre: string) => {
    setUserGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const saveGenres = async () => {
    setGenresSaving(true);
    setGenresMessage("");
    try {
      const res = await fetch("/api/profile/genres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genres: userGenres }),
      });
      if (res.ok) {
        setGenresMessage("Genres saved!");
      } else {
        setGenresMessage("Failed to save genres");
      }
    } catch {
      setGenresMessage("Something went wrong");
    } finally {
      setGenresSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
        <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading...</p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "reading", label: "Reading Activity" },
    { key: "genres", label: "Favorite Genres" },
    { key: "reputation", label: "Reputation" },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl mb-4 sm:mb-6">Your Profile</h1>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-4 sm:mb-6 p-1 rounded-lg overflow-x-auto"
        style={{ backgroundColor: "var(--color-border)", WebkitOverflowScrolling: "touch" }}
        role="tablist"
        aria-label="Profile sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
            style={{
              fontFamily: "system-ui, sans-serif",
              backgroundColor: activeTab === tab.key ? "var(--color-surface)" : "transparent",
              color: activeTab === tab.key ? "var(--color-text)" : "var(--color-text-secondary)",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              cursor: "pointer",
              border: "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <form onSubmit={handleSave} className="card space-y-4" id="tabpanel-profile" role="tabpanel" aria-labelledby="tab-profile">
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
      )}

      {/* Reading Activity Tab */}
      {activeTab === "reading" && (
        <div className="space-y-6" id="tabpanel-reading" role="tabpanel" aria-labelledby="tab-reading">
          {readingLoading ? (
            <div className="text-center py-8" style={{ color: "var(--color-text-secondary)" }}>
              <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading reading activity...</p>
            </div>
          ) : (
            <>
              {/* Currently Reading / Active */}
              <ReadingSection
                title="Currently Reading"
                items={active}
                emptyText="No active reading groups"
                formatDate={formatDate}
                variant="active"
              />

              {/* Upcoming */}
              <ReadingSection
                title="Upcoming"
                items={upcoming}
                emptyText="No upcoming reading groups"
                formatDate={formatDate}
                variant="upcoming"
              />

              {/* Reading History */}
              <ReadingSection
                title="Reading History"
                items={history}
                emptyText="No completed reading groups yet"
                formatDate={formatDate}
                variant="history"
              />

              {active.length === 0 && upcoming.length === 0 && history.length === 0 && (
                <div className="card text-center py-8">
                  <p
                    className="mb-2"
                    style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                  >
                    You haven&apos;t joined any reading groups yet
                  </p>
                  <Link href="/" className="btn-primary inline-block">
                    Browse Listings
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reputation Tab */}
      {activeTab === "reputation" && (
        <div className="space-y-4" id="tabpanel-reputation" role="tabpanel" aria-labelledby="tab-reputation">
          {reputationLoading ? (
            <div className="text-center py-8" style={{ color: "var(--color-text-secondary)" }}>
              <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading reputation...</p>
            </div>
          ) : reputation ? (
            <>
              {/* Score Overview */}
              <div className="card">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <div
                      className="text-3xl sm:text-4xl font-bold"
                      style={{ color: reputation.averageScore >= 4 ? "var(--color-success)" : reputation.averageScore >= 3 ? "#f59e0b" : "var(--color-text)" }}
                    >
                      {reputation.totalRatings > 0 ? reputation.averageScore : "--"}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                    >
                      {reputation.totalRatings > 0
                        ? `${reputation.totalRatings} rating${reputation.totalRatings !== 1 ? "s" : ""}`
                        : "No ratings yet"}
                    </div>
                  </div>

                  <div className="flex-1" style={{ fontFamily: "system-ui, sans-serif" }}>
                    {/* Star breakdown */}
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reputation.breakdown[star] || 0;
                      const pct = reputation.totalRatings > 0
                        ? (count / reputation.totalRatings) * 100
                        : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs" aria-label={`${star} stars: ${count} rating${count !== 1 ? "s" : ""}`}>
                          <span style={{ width: 16, textAlign: "right", color: "var(--color-text-secondary)" }} aria-hidden="true">
                            {star}
                          </span>
                          <span style={{ color: "#f59e0b", fontSize: "0.7rem" }} aria-hidden="true">{"\u2605"}</span>
                          <div
                            className="flex-1 rounded-full overflow-hidden"
                            style={{ height: 6, backgroundColor: "var(--color-border)" }}
                          >
                            <div
                              className="rounded-full"
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                backgroundColor: "#f59e0b",
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                          <span style={{ width: 20, textAlign: "right", color: "var(--color-text-secondary)" }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="flex gap-4 mt-4 pt-4 text-sm"
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    fontFamily: "system-ui, sans-serif",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <div>
                    <span className="font-semibold" style={{ color: "var(--color-text)" }}>
                      {reputation.completedGroups}
                    </span>{" "}
                    completed groups
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: "var(--color-text)" }}>
                      {reputation.groupsRated}
                    </span>{" "}
                    groups rated
                  </div>
                </div>
              </div>

              {/* Recent Ratings */}
              {reputation.recentRatings.length > 0 && (
                <div className="card">
                  <h3 className="text-lg mb-3">Recent Feedback</h3>
                  <div className="space-y-3">
                    {reputation.recentRatings.map((rating, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex" aria-label={`${rating.score} out of 5 stars`} role="img">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span
                                key={s}
                                style={{
                                  color: s <= rating.score ? "#f59e0b" : "var(--color-border)",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {s <= rating.score ? "\u2605" : "\u2606"}
                              </span>
                            ))}
                          </div>
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                          >
                            for &quot;{rating.book_title}&quot;
                          </span>
                        </div>
                        {rating.comment && (
                          <p
                            className="text-sm"
                            style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                          >
                            &ldquo;{rating.comment}&rdquo;
                          </p>
                        )}
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif", opacity: 0.6 }}
                        >
                          {formatDate(rating.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reputation.totalRatings === 0 && (
                <div className="card text-center py-8">
                  <p
                    className="mb-2"
                    style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                  >
                    No ratings yet. Complete a reading group and your partners can rate you!
                  </p>
                  <Link href="/" className="btn-primary inline-block">
                    Browse Listings
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-8">
              <p style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}>
                Failed to load reputation data
              </p>
            </div>
          )}
        </div>
      )}

      {/* Favorite Genres Tab */}
      {activeTab === "genres" && (
        <div className="card space-y-4" id="tabpanel-genres" role="tabpanel" aria-labelledby="tab-genres">
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
          >
            Select your favorite genres to help others find reading companions with similar tastes.
          </p>

          {genresLoading ? (
            <div className="text-center py-4" style={{ color: "var(--color-text-secondary)" }}>
              <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {availableGenres.map((genre) => {
                  const selected = userGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      aria-pressed={selected}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        backgroundColor: selected ? "var(--color-accent)" : "transparent",
                        color: selected ? "white" : "var(--color-text)",
                        border: `1.5px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                        cursor: "pointer",
                      }}
                    >
                      {selected ? `\u2713 ${genre}` : genre}
                    </button>
                  );
                })}
              </div>

              {userGenres.length > 0 && (
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                >
                  {userGenres.length} genre{userGenres.length !== 1 ? "s" : ""} selected
                </p>
              )}

              {genresMessage && (
                <p
                  className="text-sm"
                  style={{
                    color: genresMessage.includes("saved")
                      ? "var(--color-success)"
                      : "var(--color-error)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {genresMessage}
                </p>
              )}

              <button
                onClick={saveGenres}
                className="btn-primary w-full"
                disabled={genresSaving}
              >
                {genresSaving ? "Saving..." : "Save genres"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* Reading Section Component */
function ReadingSection({
  title,
  items,
  emptyText,
  formatDate,
  variant,
}: {
  title: string;
  items: ReadingItem[];
  emptyText: string;
  formatDate: (s: string) => string;
  variant: "active" | "upcoming" | "history";
}) {
  if (items.length === 0 && variant !== "active") return null;

  const badgeColors = {
    active: { bg: "rgba(45, 138, 86, 0.1)", color: "var(--color-success)" },
    upcoming: { bg: "rgba(224, 122, 58, 0.1)", color: "var(--color-accent)" },
    history: { bg: "rgba(107, 107, 107, 0.1)", color: "var(--color-text-secondary)" },
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg">{title}</h2>
        <span
          className="badge"
          style={{
            backgroundColor: badgeColors[variant].bg,
            color: badgeColors[variant].color,
          }}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <p
            className="text-sm text-center py-4"
            style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
          >
            {emptyText}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/listings/${item.id}`}
              className="card flex gap-4 items-start hover:shadow-md transition-shadow"
              style={{ display: "flex", textDecoration: "none", color: "inherit" }}
            >
              {/* Book Cover */}
              <BookCover
                src={item.book_cover_url}
                alt={item.book_title}
                width={48}
                height={72}
                className="object-cover rounded"
                style={{ flexShrink: 0 }}
              />

              {/* Book Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  className="font-semibold text-sm"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.book_title}
                </h3>
                <p
                  className="text-xs"
                  style={{
                    color: "var(--color-text-secondary)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  by {item.book_author}
                </p>
                <div
                  className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs"
                  style={{
                    color: "var(--color-text-secondary)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  <span>{item.reading_pace}</span>
                  <span>Starts {formatDate(item.start_date)}</span>
                  <span>
                    {item.member_count}/{item.max_group_size} members
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
