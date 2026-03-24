import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "Email, password, and display name are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof displayName !== "string") {
      return NextResponse.json(
        { error: "Email, password, and display name must be strings" },
        { status: 400 }
      );
    }

    // Rate limit: 3 registrations per IP per 15 minutes
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfter } = checkRateLimit(`register:${ip}`, 3);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Normalize email before duplicate check (INSERT stores lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already taken
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(normalizedEmail);
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
      .run(normalizedEmail, passwordHash, displayName.trim());

    // Auto-login after registration
    const session = await getSession();
    session.userId = Number(result.lastInsertRowid);
    session.email = normalizedEmail;
    session.displayName = displayName.trim();
    await session.save();

    return NextResponse.json(
      {
        user: {
          id: result.lastInsertRowid,
          email: normalizedEmail,
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
