import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: number;
  email?: string;
  displayName?: string;
}

const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "bookmate-development-secret-key-change-in-production-32chars!",
  cookieName: "bookmate_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    return null;
  }
  return session;
}
