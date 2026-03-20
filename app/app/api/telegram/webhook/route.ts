import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  createChatInviteLink,
  exportChatInviteLink,
  sendMessage,
  parseListingIdFromPayload,
} from "@/lib/telegram";
import { createNotification } from "@/lib/notifications";

/**
 * Telegram webhook endpoint.
 *
 * Handles two types of updates:
 *
 * 1. `my_chat_member` — bot was added to a group
 *    When the author creates a group via the deep link, the bot is
 *    automatically added. We detect this, generate an invite link,
 *    and save it to the listing.
 *
 * 2. `message` with `/start listing_ID` — the bot receives a start
 *    command in a group with a payload referencing a listing.
 */
export async function POST(req: NextRequest) {
  // Verify webhook secret if configured
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const headerSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (headerSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  let update: Record<string, unknown>;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle bot being added to a group chat
  if (update.my_chat_member) {
    await handleChatMemberUpdate(
      update.my_chat_member as ChatMemberUpdate
    );
  }

  // Handle /start command in groups (fallback mechanism)
  if (update.message) {
    await handleMessage(update.message as TelegramMessage);
  }

  // Always return 200 to Telegram to avoid retries
  return NextResponse.json({ ok: true });
}

interface ChatMemberUpdate {
  chat: {
    id: number;
    title?: string;
    type: string;
  };
  from: {
    id: number;
    first_name: string;
  };
  new_chat_member: {
    user: {
      id: number;
      is_bot: boolean;
    };
    status: string;
  };
}

interface TelegramMessage {
  chat: {
    id: number;
    type: string;
    title?: string;
  };
  text?: string;
  from?: {
    id: number;
  };
}

/**
 * When the bot is added to a group, check if it's related to a listing.
 *
 * The deep link format is: t.me/BOT?startgroup=listing_ID
 * When a user creates a group through this link, Telegram:
 * 1. Creates the group
 * 2. Adds the bot as a member
 * 3. Sends a `my_chat_member` update
 *
 * We use the group title or a pending mapping to associate the chat with a listing.
 */
async function handleChatMemberUpdate(update: ChatMemberUpdate) {
  const { chat, new_chat_member } = update;

  // Only process when bot is added (member or administrator)
  if (
    !new_chat_member.user.is_bot ||
    !["member", "administrator"].includes(new_chat_member.status)
  ) {
    return;
  }

  // Only process group chats
  if (!["group", "supergroup"].includes(chat.type)) {
    return;
  }

  // Try to find the listing this group belongs to.
  // Strategy 1: Check pending_telegram_groups mapping table
  const pending = db
    .prepare(
      "SELECT listing_id FROM pending_telegram_groups WHERE telegram_chat_id = ?"
    )
    .get(chat.id) as { listing_id: number } | undefined;

  if (pending) {
    await linkTelegramToListing(pending.listing_id, chat.id);
    db.prepare("DELETE FROM pending_telegram_groups WHERE telegram_chat_id = ?").run(
      chat.id
    );
    return;
  }

  // Strategy 2: Check for listings awaiting auto-telegram (most recent unlinked full listing by this author)
  // We store the chat ID and wait for the /start command or title match
  // For now, store the mapping and send a welcome message
  await sendMessage(
    chat.id,
    "Hello! I'm the Bookmate bot. I'll help set up this reading group.\n\n" +
      'If this group was created for a Bookmate listing, I\'ll automatically generate an invite link. ' +
      "The organizer can also type <code>/link</code> to manually trigger the setup."
  );

  // Store the chat for potential later linking
  try {
    db.prepare(
      "INSERT OR IGNORE INTO telegram_chats (chat_id, chat_title, created_at) VALUES (?, ?, datetime('now'))"
    ).run(chat.id, chat.title || "");
  } catch {
    // Table might not exist yet on first run — handled gracefully
  }
}

/**
 * Handle messages in group chats.
 * Supports /start with payload and /link command.
 */
async function handleMessage(message: TelegramMessage) {
  if (!message.text || !["group", "supergroup"].includes(message.chat.type)) {
    return;
  }

  const text = message.text.trim();

  // Handle /start with listing payload (sent when group is created via deep link)
  if (text.startsWith("/start ")) {
    const payload = text.replace("/start ", "").trim();
    const listingId = parseListingIdFromPayload(payload);
    if (listingId) {
      await linkTelegramToListing(listingId, message.chat.id);
      return;
    }
  }

  // Handle /link command — allow manual linking
  if (text === "/link") {
    // Find the most recent full listing without a telegram link
    // that was authored by someone (we can't verify Telegram user = Bookmate user
    // without account linking, so we just report available listings)
    const unlinkedListings = db
      .prepare(
        `SELECT id, book_title FROM listings
         WHERE is_full = 1 AND (telegram_link = '' OR telegram_link IS NULL)
         AND telegram_chat_id IS NULL
         ORDER BY created_at DESC LIMIT 5`
      )
      .all() as { id: number; book_title: string }[];

    if (unlinkedListings.length === 0) {
      await sendMessage(
        message.chat.id,
        "No unlinked reading groups found. The group may already be set up!"
      );
      return;
    }

    if (unlinkedListings.length === 1) {
      // Auto-link the only available listing
      await linkTelegramToListing(unlinkedListings[0].id, message.chat.id);
      return;
    }

    // Show options
    const listText = unlinkedListings
      .map((l) => `  /link_${l.id} — "${l.book_title}"`)
      .join("\n");
    await sendMessage(
      message.chat.id,
      `Multiple reading groups need a Telegram link. Pick one:\n\n${listText}`
    );
    return;
  }

  // Handle /link_ID command
  const linkMatch = text.match(/^\/link_(\d+)$/);
  if (linkMatch) {
    const listingId = parseInt(linkMatch[1], 10);
    await linkTelegramToListing(listingId, message.chat.id);
  }
}

/**
 * Link a Telegram chat to a listing:
 * 1. Generate an invite link
 * 2. Save it to the listing
 * 3. Notify all members
 * 4. Send a confirmation message to the Telegram group
 */
async function linkTelegramToListing(listingId: number, chatId: number) {
  const listing = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    await sendMessage(chatId, "Could not find that reading group on Bookmate.");
    return;
  }

  if (listing.telegram_link) {
    await sendMessage(chatId, "This reading group already has a Telegram link set up!");
    return;
  }

  // Try to create an invite link
  let inviteLink = await createChatInviteLink(chatId);
  if (!inviteLink) {
    // Fallback: export the default invite link
    inviteLink = await exportChatInviteLink(chatId);
  }

  if (!inviteLink) {
    await sendMessage(
      chatId,
      "I couldn't generate an invite link. Please make sure I have admin permissions in this group, " +
        "then try again with /link"
    );
    return;
  }

  // Save to database
  db.prepare(
    "UPDATE listings SET telegram_link = ?, telegram_chat_id = ? WHERE id = ?"
  ).run(inviteLink, chatId, listingId);

  // Notify all members on Bookmate
  const members = db
    .prepare("SELECT user_id FROM listing_members WHERE listing_id = ?")
    .all(listingId) as { user_id: number }[];

  const bookTitle = listing.book_title as string;
  for (const member of members) {
    createNotification(
      member.user_id,
      listingId,
      "telegram_ready",
      `The Telegram group for "${bookTitle}" is ready! Click to view the invite link.`
    );
  }

  // Send confirmation to the Telegram group
  await sendMessage(
    chatId,
    `This group is now linked to the Bookmate reading group for "<b>${bookTitle}</b>".\n\n` +
      `Invite link: ${inviteLink}\n\n` +
      "All group members have been notified on Bookmate. Happy reading!"
  );
}
