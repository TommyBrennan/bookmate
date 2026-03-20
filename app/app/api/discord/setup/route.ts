import { NextRequest, NextResponse } from "next/server";
import { isBotConfigured, getBotInfo } from "@/lib/discord";

/**
 * Discord bot setup endpoint.
 * Returns bot info and invite URL for verification.
 *
 * Protected by DISCORD_SETUP_SECRET env var.
 */
export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  const setupSecret = process.env.DISCORD_SETUP_SECRET || "";

  if (!setupSecret || secret !== setupSecret) {
    return NextResponse.json(
      { error: "Invalid setup secret" },
      { status: 403 }
    );
  }

  if (!isBotConfigured()) {
    return NextResponse.json(
      {
        error:
          "Discord bot is not configured. Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID environment variables.",
      },
      { status: 503 }
    );
  }

  const botInfo = await getBotInfo();
  if (!botInfo) {
    return NextResponse.json(
      { error: "Failed to connect to Discord API. Check your bot token." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    bot: {
      id: botInfo.id,
      username: botInfo.username,
    },
    message: `Discord bot "${botInfo.username}" is configured and ready.`,
  });
}
