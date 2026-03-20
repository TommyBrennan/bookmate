import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { notifyListingAuthor, notifyGroupFull } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const listingId = parseInt(id, 10);

  const listing = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.requires_approval) {
    return NextResponse.json(
      { error: "This group requires approval. Please apply instead." },
      { status: 400 }
    );
  }

  if (listing.is_full) {
    return NextResponse.json({ error: "This group is already full" }, { status: 400 });
  }

  // Check if already a member
  const existing = db
    .prepare(
      "SELECT 1 FROM listing_members WHERE listing_id = ? AND user_id = ?"
    )
    .get(listingId, session.userId);

  if (existing) {
    return NextResponse.json({ error: "You are already a member" }, { status: 400 });
  }

  // Count current members
  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM listing_members WHERE listing_id = ?")
    .get(listingId) as { count: number };

  if (count >= (listing.max_group_size as number)) {
    return NextResponse.json({ error: "This group is already full" }, { status: 400 });
  }

  // Join
  db.prepare(
    "INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)"
  ).run(listingId, session.userId);

  // Notify the author
  notifyListingAuthor(listingId, session.displayName || "Someone");

  // Check if group is now full
  const newCount = count + 1;
  if (newCount >= (listing.max_group_size as number)) {
    db.prepare("UPDATE listings SET is_full = 1 WHERE id = ?").run(listingId);
    notifyGroupFull(listingId);
  }

  return NextResponse.json({ ok: true, memberCount: newCount });
}
