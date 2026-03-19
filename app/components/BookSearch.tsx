"use client";

import { useState, useEffect, useRef } from "react";

interface BookResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
}

interface Props {
  onSelect: (book: {
    title: string;
    author: string;
    coverUrl: string;
    olid: string;
  }) => void;
}

export default function BookSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,cover_i`
        );
        const data = await res.json();
        setResults(data.docs || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  const handleSelect = (book: BookResult) => {
    const olid = book.key.replace("/works/", "");
    onSelect({
      title: book.title,
      author: book.author_name?.[0] || "Unknown author",
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : "",
      olid,
    });
    setQuery(book.title);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a book title..."
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <div
          className="absolute right-3 top-3 text-xs"
          style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
        >
          Searching...
        </div>
      )}

      {open && results.length > 0 && (
        <div
          className="absolute z-10 w-full mt-1 card shadow-lg max-h-72 overflow-y-auto"
          style={{ padding: "0.5rem 0" }}
        >
          {results.map((book) => (
            <button
              key={book.key}
              type="button"
              onClick={() => handleSelect(book)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
            >
              {book.cover_i ? (
                <img
                  src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                  alt=""
                  className="w-8 h-12 object-cover rounded"
                />
              ) : (
                <div
                  className="w-8 h-12 rounded flex items-center justify-center text-sm"
                  style={{ backgroundColor: "var(--color-border)" }}
                >
                  📖
                </div>
              )}
              <div className="min-w-0">
                <div
                  className="text-sm font-semibold truncate"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {book.title}
                </div>
                <div
                  className="text-xs truncate"
                  style={{
                    color: "var(--color-text-secondary)",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {book.author_name?.[0] || "Unknown author"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
