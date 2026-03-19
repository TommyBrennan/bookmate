import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import db from "@/lib/db";

export async function GET() {
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ user: null });
  }

  const user = db
    .prepare("SELECT id, email, display_name, bio FROM users WHERE id = ?")
    .get(session.userId) as
    | { id: number; email: string; display_name: string; bio: string }
    | undefined;

  if (!user) {
    session.destroy();
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      bio: user.bio,
    },
  });
}
