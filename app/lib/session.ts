import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import db from "./db";

export interface SessionData {
  userId?: number;
  email?: string;
  displayName?: string;
}

const DEV_SECRET =
  "bookmate-development-secret-key-change-in-production-32chars!";

function getSessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET environment variable is required in production"
    );
  }
  return {
    password: secret || DEV_SECRET,
    cookieName: "bookmate_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.HTTPS_ENABLED === "true",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    return null;
  }
  // Verify the user still exists in the DB — a deleted user's cookie
  // would otherwise grant full access until the session expires
  const user = db
    .prepare("SELECT id, display_name FROM users WHERE id = ?")
    .get(session.userId) as { id: number; display_name: string } | undefined;
  if (!user) {
    session.destroy();
    return null;
  }
  // Keep session displayName in sync with DB (handles stale cookies)
  if (user.display_name !== session.displayName) {
    session.displayName = user.display_name;
    await session.save();
  }
  return session;
}
