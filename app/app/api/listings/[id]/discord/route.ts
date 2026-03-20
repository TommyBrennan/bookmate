import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function POST(
  req: NextRequest,
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

  if (listing.author_id !== session.userId) {
    return NextResponse.json(
      { error: "Only the listing author can set the Discord link" },
      { status: 403 }
    );
  }

  const { discordLink } = await req.json();

  if (
    !discordLink ||
    !(
      discordLink.startsWith("https://discord.gg/") ||
      discordLink.startsWith("https://discord.com/invite/")
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Please provide a valid Discord invite link (https://discord.gg/... or https://discord.com/invite/...)",
      },
      { status: 400 }
    );
  }

  db.prepare("UPDATE listings SET discord_link = ? WHERE id = ?").run(
    discordLink.trim(),
    listingId
  );

  return NextResponse.json({ ok: true });
}
