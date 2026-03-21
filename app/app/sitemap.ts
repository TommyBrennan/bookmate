import type { MetadataRoute } from "next";
import db from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://89.167.127.85:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/auth/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/listings/create`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Add open listing pages
  const listings = db
    .prepare(
      `SELECT id, created_at FROM listings WHERE is_full = 0 ORDER BY created_at DESC`
    )
    .all() as { id: number; created_at: string }[];

  const listingPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${BASE_URL}/listings/${listing.id}`,
    lastModified: new Date(listing.created_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...listingPages];
}
