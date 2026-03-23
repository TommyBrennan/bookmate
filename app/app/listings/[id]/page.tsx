import type { Metadata } from "next";
import db from "@/lib/db";
import ListingDetail from "./ListingDetail";

interface ListingRow {
  book_title: string;
  book_author: string;
  book_cover_url: string;
  reading_pace: string;
  author_name: string;
  max_group_size: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listingId = parseInt(id, 10);

  if (isNaN(listingId)) {
    return { title: "Listing not found — Bookmate" };
  }

  try {
    const listing = db
      .prepare(
        `SELECT l.book_title, l.book_author, l.book_cover_url, l.reading_pace,
                l.max_group_size, u.display_name as author_name
         FROM listings l
         JOIN users u ON l.author_id = u.id
         WHERE l.id = ?`
      )
      .get(listingId) as ListingRow | undefined;

    if (!listing) {
      return { title: "Listing not found — Bookmate" };
    }

    const title = `${listing.book_title} by ${listing.book_author} — Bookmate`;
    const description = `Join a reading group for "${listing.book_title}" by ${listing.book_author}. Pace: ${listing.reading_pace}. Up to ${listing.max_group_size} readers. Posted by ${listing.author_name}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        ...(listing.book_cover_url
          ? {
              images: [
                {
                  url: listing.book_cover_url,
                  alt: `Cover of ${listing.book_title}`,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: listing.book_cover_url ? "summary_large_image" : "summary",
        title,
        description,
        ...(listing.book_cover_url ? { images: [listing.book_cover_url] } : {}),
      },
    };
  } catch {
    return { title: "Listing — Bookmate" };
  }
}

export default function ListingPage() {
  return <ListingDetail />;
}
