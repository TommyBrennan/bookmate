import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      bookTitle,
      bookAuthor,
      bookCoverUrl,
      bookOlid,
      language,
      readingPace,
      startDate,
      meetingFormat,
      maxGroupSize,
      requiresApproval,
      platformPreference,
    } = body;

    if (!bookTitle || !bookAuthor || !readingPace || !startDate || !meetingFormat || !maxGroupSize) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Input length limits to prevent abuse
    if (bookTitle.length > 300 || bookAuthor.length > 200 || readingPace.length > 200) {
      return NextResponse.json(
        { error: "One or more fields exceed maximum length" },
        { status: 400 }
      );
    }

    if (!["voice", "text", "mixed"].includes(meetingFormat)) {
      return NextResponse.json(
        { error: "Invalid meeting format" },
        { status: 400 }
      );
    }

    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { error: "Invalid start date format (expected YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const size = parseInt(maxGroupSize, 10);
    if (isNaN(size) || size < 2 || size > 20) {
      return NextResponse.json(
        { error: "Group size must be between 2 and 20" },
        { status: 400 }
      );
    }

    const platform = ["telegram", "discord"].includes(platformPreference)
      ? platformPreference
      : "telegram";

    const result = db
      .prepare(
        `INSERT INTO listings (author_id, book_title, book_author, book_cover_url, book_olid, language, reading_pace, start_date, meeting_format, max_group_size, requires_approval, platform_preference)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.userId,
        bookTitle.trim(),
        bookAuthor.trim(),
        bookCoverUrl || "",
        bookOlid || "",
        language || "English",
        readingPace.trim(),
        startDate,
        meetingFormat,
        size,
        requiresApproval ? 1 : 0,
        platform
      );

    // Auto-join the author as a member
    db.prepare(
      "INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)"
    ).run(result.lastInsertRowid, session.userId);

    return NextResponse.json(
      { id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create listing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
