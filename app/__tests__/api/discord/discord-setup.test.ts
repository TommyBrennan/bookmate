import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestRequest, parseResponse } from "../../helpers/mock-request";

const mockDiscord = vi.hoisted(() => ({
  isBotConfigured: vi.fn().mockReturnValue(true),
  getBotInfo: vi.fn().mockResolvedValue({ id: "123456", username: "BookmateBot" }),
}));

vi.mock("@/lib/discord", () => mockDiscord);

const { POST } = await import("@/app/api/discord/setup/route");

describe("POST /api/discord/setup", () => {
  beforeEach(() => {
    vi.stubEnv("DISCORD_SETUP_SECRET", "discord-secret");
    mockDiscord.isBotConfigured.mockReturnValue(true);
    mockDiscord.getBotInfo.mockResolvedValue({ id: "123456", username: "BookmateBot" });
  });

  it("returns 403 when secret is wrong", async () => {
    const req = createTestRequest("http://localhost:3000/api/discord/setup", {
      method: "POST",
      body: { secret: "wrong" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 403 when DISCORD_SETUP_SECRET is not configured", async () => {
    vi.stubEnv("DISCORD_SETUP_SECRET", "");
    const req = createTestRequest("http://localhost:3000/api/discord/setup", {
      method: "POST",
      body: { secret: "" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 503 when bot is not configured", async () => {
    mockDiscord.isBotConfigured.mockReturnValue(false);
    const req = createTestRequest("http://localhost:3000/api/discord/setup", {
      method: "POST",
      body: { secret: "discord-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(503);
  });

  it("returns 500 when getBotInfo fails", async () => {
    mockDiscord.getBotInfo.mockResolvedValue(null);
    const req = createTestRequest("http://localhost:3000/api/discord/setup", {
      method: "POST",
      body: { secret: "discord-secret" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });

  it("returns bot info on success", async () => {
    const req = createTestRequest("http://localhost:3000/api/discord/setup", {
      method: "POST",
      body: { secret: "discord-secret" },
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data).toEqual({
      ok: true,
      bot: { id: "123456", username: "BookmateBot" },
      message: expect.stringContaining("BookmateBot"),
    });
  });
});
