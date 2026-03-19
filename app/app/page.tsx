"use client";

import { useEffect, useState } from "react";
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
  member_count: number;
  author_name: string;
  created_at: string;
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings")
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings || []);
        setLoading(false);
      });
  }, []);

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
      <div className="text-center mb-12 mt-4">
        <h1 className="text-4xl mb-3" style={{ color: "var(--color-text)" }}>
          Find your reading companion
        </h1>
        <p
          className="text-lg max-w-xl mx-auto"
          style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
        >
          Browse open reading groups, join one that matches your pace, and
          connect on Telegram to read together.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
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
            Be the first to create a reading group and find your book companions.
          </p>
          <Link href="/listings/create" className="btn-primary">
            Create the first listing
          </Link>
        </div>
      ) : (
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
                    {new Date(listing.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
