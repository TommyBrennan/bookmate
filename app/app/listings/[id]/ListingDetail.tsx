"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Member {
  id: number;
  display_name: string;
  bio: string;
  joined_at: string;
}

interface Applicant {
  application_id: number;
  id: number;
  display_name: string;
  bio: string;
  applied_at: string;
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
  requires_approval: number;
  created_at: string;
  author_name: string;
  members: Member[];
  memberCount: number;
  isMember: boolean;
  isAuthor: boolean;
  hasApplied: boolean;
  applicationStatus: string;
  pendingApplicants: Applicant[];
  currentUserId: number | null;
  telegramBotConfigured: boolean;
  discordBotConfigured: boolean;
  platform_preference: string;
  discord_link: string;
}

export default function ListingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [applying, setApplying] = useState(false);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [telegramLink, setTelegramLink] = useState("");
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [autoTelegramLoading, setAutoTelegramLoading] = useState(false);
  const [autoTelegramLink, setAutoTelegramLink] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  // Discord state
  const [discordLink, setDiscordLink] = useState("");
  const [discordSaving, setDiscordSaving] = useState(false);
  const [autoDiscordLoading, setAutoDiscordLoading] = useState(false);
  const [autoDiscordLink, setAutoDiscordLink] = useState("");
  const [showDiscordManualFallback, setShowDiscordManualFallback] = useState(false);
  const [error, setError] = useState("");

  // Rating state
  const [givenRatings, setGivenRatings] = useState<Record<number, { score: number; comment: string }>>({});
  const [ratingScores, setRatingScores] = useState<Record<number, number>>({});
  const [ratingComments, setRatingComments] = useState<Record<number, string>>({});
  const [ratingSaving, setRatingSaving] = useState<number | null>(null);
  const [ratingMessage, setRatingMessage] = useState("");

  const [notAvailable, setNotAvailable] = useState(false);

  const [fetchError, setFetchError] = useState(false);

  const fetchListing = async () => {
    try {
      const res = await fetch(`/api/listings/${id}`);
      const data = await res.json();
      if (res.ok && data.listing) {
        setListing(data.listing);
        setTelegramLink(data.listing.telegram_link || "");
        setDiscordLink(data.listing.discord_link || "");
      } else if (res.status === 404) {
        setNotAvailable(true);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRatings = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/ratings?listingId=${id}`);
      const data = await res.json();
      if (data.givenRatings) {
        const given: Record<number, { score: number; comment: string }> = {};
        const scores: Record<number, number> = {};
        const comments: Record<number, string> = {};
        for (const r of data.givenRatings) {
          given[r.rated_user_id] = { score: r.score, comment: r.comment };
          scores[r.rated_user_id] = r.score;
          comments[r.rated_user_id] = r.comment;
        }
        setGivenRatings(given);
        setRatingScores(scores);
        setRatingComments(comments);
      }
    } catch {
      // Silently fail — ratings are not critical
    }
  }, [id]);

  useEffect(() => {
    if (listing?.is_full && listing?.isMember) {
      fetchRatings();
    }
  }, [listing?.is_full, listing?.isMember, fetchRatings]);

  const handleRatingSubmit = async (memberId: number) => {
    const score = ratingScores[memberId];
    if (!score) return;
    setRatingSaving(memberId);
    setRatingMessage("");
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: parseInt(id as string, 10),
          ratedUserId: memberId,
          score,
          comment: ratingComments[memberId] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRatingMessage(data.error || "Failed to submit rating");
      } else {
        setRatingMessage("Rating saved!");
        setGivenRatings((prev) => ({
          ...prev,
          [memberId]: { score, comment: ratingComments[memberId] || "" },
        }));
      }
    } catch {
      setRatingMessage("Failed to submit rating");
    } finally {
      setRatingSaving(null);
    }
  };

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

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/apply`, { method: "POST" });
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
      setError("Failed to apply. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const handleDecision = async (applicationId: number, action: "approve" | "reject") => {
    setDecidingId(applicationId);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/applications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      await fetchListing();
    } catch {
      setError("Failed to process application. Please try again.");
    } finally {
      setDecidingId(null);
    }
  };

  const isValidTelegramLink = (link: string) => {
    return /^https:\/\/t\.me\/[\w+/]+$/.test(link.trim());
  };

  const telegramLinkError = telegramLink && !isValidTelegramLink(telegramLink)
    ? "Link must start with https://t.me/ (e.g., https://t.me/+AbCdEfGhIjK)"
    : "";

  const handleTelegramSave = async () => {
    if (!isValidTelegramLink(telegramLink)) return;
    setTelegramSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramLink: telegramLink.trim() }),
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

  const handleAutoTelegram = async () => {
    setAutoTelegramLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/auto-telegram`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate Telegram link");
        return;
      }
      setAutoTelegramLink(data.deepLink);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setAutoTelegramLoading(false);
    }
  };

  const isValidDiscordLink = (link: string) => {
    return /^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/.test(link.trim());
  };

  const discordLinkError = discordLink && !isValidDiscordLink(discordLink)
    ? "Link must start with https://discord.gg/ or https://discord.com/invite/"
    : "";

  const handleDiscordSave = async () => {
    if (!isValidDiscordLink(discordLink)) return;
    setDiscordSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/discord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordLink: discordLink.trim() }),
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
      setDiscordSaving(false);
    }
  };

  const handleAutoDiscord = async () => {
    setAutoDiscordLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${id}/auto-discord`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate Discord link");
        return;
      }
      setAutoDiscordLink(data.inviteUrl);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setAutoDiscordLoading(false);
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

  if (fetchError) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl mb-2">Something went wrong</h2>
        <p style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}>
          Failed to load this listing. Please try again.
        </p>
        <button
          onClick={() => { setFetchError(false); setLoading(true); fetchListing(); }}
          className="mt-4 px-4 py-2 rounded cursor-pointer"
          style={{ background: "var(--color-accent)", color: "white", fontFamily: "system-ui, sans-serif" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (notAvailable) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl mb-2">This listing is no longer available</h2>
        <p style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}>
          This reading group has reached its maximum size and is no longer visible to non-members.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 rounded"
          style={{ background: "var(--color-accent)", color: "white", fontFamily: "system-ui, sans-serif" }}
        >
          Browse other listings
        </button>
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

            {listing.requires_approval ? (
              <span
                className="badge mb-3"
                style={{
                  backgroundColor: "rgba(224, 122, 58, 0.1)",
                  color: "var(--color-accent)",
                  fontSize: "0.7rem",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Approval required
              </span>
            ) : null}

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

          {!listing.isMember && !listing.is_full && !listing.requires_approval && (
            <button
              className="btn-primary"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "Joining..." : "Join this group"}
            </button>
          )}

          {!listing.isMember && !listing.is_full && listing.requires_approval && !listing.hasApplied && (
            <button
              className="btn-primary"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? "Applying..." : "Apply to join"}
            </button>
          )}

          {!listing.isMember && listing.hasApplied && (
            <span
              className="badge"
              style={{
                backgroundColor: "rgba(224, 122, 58, 0.1)",
                color: "var(--color-accent)",
              }}
            >
              Application pending
            </span>
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

          {listing.is_full && !listing.isMember && !listing.hasApplied && (
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

      {/* Chat platform section — visible to members when group is full */}
      {listing.is_full && listing.isMember && listing.platform_preference !== "discord" && (
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
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Join Telegram Group
              </a>
              {listing.isAuthor && (
                <p
                  className="text-xs mt-3"
                  style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                >
                  Link shared: {listing.telegram_link}
                </p>
              )}
            </div>
          ) : listing.isAuthor ? (
            <div style={{ fontFamily: "system-ui, sans-serif" }}>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Your reading group is full! Create a Telegram group and share
                the invite link so your readers can connect.
              </p>

              {/* Auto-create option (when bot is configured) */}
              {listing.telegramBotConfigured && !showManualFallback && (
                <div className="mb-4">
                  {!autoTelegramLink ? (
                    <div
                      className="p-4 rounded-lg text-center"
                      style={{
                        backgroundColor: "rgba(45, 138, 86, 0.06)",
                        border: "1px solid rgba(45, 138, 86, 0.15)",
                      }}
                    >
                      <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
                        Create a Telegram group with one click — the bot will
                        automatically generate an invite link for your readers.
                      </p>
                      <button
                        className="btn-primary"
                        onClick={handleAutoTelegram}
                        disabled={autoTelegramLoading}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                        {autoTelegramLoading
                          ? "Generating..."
                          : "Create Telegram Group Automatically"}
                      </button>
                      <p className="text-xs mt-3" style={{ color: "var(--color-text-secondary)" }}>
                        <button
                          className="underline cursor-pointer"
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            font: "inherit",
                            padding: 0,
                          }}
                          onClick={() => setShowManualFallback(true)}
                        >
                          Or set up manually
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: "rgba(45, 138, 86, 0.06)",
                        border: "1px solid rgba(45, 138, 86, 0.15)",
                      }}
                    >
                      <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-success)" }}>
                        Almost done! Click the link below to create the group:
                      </p>
                      <a
                        href={autoTelegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-block"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          backgroundColor: "var(--color-success)",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                        Open Telegram & Create Group
                      </a>
                      <ol className="text-xs mt-3 space-y-1" style={{ color: "var(--color-text-secondary)", paddingLeft: "1.25rem" }}>
                        <li>Telegram will open and ask you to create a group</li>
                        <li>Name it something like &quot;{listing.book_title} Reading Group&quot;</li>
                        <li>The bot will automatically generate an invite link</li>
                        <li>All members will be notified — no manual steps needed!</li>
                      </ol>
                      <p className="text-xs mt-3" style={{ color: "var(--color-text-secondary)" }}>
                        After creating the group, refresh this page to see the invite link.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual setup (shown as fallback or when bot is not configured) */}
              {(!listing.telegramBotConfigured || showManualFallback) && (
                <div>
                  {showManualFallback && (
                    <p className="text-xs mb-3">
                      <button
                        className="underline cursor-pointer"
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-accent)",
                          font: "inherit",
                          padding: 0,
                        }}
                        onClick={() => setShowManualFallback(false)}
                      >
                        Back to automatic setup
                      </button>
                    </p>
                  )}

                  {/* Step-by-step instructions */}
                  <div
                    className="mb-4 p-4 rounded-lg"
                    style={{ backgroundColor: "rgba(224, 122, 58, 0.05)", border: "1px solid rgba(224, 122, 58, 0.15)" }}
                  >
                    <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
                      How to create a Telegram group:
                    </p>
                    <ol className="text-sm space-y-1.5" style={{ color: "var(--color-text-secondary)", paddingLeft: "1.25rem" }}>
                      <li>Open Telegram and tap the pencil/compose icon</li>
                      <li>Select <strong style={{ color: "var(--color-text)" }}>New Group</strong></li>
                      <li>Name it something like <strong style={{ color: "var(--color-text)" }}>&quot;{listing.book_title} Reading Group&quot;</strong></li>
                      <li>You can skip adding members for now — add them via the invite link</li>
                      <li>
                        Open the group, tap the group name at the top, then{" "}
                        <strong style={{ color: "var(--color-text)" }}>Invite via Link</strong>
                      </li>
                      <li>Copy the invite link (it looks like <code style={{ backgroundColor: "rgba(0,0,0,0.06)", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", fontSize: "0.8rem" }}>https://t.me/+AbCdEfG...</code>)</li>
                      <li>Paste it below and hit Save</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="url"
                        className="input-field"
                        placeholder="https://t.me/+..."
                        value={telegramLink}
                        onChange={(e) => setTelegramLink(e.target.value)}
                        style={{
                          borderColor: telegramLinkError
                            ? "var(--color-error)"
                            : telegramLink && !telegramLinkError
                              ? "var(--color-success)"
                              : undefined,
                        }}
                      />
                      {telegramLinkError && (
                        <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
                          {telegramLinkError}
                        </p>
                      )}
                      {telegramLink && !telegramLinkError && (
                        <p className="text-xs mt-1" style={{ color: "var(--color-success)" }}>
                          Valid Telegram link
                        </p>
                      )}
                    </div>
                    <button
                      className="btn-primary"
                      onClick={handleTelegramSave}
                      disabled={telegramSaving || !telegramLink || !!telegramLinkError}
                      style={{ alignSelf: "flex-start" }}
                    >
                      {telegramSaving ? "Saving..." : "Save link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontFamily: "system-ui, sans-serif" }}>
              <p
                className="text-sm mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Waiting for the organizer to share the Telegram group link...
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}
              >
                The organizer ({listing.author_name}) will share a Telegram invite link once
                they set up the group. Check back soon!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Discord channel section — visible to members when group is full */}
      {listing.is_full && listing.isMember && listing.platform_preference === "discord" && (
        <div className="card mb-6">
          <h2 className="text-lg mb-2" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#5865F2" }}>
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
            </svg>
            Discord Channel
          </h2>

          {listing.discord_link ? (
            <div>
              <p
                className="text-sm mb-3"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                The reading group is full! Join the Discord server to start
                coordinating:
              </p>
              <a
                href={listing.discord_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#5865F2",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                </svg>
                Join Discord Server
              </a>
              {listing.isAuthor && (
                <p
                  className="text-xs mt-3"
                  style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
                >
                  Link shared: {listing.discord_link}
                </p>
              )}
            </div>
          ) : listing.isAuthor ? (
            <div style={{ fontFamily: "system-ui, sans-serif" }}>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Your reading group is full! Create a Discord server (or use an existing one) and share
                the invite link so your readers can connect.
              </p>

              {/* Auto-create option (when Discord bot is configured) */}
              {listing.discordBotConfigured && !showDiscordManualFallback && (
                <div className="mb-4">
                  {!autoDiscordLink ? (
                    <div
                      className="p-4 rounded-lg text-center"
                      style={{
                        backgroundColor: "rgba(88, 101, 242, 0.06)",
                        border: "1px solid rgba(88, 101, 242, 0.15)",
                      }}
                    >
                      <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
                        Add the Bookmate bot to your Discord server — it will
                        automatically create a reading group channel and invite link.
                      </p>
                      <button
                        className="btn-primary"
                        onClick={handleAutoDiscord}
                        disabled={autoDiscordLoading}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          backgroundColor: "#5865F2",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                        </svg>
                        {autoDiscordLoading
                          ? "Generating..."
                          : "Set Up Discord Automatically"}
                      </button>
                      <p className="text-xs mt-3" style={{ color: "var(--color-text-secondary)" }}>
                        <button
                          className="underline cursor-pointer"
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            font: "inherit",
                            padding: 0,
                          }}
                          onClick={() => setShowDiscordManualFallback(true)}
                        >
                          Or set up manually
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: "rgba(88, 101, 242, 0.06)",
                        border: "1px solid rgba(88, 101, 242, 0.15)",
                      }}
                    >
                      <p className="text-sm font-semibold mb-2" style={{ color: "#5865F2" }}>
                        Almost done! Add the bot to your Discord server:
                      </p>
                      <a
                        href={autoDiscordLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-block"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          backgroundColor: "#5865F2",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                        </svg>
                        Add Bot to Discord Server
                      </a>
                      <ol className="text-xs mt-3 space-y-1" style={{ color: "var(--color-text-secondary)", paddingLeft: "1.25rem" }}>
                        <li>Select the server where you want the reading group channel</li>
                        <li>Authorize the bot with the requested permissions</li>
                        <li>The bot will create a <strong style={{ color: "var(--color-text)" }}>#{listing.book_title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}</strong> channel</li>
                        <li>An invite link will be automatically generated for your members</li>
                      </ol>
                      <p className="text-xs mt-3" style={{ color: "var(--color-text-secondary)" }}>
                        After adding the bot, refresh this page to see the invite link.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Discord setup */}
              {(!listing.discordBotConfigured || showDiscordManualFallback) && (
                <div>
                  {showDiscordManualFallback && (
                    <p className="text-xs mb-3">
                      <button
                        className="underline cursor-pointer"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#5865F2",
                          font: "inherit",
                          padding: 0,
                        }}
                        onClick={() => setShowDiscordManualFallback(false)}
                      >
                        Back to automatic setup
                      </button>
                    </p>
                  )}

                  <div
                    className="mb-4 p-4 rounded-lg"
                    style={{ backgroundColor: "rgba(88, 101, 242, 0.05)", border: "1px solid rgba(88, 101, 242, 0.15)" }}
                  >
                    <p className="text-sm font-semibold mb-2" style={{ color: "#5865F2" }}>
                      How to create a Discord invite:
                    </p>
                    <ol className="text-sm space-y-1.5" style={{ color: "var(--color-text-secondary)", paddingLeft: "1.25rem" }}>
                      <li>Open Discord and create a new server (or use an existing one)</li>
                      <li>Create a text channel (e.g., <strong style={{ color: "var(--color-text)" }}>#{listing.book_title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}</strong>)</li>
                      <li>Right-click the channel and select <strong style={{ color: "var(--color-text)" }}>Invite People</strong></li>
                      <li>Click <strong style={{ color: "var(--color-text)" }}>Edit invite link</strong> and set it to <strong style={{ color: "var(--color-text)" }}>Never expire</strong></li>
                      <li>Copy the invite link (it looks like <code style={{ backgroundColor: "rgba(0,0,0,0.06)", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", fontSize: "0.8rem" }}>https://discord.gg/AbCdEfG</code>)</li>
                      <li>Paste it below and hit Save</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="url"
                        className="input-field"
                        placeholder="https://discord.gg/..."
                        value={discordLink}
                        onChange={(e) => setDiscordLink(e.target.value)}
                        style={{
                          borderColor: discordLinkError
                            ? "var(--color-error)"
                            : discordLink && !discordLinkError
                              ? "var(--color-success)"
                              : undefined,
                        }}
                      />
                      {discordLinkError && (
                        <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
                          {discordLinkError}
                        </p>
                      )}
                      {discordLink && !discordLinkError && (
                        <p className="text-xs mt-1" style={{ color: "var(--color-success)" }}>
                          Valid Discord link
                        </p>
                      )}
                    </div>
                    <button
                      className="btn-primary"
                      onClick={handleDiscordSave}
                      disabled={discordSaving || !discordLink || !!discordLinkError}
                      style={{ alignSelf: "flex-start", backgroundColor: "#5865F2" }}
                    >
                      {discordSaving ? "Saving..." : "Save link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontFamily: "system-ui, sans-serif" }}>
              <p
                className="text-sm mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Waiting for the organizer to share the Discord invite link...
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}
              >
                The organizer ({listing.author_name}) will share a Discord invite link once
                they set up the server. Check back soon!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pending Applicants — visible to author on approval-gated listings */}
      {listing.isAuthor && listing.requires_approval && listing.pendingApplicants.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg mb-3">
            Pending Applicants ({listing.pendingApplicants.length})
          </h2>
          <div className="space-y-3">
            {listing.pendingApplicants.map((applicant) => (
              <div
                key={applicant.application_id}
                className="flex items-center gap-3"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: "#6b7280", flexShrink: 0 }}
                >
                  {applicant.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{applicant.display_name}</div>
                  {applicant.bio && (
                    <div
                      className="text-xs truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {applicant.bio}
                    </div>
                  )}
                </div>
                <div className="flex gap-2" style={{ flexShrink: 0 }}>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    style={{
                      backgroundColor: "var(--color-accent)",
                      color: "white",
                      border: "none",
                    }}
                    onClick={() => handleDecision(applicant.application_id, "approve")}
                    disabled={decidingId === applicant.application_id}
                  >
                    {decidingId === applicant.application_id ? "..." : "Approve"}
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    style={{
                      backgroundColor: "rgba(192, 57, 43, 0.08)",
                      color: "var(--color-error)",
                      border: "none",
                    }}
                    onClick={() => handleDecision(applicant.application_id, "reject")}
                    disabled={decidingId === applicant.application_id}
                  >
                    {decidingId === applicant.application_id ? "..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
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

      {/* Rate Members — visible to members when group is full */}
      {listing.is_full && listing.isMember && (
        <div className="card mt-6">
          <h2 className="text-lg mb-2">Rate Your Reading Partners</h2>
          <p
            className="text-sm mb-4"
            style={{
              color: "var(--color-text-secondary)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            How was your experience reading with this group? Rate each member to help build the community.
          </p>

          {ratingMessage && (
            <p
              className="text-sm mb-3"
              style={{
                color: ratingMessage.includes("saved")
                  ? "var(--color-success)"
                  : "var(--color-error)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {ratingMessage}
            </p>
          )}

          <div className="space-y-4">
            {listing.members
              .filter((m) => m.id !== listing.currentUserId)
              .map((member) => {
                const existingRating = givenRatings[member.id];
                const currentScore = ratingScores[member.id] || 0;

                return (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: existingRating
                        ? "rgba(45, 138, 86, 0.04)"
                        : "rgba(0, 0, 0, 0.02)",
                      border: `1px solid ${
                        existingRating
                          ? "rgba(45, 138, 86, 0.12)"
                          : "var(--color-border)"
                      }`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: "var(--color-accent)", flexShrink: 0 }}
                      >
                        {member.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className="text-sm font-semibold"
                        style={{ fontFamily: "system-ui, sans-serif" }}
                      >
                        {member.display_name}
                      </span>
                      {existingRating && (
                        <span
                          className="badge ml-auto"
                          style={{
                            backgroundColor: "rgba(45, 138, 86, 0.1)",
                            color: "var(--color-success)",
                            fontSize: "0.65rem",
                          }}
                        >
                          Rated
                        </span>
                      )}
                    </div>

                    {/* Star rating */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() =>
                            setRatingScores((prev) => ({ ...prev, [member.id]: star }))
                          }
                          className="transition-transform hover:scale-110"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1.25rem",
                            color:
                              star <= currentScore
                                ? "#f59e0b"
                                : "var(--color-border)",
                            padding: "0 1px",
                          }}
                          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                        >
                          {star <= currentScore ? "\u2605" : "\u2606"}
                        </button>
                      ))}
                      {currentScore > 0 && (
                        <span
                          className="text-xs ml-1"
                          style={{
                            color: "var(--color-text-secondary)",
                            fontFamily: "system-ui, sans-serif",
                          }}
                        >
                          {currentScore}/5
                        </span>
                      )}
                    </div>

                    {/* Comment (optional) */}
                    <input
                      type="text"
                      className="input-field text-sm mb-2"
                      placeholder="Optional comment..."
                      value={ratingComments[member.id] || ""}
                      onChange={(e) =>
                        setRatingComments((prev) => ({
                          ...prev,
                          [member.id]: e.target.value,
                        }))
                      }
                      style={{ fontSize: "0.8rem" }}
                    />

                    <button
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor:
                          currentScore > 0
                            ? "var(--color-accent)"
                            : "var(--color-border)",
                        color: currentScore > 0 ? "white" : "var(--color-text-secondary)",
                        border: "none",
                        cursor: currentScore > 0 ? "pointer" : "not-allowed",
                        fontFamily: "system-ui, sans-serif",
                      }}
                      onClick={() => handleRatingSubmit(member.id)}
                      disabled={!currentScore || ratingSaving === member.id}
                    >
                      {ratingSaving === member.id
                        ? "Saving..."
                        : existingRating
                          ? "Update Rating"
                          : "Submit Rating"}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
