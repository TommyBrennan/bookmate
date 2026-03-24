/**
 * Discord Bot API integration for automatic server/channel creation.
 *
 * When DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are set, the system can:
 * 1. Generate bot invite URLs so authors can add the bot to their server
 * 2. Create text channels and invite links via Discord REST API
 * 3. Receive interaction events via webhook
 *
 * Flow:
 * - Author clicks "Set up Discord" → opens bot invite URL
 * - Author adds bot to their server
 * - Bot receives an interaction or the author triggers channel creation
 * - Bot creates a text channel + invite link, saves to listing
 */

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_API = "https://discord.com/api/v10";

export function isBotConfigured(): boolean {
  return BOT_TOKEN.length > 0 && CLIENT_ID.length > 0;
}

/**
 * Validate a Discord snowflake ID (numeric string, 17-20 digits).
 * Used to prevent path traversal in Discord API URL construction.
 */
export function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id);
}

/**
 * Call the Discord REST API.
 */
async function callApi<T = unknown>(
  endpoint: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${DISCORD_API}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: (errData as Record<string, string>).message || `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Get bot user info.
 */
export async function getBotInfo(): Promise<{
  id: string;
  username: string;
} | null> {
  const res = await callApi<{ id: string; username: string }>("/users/@me");
  return res.ok && res.data ? res.data : null;
}

/**
 * Generate a bot invite URL that includes the listing ID in the state parameter.
 * The bot needs permissions: Manage Channels, Create Instant Invite, Send Messages
 *
 * Permission bits:
 * - MANAGE_CHANNELS (0x10) = 16
 * - CREATE_INSTANT_INVITE (0x1) = 1
 * - SEND_MESSAGES (0x800) = 2048
 * - VIEW_CHANNEL (0x400) = 1024
 * Total: 3089
 */
export function generateBotInviteUrl(listingId: number): string {
  const permissions = 3089;
  const state = `listing_${listingId}`;
  return `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=bot&state=${encodeURIComponent(state)}`;
}

/**
 * Create a text channel in a guild.
 */
export async function createTextChannel(
  guildId: string,
  name: string,
  topic?: string
): Promise<{ id: string; name: string } | null> {
  const res = await callApi<{ id: string; name: string }>(
    `/guilds/${guildId}/channels`,
    "POST",
    {
      name: name.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 100),
      type: 0, // GUILD_TEXT
      topic: topic || "Bookmate reading group discussion channel",
    }
  );
  return res.ok && res.data ? res.data : null;
}

/**
 * Create an invite for a channel.
 */
export async function createChannelInvite(
  channelId: string,
  maxAge: number = 0 // 0 = never expires
): Promise<string | null> {
  const res = await callApi<{ code: string }>(
    `/channels/${channelId}/invites`,
    "POST",
    {
      max_age: maxAge,
      max_uses: 0,
      unique: true,
    }
  );
  if (res.ok && res.data) {
    return `https://discord.gg/${res.data.code}`;
  }
  return null;
}

/**
 * Send a message to a Discord channel.
 */
export async function sendChannelMessage(
  channelId: string,
  content: string
): Promise<boolean> {
  const res = await callApi(
    `/channels/${channelId}/messages`,
    "POST",
    { content }
  );
  return res.ok;
}

/**
 * Get guild (server) info.
 */
export async function getGuild(
  guildId: string
): Promise<{ id: string; name: string } | null> {
  const res = await callApi<{ id: string; name: string }>(
    `/guilds/${guildId}`
  );
  return res.ok && res.data ? res.data : null;
}

/**
 * List guilds the bot is a member of.
 */
export async function getBotGuilds(): Promise<
  { id: string; name: string }[]
> {
  const res = await callApi<{ id: string; name: string }[]>(
    "/users/@me/guilds"
  );
  return res.ok && res.data ? res.data : [];
}

/**
 * Parse listing ID from a state or payload string.
 * Expected format: "listing_123"
 */
export function parseListingIdFromState(state: string): number | null {
  const match = state.match(/^listing_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
