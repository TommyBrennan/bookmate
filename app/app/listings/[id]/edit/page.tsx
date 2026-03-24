"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookCoverUrl, setBookCoverUrl] = useState("");
  const [language, setLanguage] = useState("English");
  const [readingPace, setReadingPace] = useState("");
  const [startDate, setStartDate] = useState("");
  const [meetingFormat, setMeetingFormat] = useState("text");
  const [maxGroupSize, setMaxGroupSize] = useState("4");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [platformPreference, setPlatformPreference] = useState("telegram");
  const [memberCount, setMemberCount] = useState(1);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await fetch(`/api/listings/${id}`);
        const data = await res.json();
        if (res.ok && data.listing) {
          const l = data.listing;
          if (!l.isAuthor) {
            router.push(`/listings/${id}`);
            return;
          }
          // Cannot edit if platform link shared
          if (l.telegram_link || l.discord_link) {
            router.push(`/listings/${id}`);
            return;
          }
          setBookTitle(l.book_title);
          setBookAuthor(l.book_author);
          setBookCoverUrl(l.book_cover_url || "");
          setLanguage(l.language || "English");
          setReadingPace(l.reading_pace || "");
          setStartDate(l.start_date || "");
          setMeetingFormat(l.meeting_format || "text");
          setMaxGroupSize(String(l.max_group_size || 4));
          setRequiresApproval(!!l.requires_approval);
          setPlatformPreference(l.platform_preference || "telegram");
          setMemberCount(l.memberCount || 1);
        } else if (res.status === 401) {
          router.push("/auth/login");
        } else {
          setError("Listing not found");
          setFetchFailed(true);
        }
      } catch {
        setError("Failed to load listing");
        setFetchFailed(true);
      } finally {
        setFetching(false);
      }
    }
    fetchListing();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          readingPace,
          startDate,
          meetingFormat,
          maxGroupSize,
          requiresApproval,
          platformPreference,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        setError(data.error || "Failed to update listing");
        return;
      }

      router.push(`/listings/${id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Filter group size options: only allow sizes >= current member count
  const groupSizeOptions = [2, 3, 4, 5, 6, 8, 10, 15, 20].filter(
    (n) => n >= memberCount
  );

  // Don't render the form if the fetch failed — prevents submitting default values
  if (fetchFailed) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl mb-2">Edit reading group</h1>
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            backgroundColor: "rgba(192, 57, 43, 0.08)",
            color: "var(--color-error)",
            fontFamily: "system-ui, sans-serif",
          }}
          role="alert"
        >
          {error}
        </div>
        <button
          className="btn-secondary"
          onClick={() => router.push(`/listings/${id}`)}
        >
          Back to listing
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl sm:text-3xl mb-2">Edit reading group</h1>
      <p
        className="mb-6 sm:mb-8"
        style={{
          color: "var(--color-text-secondary)",
          fontFamily: "system-ui, sans-serif",
          fontSize: "0.95rem",
        }}
      >
        Update your group settings. Book title and author cannot be changed.
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
        >
          {error}
        </div>
      )}

      {/* Book info (read-only) */}
      <div
        className="mb-6 flex items-center gap-3 p-4 rounded-lg"
        style={{
          backgroundColor: "rgba(224, 122, 58, 0.06)",
          border: "1px solid var(--color-border)",
        }}
      >
        {bookCoverUrl && (
          <Image
            src={bookCoverUrl}
            alt={`Cover of ${bookTitle}`}
            width={48}
            height={68}
            className="w-12 h-17 object-cover rounded"
            unoptimized
          />
        )}
        <div>
          <div
            className="text-sm font-semibold"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {bookTitle}
          </div>
          <div
            className="text-xs"
            style={{
              color: "var(--color-text-secondary)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            by {bookAuthor}
          </div>
          <div
            className="text-xs mt-1"
            style={{
              color: "var(--color-text-secondary)",
              fontFamily: "system-ui, sans-serif",
              fontStyle: "italic",
            }}
          >
            Book cannot be changed
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Discussion language
          </label>
          <select
            className="input-field"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
            <option>Russian</option>
            <option>Portuguese</option>
            <option>Italian</option>
            <option>Japanese</option>
            <option>Chinese</option>
            <option>Korean</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Reading pace
          </label>
          <input
            type="text"
            className="input-field"
            value={readingPace}
            onChange={(e) => setReadingPace(e.target.value)}
            required
            placeholder='e.g. "1 chapter per week" or "50 pages per day"'
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Start date
          </label>
          <input
            type="date"
            className="input-field"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Meeting format
          </label>
          <div className="flex gap-3" role="radiogroup" aria-label="Meeting format">
            {[
              { value: "text", label: "Text chat" },
              { value: "voice", label: "Voice calls" },
              { value: "mixed", label: "Mixed" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={meetingFormat === opt.value}
                onClick={() => setMeetingFormat(opt.value)}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                style={{
                  fontFamily: "system-ui, sans-serif",
                  backgroundColor:
                    meetingFormat === opt.value
                      ? "var(--color-accent)"
                      : "transparent",
                  color:
                    meetingFormat === opt.value
                      ? "white"
                      : "var(--color-text-secondary)",
                  border:
                    meetingFormat === opt.value
                      ? "1.5px solid var(--color-accent)"
                      : "1.5px solid var(--color-border)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Maximum group size
          </label>
          {memberCount > 1 && (
            <p
              className="text-xs mb-1"
              style={{
                color: "var(--color-text-secondary)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Cannot be less than current member count ({memberCount})
            </p>
          )}
          <select
            className="input-field"
            value={maxGroupSize}
            onChange={(e) => setMaxGroupSize(e.target.value)}
          >
            {groupSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} readers
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Chat platform
          </label>
          <p
            className="text-xs mb-2"
            style={{
              color: "var(--color-text-secondary)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Where your group will connect once it&apos;s full
          </p>
          <div className="flex gap-3" role="radiogroup" aria-label="Chat platform">
            {[
              { value: "telegram", label: "Telegram", icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              )},
              { value: "discord", label: "Discord", icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                </svg>
              )},
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={platformPreference === opt.value}
                onClick={() => setPlatformPreference(opt.value)}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                style={{
                  fontFamily: "system-ui, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  backgroundColor:
                    platformPreference === opt.value
                      ? "var(--color-accent)"
                      : "transparent",
                  color:
                    platformPreference === opt.value
                      ? "white"
                      : "var(--color-text-secondary)",
                  border:
                    platformPreference === opt.value
                      ? "1.5px solid var(--color-accent)"
                      : "1.5px solid var(--color-border)",
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="flex items-start gap-3 p-4 rounded-lg cursor-pointer"
          style={{
            backgroundColor: requiresApproval
              ? "rgba(224, 122, 58, 0.06)"
              : "transparent",
            border: requiresApproval
              ? "1.5px solid var(--color-accent)"
              : "1.5px solid var(--color-border)",
          }}
          role="checkbox"
          aria-checked={requiresApproval}
          aria-label="Require approval for new members"
          tabIndex={0}
          onClick={() => setRequiresApproval(!requiresApproval)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setRequiresApproval(!requiresApproval);
            }
          }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center mt-0.5"
            style={{
              flexShrink: 0,
              backgroundColor: requiresApproval
                ? "var(--color-accent)"
                : "transparent",
              border: requiresApproval
                ? "none"
                : "2px solid var(--color-border)",
            }}
          >
            {requiresApproval && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div>
            <div
              className="text-sm font-semibold"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Require approval for new members
            </div>
            <div
              className="text-xs mt-0.5"
              style={{
                color: "var(--color-text-secondary)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Members must be approved by you before joining the group.
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold cursor-pointer"
            style={{
              fontFamily: "system-ui, sans-serif",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              backgroundColor: "transparent",
            }}
            onClick={() => router.push(`/listings/${id}`)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
