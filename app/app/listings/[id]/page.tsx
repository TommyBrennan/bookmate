"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Member {
  id: number;
  display_name: string;
  bio: string;
  joined_at: string;
}

interface Listing {
  id: number;
  author_id: number;
  book_title: string;
  book_author: string;
  book_cover_url: string;
  language: string;
  reading_pace: string;
  start_date: string;
  meeting_format: string;
  max_group_size: number;
  telegram_link: string;
  is_full: number;
  created_at: string;
  author_name: string;
  members: Member[];
  memberCount: number;
  isMember: boolean;
  isAuthor: boolean;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [telegramLink, setTelegramLink] = useState("");
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchListing = async () => {
    const res = await fetch(`/api/listings/${id}`);
    const data = await res.json();
    if (data.listing) {
      setListing(data.listing);
      setTelegramLink(data.listing.telegram_link || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleJoin = async () => {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        setError(data.error);
        return;
      }
      await fetchListing();
    } catch {
      setError("Failed to join. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const handleTelegramSave = async () => {
    setTelegramSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramLink }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      await fetchListing();
    } catch {
      setError("Failed to save link. Please try again.");
    } finally {
      setTelegramSaving(false);
    }
  };

  const formatMeetingType = (f: string) => {
    const labels: Record<string, string> = {
      voice: "Voice calls",
      text: "Text chat",
      mixed: "Mixed (voice + text)",
    };
    return labels[f] || f;
  };

  if (loading) {
    return (
      <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
        <p style={{ fontFamily: "system-ui, sans-serif" }}>Loading...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl mb-2">Listing not found</h2>
        <p style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}>
          This reading group may have been removed.
        </p>
      </div>
    );
  }

  const spotsLeft = listing.max_group_size - listing.memberCount;

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            backgroundColor: "rgba(192, 57, 43, 0.08)",
            color: "var(--color-error)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {error}
        </div>
      )}

      <div className="card mb-6">
        <div className="flex gap-5">
          {listing.book_cover_url ? (
            <img
              src={listing.book_cover_url}
              alt={listing.book_title}
              className="w-24 h-36 object-cover rounded-lg shadow-sm"
              style={{ flexShrink: 0 }}
            />
          ) : (
            <div
              className="w-24 h-36 rounded-lg flex items-center justify-center text-4xl"
              style={{
                backgroundColor: "var(--color-border)",
                flexShrink: 0,
              }}
            >
              📖
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl mb-1">{listing.book_title}</h1>
            <p
              className="text-sm mb-4"
              style={{
                color: "var(--color-text-secondary)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              by {listing.book_author}
            </p>

            <div
              className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  Pace
                </span>
                <div className="font-semibold">{listing.reading_pace}</div>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  Starts
                </span>
                <div className="font-semibold">
                  {new Date(listing.start_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  Format
                </span>
                <div className="font-semibold">
                  {formatMeetingType(listing.meeting_format)}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  Language
                </span>
                <div className="font-semibold">{listing.language}</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-5 pt-4 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <span className="text-sm font-semibold">
              {listing.memberCount}/{listing.max_group_size} readers
            </span>
            {spotsLeft > 0 && (
              <span
                className="text-sm ml-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                ({spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left)
              </span>
            )}
          </div>

          {!listing.isMember && !listing.is_full && (
            <button
              className="btn-primary"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "Joining..." : "Join this group"}
            </button>
          )}

          {listing.isMember && (
            <span
              className="badge"
              style={{
                backgroundColor: "rgba(45, 138, 86, 0.1)",
                color: "var(--color-success)",
              }}
            >
              You&apos;re a member
            </span>
          )}

          {listing.is_full && !listing.isMember && (
            <span
              className="badge"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                color: "var(--color-text-secondary)",
              }}
            >
              Group is full
            </span>
          )}
        </div>
      </div>

      {/* Telegram link section — visible to members when group is full */}
      {listing.is_full && listing.isMember && (
        <div className="card mb-6">
          <h2 className="text-lg mb-2">Telegram Group</h2>

          {listing.telegram_link ? (
            <div>
              <p
                className="text-sm mb-3"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                The reading group is full! Join the Telegram group to start
                coordinating:
              </p>
              <a
                href={listing.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block"
              >
                Join Telegram Group
              </a>
            </div>
          ) : listing.isAuthor ? (
            <div>
              <p
                className="text-sm mb-3"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Your reading group is full! Create a Telegram group and share
                the invite link with your readers:
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="input-field flex-1"
                  placeholder="https://t.me/..."
                  value={telegramLink}
                  onChange={(e) => setTelegramLink(e.target.value)}
                />
                <button
                  className="btn-primary"
                  onClick={handleTelegramSave}
                  disabled={telegramSaving}
                >
                  {telegramSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm"
              style={{
                color: "var(--color-text-secondary)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Waiting for the organizer to share the Telegram group link...
            </p>
          )}
        </div>
      )}

      {/* Members */}
      <div className="card">
        <h2 className="text-lg mb-3">
          Readers ({listing.memberCount})
        </h2>
        <div className="space-y-3">
          {listing.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: "var(--color-accent)", flexShrink: 0 }}
              >
                {member.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {member.display_name}
                  {member.id === listing.author_id && (
                    <span
                      className="ml-2 badge"
                      style={{
                        backgroundColor: "rgba(224, 122, 58, 0.1)",
                        color: "var(--color-accent)",
                        fontSize: "0.6rem",
                      }}
                    >
                      Organizer
                    </span>
                  )}
                </div>
                {member.bio && (
                  <div
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {member.bio}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        className="text-xs text-center mt-6 mb-4"
        style={{
          color: "var(--color-text-secondary)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Created by {listing.author_name} on{" "}
        {new Date(listing.created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
