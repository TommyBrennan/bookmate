"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BookSearch from "@/components/BookSearch";

export default function CreateListingPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookCoverUrl, setBookCoverUrl] = useState("");
  const [bookOlid, setBookOlid] = useState("");
  const [language, setLanguage] = useState("English");
  const [readingPace, setReadingPace] = useState("");
  const [startDate, setStartDate] = useState("");
  const [meetingFormat, setMeetingFormat] = useState("text");
  const [maxGroupSize, setMaxGroupSize] = useState("4");
  const [requiresApproval, setRequiresApproval] = useState(false);

  const handleBookSelect = (book: {
    title: string;
    author: string;
    coverUrl: string;
    olid: string;
  }) => {
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookCoverUrl(book.coverUrl);
    setBookOlid(book.olid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle,
          bookAuthor,
          bookCoverUrl,
          bookOlid,
          language,
          readingPace,
          startDate,
          meetingFormat,
          maxGroupSize,
          requiresApproval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        setError(data.error || "Failed to create listing");
        return;
      }

      router.push(`/listings/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl mb-2">Start a reading group</h1>
      <p
        className="mb-8"
        style={{
          color: "var(--color-text-secondary)",
          fontFamily: "system-ui, sans-serif",
          fontSize: "0.95rem",
        }}
      >
        Choose a book, set your pace, and wait for readers to join.
      </p>

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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Book
          </label>
          <BookSearch onSelect={handleBookSelect} />
          {bookTitle && (
            <div
              className="mt-2 flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: "rgba(224, 122, 58, 0.06)" }}
            >
              {bookCoverUrl && (
                <img
                  src={bookCoverUrl}
                  alt=""
                  className="w-10 h-14 object-cover rounded"
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
              </div>
            </div>
          )}
        </div>

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
          <div className="flex gap-3">
            {[
              { value: "text", label: "Text chat" },
              { value: "voice", label: "Voice calls" },
              { value: "mixed", label: "Mixed" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
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
          <select
            className="input-field"
            value={maxGroupSize}
            onChange={(e) => setMaxGroupSize(e.target.value)}
          >
            {[2, 3, 4, 5, 6, 8, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n} readers
              </option>
            ))}
          </select>
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
          onClick={() => setRequiresApproval(!requiresApproval)}
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

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading || !bookTitle}
        >
          {loading ? "Creating..." : "Create reading group"}
        </button>
      </form>
    </div>
  );
}
