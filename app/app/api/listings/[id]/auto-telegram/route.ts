import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { isBotConfigured, generateGroupDeepLink } from "@/lib/telegram";

/**
 * GET /api/listings/[id]/auto-telegram
 *
 * Returns the Telegram deep link for one-click group creation.
 * Only available to the listing author when the group is full
 * and no Telegram link has been set yet.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!isBotConfigured()) {
    return NextResponse.json(
      { error: "Telegram bot not configured", botConfigured: false },
      { status: 404 }
    );
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

  if (listing.author_id !== session.userId) {
    return NextResponse.json(
      { error: "Only the organizer can create the Telegram group" },
      { status: 403 }
    );
  }

  if (!listing.is_full) {
    return NextResponse.json(
      { error: "Group must be full before creating a Telegram group" },
      { status: 400 }
    );
  }

  if (listing.telegram_link) {
    return NextResponse.json(
      { error: "Telegram link already set", telegramLink: listing.telegram_link },
      { status: 400 }
    );
  }

  const deepLink = await generateGroupDeepLink(listingId);
  if (!deepLink) {
    return NextResponse.json(
      { error: "Failed to generate deep link. Check bot configuration." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deepLink,
    instructions:
      "Click the link to open Telegram and create a group. The bot will automatically generate an invite link for your reading group.",
  });
}
