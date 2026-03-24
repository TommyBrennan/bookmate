"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
  const [searchError, setSearchError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

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
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError(false);
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,cover_i`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data.docs || []);
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setSearchError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      controller.abort();
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
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const activeDescendant =
    activeIndex >= 0 && results[activeIndex]
      ? `book-option-${results[activeIndex].key}`
      : undefined;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search for a book title..."
        onFocus={() => results.length > 0 && setOpen(true)}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-haspopup="listbox"
        aria-controls="book-search-listbox"
        aria-activedescendant={activeDescendant}
        aria-label="Search for a book"
        aria-autocomplete="list"
      />
      {loading && (
        <div
          className="absolute right-3 top-3 text-xs"
          style={{ color: "var(--color-text-secondary)", fontFamily: "system-ui, sans-serif" }}
          role="status"
          aria-live="polite"
        >
          Searching...
        </div>
      )}

      {searchError && !loading && (
        <div
          className="text-xs mt-1"
          style={{ color: "var(--color-error, #dc2626)" }}
          role="alert"
        >
          Book search is unavailable. Please try again later.
        </div>
      )}

      {open && results.length > 0 && (
        <div
          ref={listboxRef}
          id="book-search-listbox"
          role="listbox"
          aria-label="Book search results"
          className="absolute z-10 w-full mt-1 card shadow-lg max-h-72 overflow-y-auto"
          style={{ padding: "0.5rem 0" }}
        >
          {results.map((book, index) => (
            <div
              key={book.key}
              id={`book-option-${book.key}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleSelect(book)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
              style={{
                backgroundColor: index === activeIndex ? "rgba(0, 0, 0, 0.04)" : undefined,
              }}
            >
              {book.cover_i ? (
                <Image
                  src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                  alt={`Cover of ${book.title}`}
                  width={32}
                  height={48}
                  className="w-8 h-12 object-cover rounded"
                />
              ) : (
                <div
                  className="w-8 h-12 rounded flex items-center justify-center text-sm"
                  style={{ backgroundColor: "var(--color-border)" }}
                  aria-hidden="true"
                >
                  <span role="img" aria-hidden="true">📖</span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
