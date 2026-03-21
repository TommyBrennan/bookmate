"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface Listing {
  id: number;
  book_title: string;
  book_author: string;
  book_cover_url: string;
  language: string;
  reading_pace: string;
  start_date: string;
  meeting_format: string;
  max_group_size: number;
  requires_approval: number;
  platform_preference: string;
  member_count: number;
  author_name: string;
  created_at: string;
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [meetingFormat, setMeetingFormat] = useState("");
  const [readingPace, setReadingPace] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchListings = useCallback(
    (query: string, format: string, sortBy: string, pace?: string, dateFrom?: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (format) params.set("meeting_format", format);
      if (pace) params.set("reading_pace", pace);
      if (dateFrom) params.set("start_date_from", dateFrom);
      if (sortBy) params.set("sort", sortBy);

      const qs = params.toString();
      fetch(`/api/listings${qs ? `?${qs}` : ""}`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load listings");
          return r.json();
        })
        .then((data) => {
          setListings(data.listings || []);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || "Could not load listings. Please try again.");
          setLoading(false);
        });
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchListings("", "", "newest", "", "");
  }, [fetchListings]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchListings(value, meetingFormat, sort, readingPace, startDateFrom);
    }, 400);
  };

  // Immediate filter changes
  const handleFormatChange = (value: string) => {
    setMeetingFormat(value);
    fetchListings(searchQuery, value, sort, readingPace, startDateFrom);
  };

  const handlePaceChange = (value: string) => {
    setReadingPace(value);
    fetchListings(searchQuery, meetingFormat, sort, value, startDateFrom);
  };

  const handleStartDateFromChange = (value: string) => {
    setStartDateFrom(value);
    fetchListings(searchQuery, meetingFormat, sort, readingPace, value);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    fetchListings(searchQuery, meetingFormat, value, readingPace, startDateFrom);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setMeetingFormat("");
    setReadingPace("");
    setStartDateFrom("");
    setSort("newest");
    fetchListings("", "", "newest", "", "");
  };

  const hasActiveFilters = searchQuery || meetingFormat || readingPace || startDateFrom || sort !== "newest";

  const formatMeetingType = (f: string) => {
    const labels: Record<string, string> = {
      voice: "Voice calls",
      text: "Text chat",
      mixed: "Mixed",
    };
    return labels[f] || f;
  };

  return (
    <div>
      <div className="text-center mb-6 sm:mb-8 mt-2 sm:mt-4">
        <h1 className="text-2xl sm:text-4xl mb-2 sm:mb-3" style={{ color: "var(--color-text)" }}>
          Find your reading companion
        </h1>
        <p
          className="text-sm sm:text-lg max-w-xl mx-auto"
          style={{
            color: "var(--color-text-secondary)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Browse open reading groups, join one that matches your pace, and
          connect on Telegram to read together.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by book title or author..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "2.5rem" }}
            />
            <svg
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-secondary)",
                width: "1.125rem",
                height: "1.125rem",
                pointerEvents: "none",
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} x2={16.65} y2={16.65} />
            </svg>
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="btn-secondary"
            aria-expanded={filtersOpen}
            aria-controls="filter-panel"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              whiteSpace: "nowrap",
              position: "relative",
            }}
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <line x1={4} y1={6} x2={20} y2={6} />
              <line x1={7} y1={12} x2={17} y2={12} />
              <line x1={10} y1={18} x2={14} y2={18} />
            </svg>
            Filters
            {hasActiveFilters && (
              <span
                aria-hidden="true"
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-accent)",
                  position: "absolute",
                  top: "0.375rem",
                  right: "0.375rem",
                }}
              />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div
            id="filter-panel"
            className="card mt-3"
            style={{ padding: "1rem 1.25rem" }}
          >
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Meeting format
                </label>
                <select
                  value={meetingFormat}
                  onChange={(e) => handleFormatChange(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                >
                  <option value="">All formats</option>
                  <option value="voice">Voice calls</option>
                  <option value="text">Text chat</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Reading pace
                </label>
                <select
                  value={readingPace}
                  onChange={(e) => handlePaceChange(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                >
                  <option value="">All paces</option>
                  <option value="chapter">Chapter-based</option>
                  <option value="pages">Pages-based</option>
                  <option value="week">Weekly</option>
                  <option value="day">Daily</option>
                </select>
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Starting from
                </label>
                <input
                  type="date"
                  value={startDateFrom}
                  onChange={(e) => handleStartDateFromChange(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1 block"
                  style={{
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Sort by
                </label>
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="start_date">Start date (soonest)</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    color: "var(--color-accent)",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: "0.5rem 0",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card flex gap-4">
              <div
                className="skeleton"
                style={{ width: "4rem", height: "6rem", flexShrink: 0 }}
              />
              <div className="flex-1">
                <div
                  className="skeleton skeleton-heading"
                  style={{ width: `${60 - i * 5}%` }}
                />
                <div
                  className="skeleton skeleton-text"
                  style={{ width: `${45 - i * 5}%` }}
                />
                <div className="flex gap-2 mt-2">
                  <div
                    className="skeleton"
                    style={{
                      width: "5rem",
                      height: "1.5rem",
                      borderRadius: "9999px",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      width: "4rem",
                      height: "1.5rem",
                      borderRadius: "9999px",
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      width: "5.5rem",
                      height: "1.5rem",
                      borderRadius: "9999px",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-error)"
            strokeWidth={1.5}
            style={{ margin: "0 auto 0.75rem" }}
          >
            <circle cx={12} cy={12} r={10} />
            <line x1={12} y1={8} x2={12} y2={12} />
            <line x1={12} y1={16} x2={12.01} y2={16} />
          </svg>
          <p
            className="text-lg mb-2"
            style={{ color: "var(--color-text)", fontFamily: "system-ui, sans-serif" }}
          >
            {error}
          </p>
          <button
            onClick={() => fetchListings(searchQuery, meetingFormat, sort, readingPace, startDateFrom)}
            className="btn-primary"
            style={{ marginTop: "0.75rem" }}
          >
            Try again
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          {hasActiveFilters ? (
            <>
              <p
                className="text-lg mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                No matching reading groups
              </p>
              <p
                className="mb-6"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "0.95rem",
                }}
              >
                Try adjusting your search or filters to find more groups.
              </p>
              <button onClick={clearFilters} className="btn-secondary">
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p
                className="text-lg mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                No reading groups yet
              </p>
              <p
                className="mb-6"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "0.95rem",
                }}
              >
                Be the first to create a reading group and find your book
                companions.
              </p>
              <Link href="/listings/create" className="btn-primary">
                Create the first listing
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <p
            className="mb-3 text-sm"
            style={{
              color: "var(--color-text-secondary)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {listings.length} open group{listings.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " found" : ""}
          </p>
          <div className="grid gap-4">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="card hover:shadow-md transition-shadow flex gap-4"
              >
                {listing.book_cover_url ? (
                  <Image
                    src={listing.book_cover_url}
                    alt={listing.book_title}
                    width={64}
                    height={96}
                    className="w-16 h-24 object-cover rounded"
                    style={{ flexShrink: 0 }}
                  />
                ) : (
                  <div
                    className="w-16 h-24 rounded flex items-center justify-center text-2xl"
                    style={{
                      backgroundColor: "var(--color-border)",
                      flexShrink: 0,
                      color: "var(--color-text-secondary)",
                    }}
                    aria-hidden="true"
                  >
                    📖
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">
                    {listing.book_title}
                  </h3>
                  <p
                    className="text-sm mb-2 truncate"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    by {listing.book_author} · posted by {listing.author_name}
                  </p>

                  <div
                    className="flex flex-wrap gap-2"
                    style={{ fontFamily: "system-ui, sans-serif" }}
                  >
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "rgba(224, 122, 58, 0.1)",
                        color: "var(--color-accent)",
                      }}
                    >
                      {listing.reading_pace}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "rgba(45, 138, 86, 0.1)",
                        color: "var(--color-success)",
                      }}
                    >
                      {formatMeetingType(listing.meeting_format)}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Starts{" "}
                      {new Date(listing.start_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {listing.member_count}/{listing.max_group_size} readers
                    </span>
                    {listing.requires_approval ? (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "rgba(224, 122, 58, 0.08)",
                          color: "var(--color-accent)",
                        }}
                      >
                        Approval required
                      </span>
                    ) : null}
                    {listing.platform_preference === "discord" ? (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "rgba(88, 101, 242, 0.08)",
                          color: "#5865F2",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                        </svg>
                        Discord
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
