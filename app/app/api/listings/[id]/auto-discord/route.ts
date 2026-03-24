import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { isBotConfigured, generateBotInviteUrl } from "@/lib/discord";

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
      { error: "Discord bot is not configured" },
      { status: 503 }
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
      { error: "Only the listing author can set up the Discord group" },
      { status: 403 }
    );
  }

  if (!listing.is_full) {
    return NextResponse.json(
      { error: "The group is not full yet" },
      { status: 400 }
    );
  }

  if (listing.discord_link) {
    return NextResponse.json(
      { error: "A Discord link has already been set" },
      { status: 400 }
    );
  }

  const inviteUrl = generateBotInviteUrl(listingId);

  return NextResponse.json({
    inviteUrl,
    instructions:
      "Click the link to add the Bookmate bot to your Discord server. " +
      "The bot will create a reading group channel and generate an invite link for your members.",
  });
}
