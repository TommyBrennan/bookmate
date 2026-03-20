"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

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
  member_count: number;
  author_name: string;
  created_at: string;
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [meetingFormat, setMeetingFormat] = useState("");
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchListings = useCallback(
    (query: string, format: string, sortBy: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (format) params.set("meeting_format", format);
      if (sortBy) params.set("sort", sortBy);

      const qs = params.toString();
      fetch(`/api/listings${qs ? `?${qs}` : ""}`)
        .then((r) => r.json())
        .then((data) => {
          setListings(data.listings || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchListings("", "", "newest");
  }, [fetchListings]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchListings(value, meetingFormat, sort);
    }, 400);
  };

  // Immediate filter changes
  const handleFormatChange = (value: string) => {
    setMeetingFormat(value);
    fetchListings(searchQuery, value, sort);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    fetchListings(searchQuery, meetingFormat, value);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setMeetingFormat("");
    setSort("newest");
    fetchListings("", "", "newest");
  };

  const hasActiveFilters = searchQuery || meetingFormat || sort !== "newest";

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
      <div className="text-center mb-8 mt-4">
        <h1 className="text-4xl mb-3" style={{ color: "var(--color-text)" }}>
          Find your reading companion
        </h1>
        <p
          className="text-lg max-w-xl mx-auto"
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              whiteSpace: "nowrap",
              position: "relative",
            }}
          >
            <svg
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
            className="card mt-3"
            style={{ padding: "1rem 1.25rem" }}
          >
            <div
              className="flex flex-wrap gap-4 items-end"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              <div style={{ minWidth: "160px" }}>
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

              <div style={{ minWidth: "160px" }}>
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
        <div
          className="text-center py-16"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <p style={{ fontFamily: "system-ui, sans-serif" }}>
            Loading listings...
          </p>
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
                  <img
                    src={listing.book_cover_url}
                    alt={listing.book_title}
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
