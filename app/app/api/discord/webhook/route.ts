import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  createTextChannel,
  createChannelInvite,
  sendChannelMessage,
} from "@/lib/discord";
import { createNotification } from "@/lib/notifications";

/**
 * Discord webhook endpoint for bot events.
 *
 * This endpoint handles:
 * 1. POST with { type: "link", guildId, listingId } - Link a Discord server to a listing
 *    (called by the bot or by an admin setup flow)
 *
 * Note: Unlike Telegram's push-based webhook, Discord uses Gateway (WebSocket)
 * for real-time events. This endpoint is used as an HTTP callback for
 * simpler integration scenarios or manual triggering.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "link") {
      return handleLink(body);
    }

    // Discord Interaction verification (for future slash command support)
    if (type === 1) {
      // PING - respond with PONG
      return NextResponse.json({ type: 1 });
    }

    return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
  } catch (err) {
    console.error("Discord webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleLink(body: {
  guildId: string;
  listingId: number;
  channelId?: string;
}) {
  const { guildId, listingId, channelId } = body;

  if (!guildId || !listingId) {
    return NextResponse.json(
      { error: "Missing guildId or listingId" },
      { status: 400 }
    );
  }

  const listing = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.discord_link) {
    return NextResponse.json(
      { error: "Discord link already set for this listing" },
      { status: 400 }
    );
  }

  let targetChannelId = channelId;

  // If no channel specified, create one
  if (!targetChannelId) {
    const bookTitle = String(listing.book_title || "reading-group");
    const channelName = `bookmate-${bookTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}`;

    const channel = await createTextChannel(
      guildId,
      channelName,
      `Bookmate reading group for "${listing.book_title}" by ${listing.book_author}`
    );

    if (!channel) {
      return NextResponse.json(
        { error: "Failed to create Discord channel. Make sure the bot has Manage Channels permission." },
        { status: 500 }
      );
    }

    targetChannelId = channel.id;
  }

  // Create invite link
  const inviteLink = await createChannelInvite(targetChannelId);
  if (!inviteLink) {
    return NextResponse.json(
      { error: "Failed to create invite link. Make sure the bot has Create Instant Invite permission." },
      { status: 500 }
    );
  }

  // Save to DB
  db.prepare(
    "UPDATE listings SET discord_link = ?, discord_channel_id = ? WHERE id = ?"
  ).run(inviteLink, targetChannelId, listingId);

  // Notify all members
  const members = db
    .prepare("SELECT user_id FROM listing_members WHERE listing_id = ?")
    .all(listingId) as { user_id: number }[];

  for (const member of members) {
    createNotification(
      member.user_id,
      listingId,
      "discord_ready",
      `The Discord channel for "${listing.book_title}" is ready! Join to start discussing.`
    );
  }

  // Send welcome message to the channel
  await sendChannelMessage(
    targetChannelId,
    `Welcome to the **${listing.book_title}** reading group! 📚\n\n` +
      `This channel was created by Bookmate for your reading group.\n` +
      `**Reading pace:** ${listing.reading_pace}\n` +
      `**Start date:** ${listing.start_date}\n\n` +
      `Happy reading! 🎉`
  );

  return NextResponse.json({ ok: true, inviteLink });
}
