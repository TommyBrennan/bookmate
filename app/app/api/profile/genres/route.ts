import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";

const AVAILABLE_GENRES = [
  "Literary Fiction",
  "Science Fiction",
  "Fantasy",
  "Mystery",
  "Thriller",
  "Romance",
  "Historical Fiction",
  "Horror",
  "Dystopian",
  "Adventure",
  "Contemporary Fiction",
  "Magical Realism",
  "Classics",
  "Short Stories",
  "Young Adult",
  "Graphic Novels",
];

interface GenreRow {
  genre: string;
}

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const userGenres = db.prepare(
    "SELECT genre FROM user_genres WHERE user_id = ? ORDER BY genre"
  ).all(session.userId) as GenreRow[];

  return NextResponse.json({
    genres: userGenres.map((g) => g.genre),
    available: AVAILABLE_GENRES,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { genres } = await req.json();

  if (!Array.isArray(genres)) {
    return NextResponse.json({ error: "genres must be an array" }, { status: 400 });
  }

  // Validate all genres
  const validGenres = genres.filter((g: string) => AVAILABLE_GENRES.includes(g));

  // Replace all genres in a transaction
  const updateGenres = db.transaction(() => {
    db.prepare("DELETE FROM user_genres WHERE user_id = ?").run(session.userId);
    const insert = db.prepare("INSERT INTO user_genres (user_id, genre) VALUES (?, ?)");
    for (const genre of validGenres) {
      insert.run(session.userId, genre);
    }
  });

  updateGenres();

  return NextResponse.json({ genres: validGenres });
}
