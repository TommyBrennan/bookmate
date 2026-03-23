import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestRequest, parseResponse } from "../../helpers/mock-request";

const mockTelegram = vi.hoisted(() => ({
  isBotConfigured: vi.fn().mockReturnValue(true),
  setWebhook: vi.fn().mockResolvedValue(true),
  getBotInfo: vi.fn().mockResolvedValue({ id: 123, username: "BookmateBot", first_name: "Bookmate" }),
}));

vi.mock("@/lib/telegram", () => mockTelegram);

const { POST, GET } = await import("@/app/api/telegram/setup/route");

describe("POST /api/telegram/setup", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_SETUP_SECRET", "test-secret");
    vi.stubEnv("TELEGRAM_WEBHOOK_URL", "https://example.com/api/telegram/webhook");
    mockTelegram.isBotConfigured.mockReturnValue(true);
    mockTelegram.setWebhook.mockResolvedValue(true);
    mockTelegram.getBotInfo.mockResolvedValue({ id: 123, username: "BookmateBot", first_name: "Bookmate" });
  });

  it("returns 500 when TELEGRAM_SETUP_SECRET is not configured", async () => {
    vi.stubEnv("TELEGRAM_SETUP_SECRET", "");
    const req = createTestRequest("http://localhost:3000/api/telegram/setup", {
      method: "POST",
      body: { secret: "anything" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns 403 when secret is wrong", async () => {
    const req = createTestRequest("http://localhost:3000/api/telegram/setup", {
      method: "POST",
      body: { secret: "wrong-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 500 when bot is not configured", async () => {
    mockTelegram.isBotConfigured.mockReturnValue(false);
    const req = createTestRequest("http://localhost:3000/api/telegram/setup", {
      method: "POST",
      body: { secret: "test-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns 500 when TELEGRAM_WEBHOOK_URL is not configured", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_URL", "");
    const req = createTestRequest("http://localhost:3000/api/telegram/setup", {
      method: "POST",
      body: { secret: "test-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns 500 when getBotInfo fails", async () => {
    mockTelegram.getBotInfo.mockResolvedValue(null);
    const req = createTestRequest("http://localhost:3000/api/telegram/setup", {
      method: "POST",
      body: { secret: "test-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns 500 when setWebhook fails", async () => {
    mockTelegram.setWebhook.mockResolvedValue(false);
    const req = createTestRequest("http://localhost:3000/api/telegram/setup", {
      method: "POST",
      body: { secret: "test-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("sets up webhook successfully", async () => {
    const req = createTestRequest("http://localhost:3000/api/telegram/setup", {
      method: "POST",
      body: { secret: "test-secret" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data).toEqual({
      ok: true,
      bot: { username: "BookmateBot", id: 123 },
      webhookUrl: "https://example.com/api/telegram/webhook",
    });
  });
});

describe("GET /api/telegram/setup", () => {
  beforeEach(() => {
    mockTelegram.isBotConfigured.mockReturnValue(true);
    vi.stubEnv("TELEGRAM_WEBHOOK_URL", "https://example.com/api/telegram/webhook");
  });

  it("returns bot and webhook configuration status", async () => {
    const res = await GET();
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data).toHaveProperty("botConfigured");
    expect(data).toHaveProperty("webhookUrlConfigured");
  });
});
