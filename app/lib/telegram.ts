/**
 * Telegram Bot API integration for automatic group creation.
 *
 * When TELEGRAM_BOT_TOKEN is set, the system can:
 * 1. Generate deep links for one-click group creation
 * 2. Detect when the bot is added to a group (via webhook)
 * 3. Auto-generate and save invite links
 *
 * Flow:
 * - Author clicks "Create Telegram Group" → opens deep link in Telegram
 * - Telegram prompts author to create a group with the bot
 * - Bot receives `my_chat_member` update via webhook
 * - Bot creates an invite link and saves it to the listing
 */

/**
 * Read bot token live from process.env on each call — not at module load time.
 * Module-level constants would be frozen when the file is first imported,
 * missing any env vars set or changed after server startup.
 */
function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function getTelegramApi(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

export function isBotConfigured(): boolean {
  return getBotToken().length > 0;
}

/**
 * Call the Telegram Bot API.
 */
async function callApi<T = unknown>(
  method: string,
  params?: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; description?: string }> {
  const res = await fetch(`${getTelegramApi()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params || {}),
  });
  return res.json();
}

/**
 * Get bot info (username, id).
 */
export async function getBotInfo(): Promise<{
  id: number;
  username: string;
  first_name: string;
} | null> {
  const res = await callApi<{
    id: number;
    username: string;
    first_name: string;
  }>("getMe");
  return res.ok ? res.result! : null;
}

/**
 * Generate a deep link that opens Telegram and prompts the user
 * to create a new group with the bot already added.
 *
 * Format: https://t.me/BOT_USERNAME?startgroup=listing_LISTING_ID
 *
 * When the user creates the group, Telegram adds the bot and
 * sends a `my_chat_member` update to our webhook.
 */
export async function generateGroupDeepLink(
  listingId: number
): Promise<string | null> {
  const bot = await getBotInfo();
  if (!bot) return null;
  return `https://t.me/${bot.username}?startgroup=listing_${listingId}`;
}

/**
 * Create an invite link for a chat where the bot is an admin.
 */
export async function createChatInviteLink(
  chatId: number | string
): Promise<string | null> {
  const res = await callApi<{ invite_link: string }>(
    "createChatInviteLink",
    {
      chat_id: chatId,
      name: "Bookmate Reading Group",
      creates_join_request: false,
    }
  );
  if (res.ok && res.result) {
    return res.result.invite_link;
  }
  return null;
}

/**
 * Export the existing invite link for a chat (fallback).
 */
export async function exportChatInviteLink(
  chatId: number | string
): Promise<string | null> {
  const res = await callApi<string>("exportChatInviteLink", {
    chat_id: chatId,
  });
  if (res.ok && res.result) {
    return res.result;
  }
  return null;
}

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 * Telegram's HTML parser interprets <, >, &, and " — all must be escaped
 * in user-supplied content to prevent message injection.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Send a message to a Telegram chat.
 */
export async function sendMessage(
  chatId: number | string,
  text: string
): Promise<boolean> {
  const res = await callApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
  return res.ok;
}

/**
 * Set up webhook URL for receiving Telegram updates.
 */
export async function setWebhook(url: string): Promise<boolean> {
  const res = await callApi("setWebhook", {
    url,
    allowed_updates: ["my_chat_member", "message"],
  });
  return res.ok;
}

/**
 * Parse the listing ID from a /start command payload.
 * Expected format: "listing_123"
 */
export function parseListingIdFromPayload(
  payload: string
): number | null {
  const match = payload.match(/^listing_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
