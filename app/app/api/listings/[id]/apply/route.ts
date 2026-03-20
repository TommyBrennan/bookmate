import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { notifyApplicationReceived } from "@/lib/notifications";

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
  if (isNaN(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const listing = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.author_id === session.userId) {
    return NextResponse.json(
      { error: "You cannot apply to your own listing" },
      { status: 400 }
    );
  }

  if (!listing.requires_approval) {
    return NextResponse.json(
      { error: "This group does not require approval. Join directly." },
      { status: 400 }
    );
  }

  if (listing.is_full) {
    return NextResponse.json({ error: "This group is already full" }, { status: 400 });
  }

  // Check if already a member
  const isMember = db
    .prepare("SELECT 1 FROM listing_members WHERE listing_id = ? AND user_id = ?")
    .get(listingId, session.userId);

  if (isMember) {
    return NextResponse.json({ error: "You are already a member" }, { status: 400 });
  }

  // Check if already applied (pending)
  const existingApp = db
    .prepare(
      "SELECT id, status FROM listing_applications WHERE listing_id = ? AND user_id = ?"
    )
    .get(listingId, session.userId) as { id: number; status: string } | undefined;

  if (existingApp) {
    if (existingApp.status === "pending") {
      return NextResponse.json({ error: "You have already applied" }, { status: 400 });
    }
    if (existingApp.status === "approved") {
      return NextResponse.json({ error: "You are already approved" }, { status: 400 });
    }
    // If rejected, allow re-application by updating status back to pending
    db.prepare(
      "UPDATE listing_applications SET status = 'pending', decided_at = NULL, applied_at = datetime('now') WHERE id = ?"
    ).run(existingApp.id);

    notifyApplicationReceived(listingId, session.displayName || "Someone");
    return NextResponse.json({ ok: true });
  }

  // Insert new application
  db.prepare(
    "INSERT INTO listing_applications (listing_id, user_id) VALUES (?, ?)"
  ).run(listingId, session.userId);

  notifyApplicationReceived(listingId, session.displayName || "Someone");

  return NextResponse.json({ ok: true });
}
