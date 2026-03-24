import { NextRequest, NextResponse } from "next/server";
import { isBotConfigured, setWebhook, getBotInfo } from "@/lib/telegram";
import { safeCompare } from "@/lib/crypto-utils";

/**
 * POST /api/telegram/setup
 *
 * Sets up the Telegram webhook. Should be called once after deployment.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_URL env vars.
 *
 * Protected by a setup secret to prevent unauthorized access.
 */
export async function POST(req: NextRequest) {
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { error: "TELEGRAM_SETUP_SECRET not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();
  if (!body.secret || typeof body.secret !== "string" || !safeCompare(body.secret, setupSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isBotConfigured()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 500 }
    );
  }

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_URL not configured" },
      { status: 500 }
    );
  }

  const bot = await getBotInfo();
  if (!bot) {
    return NextResponse.json(
      { error: "Failed to connect to Telegram API. Check your bot token." },
      { status: 500 }
    );
  }

  const success = await setWebhook(webhookUrl);
  if (!success) {
    return NextResponse.json(
      { error: "Failed to set webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    bot: { username: bot.username, id: bot.id },
    webhookUrl,
  });
}

/**
 * GET /api/telegram/setup
 *
 * Returns the current Telegram bot configuration status.
 */
export async function GET() {
  return NextResponse.json({
    botConfigured: isBotConfigured(),
    webhookUrlConfigured: !!process.env.TELEGRAM_WEBHOOK_URL,
  });
}
