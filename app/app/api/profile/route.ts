import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { displayName, bio } = await req.json();

  // Type-check before string operations to prevent TypeError on non-string input
  if (typeof displayName !== "string") {
    return NextResponse.json({ error: "Display name must be a string" }, { status: 400 });
  }
  if (bio !== undefined && typeof bio !== "string") {
    return NextResponse.json({ error: "Bio must be a string" }, { status: 400 });
  }

  if (!displayName || displayName.trim().length === 0) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  if (displayName.length > 100) {
    return NextResponse.json({ error: "Display name must be at most 100 characters" }, { status: 400 });
  }

  if (bio && bio.length > 500) {
    return NextResponse.json({ error: "Bio must be at most 500 characters" }, { status: 400 });
  }

  db.prepare("UPDATE users SET display_name = ?, bio = ? WHERE id = ?").run(
    displayName.trim(),
    (bio || "").trim(),
    session.userId
  );

  // Update session
  session.displayName = displayName.trim();
  await session.save();

  return NextResponse.json({ ok: true });
}
