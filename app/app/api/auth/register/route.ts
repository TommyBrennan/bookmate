import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "Email, password, and display name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // bcrypt only uses the first 72 bytes; cap to prevent DoS via slow hashing
    if (password.length > 72) {
      return NextResponse.json(
        { error: "Password must be at most 72 characters" },
        { status: 400 }
      );
    }

    if (displayName.length > 100) {
      return NextResponse.json(
        { error: "Display name must be at most 100 characters" },
        { status: 400 }
      );
    }

    if (email.length > 254) {
      return NextResponse.json(
        { error: "Email address is too long" },
        { status: 400 }
      );
    }

    // Check if email is already taken
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db
      .prepare(
        "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)"
      )
      .run(email.toLowerCase().trim(), passwordHash, displayName.trim());

    // Auto-login after registration
    const session = await getSession();
    session.userId = Number(result.lastInsertRowid);
    session.email = email.toLowerCase().trim();
    session.displayName = displayName.trim();
    await session.save();

    return NextResponse.json(
      {
        user: {
          id: result.lastInsertRowid,
          email: email.toLowerCase().trim(),
          displayName: displayName.trim(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
