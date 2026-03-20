import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";

/**
 * GET /api/profile/reputation?userId=X
 *
 * Returns a user's reputation score and rating breakdown.
 * If no userId is provided, returns the current user's reputation.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const userIdParam = req.nextUrl.searchParams.get("userId");
  const userId = userIdParam ? parseInt(userIdParam, 10) : session.userId;
  const isOwnProfile = userId === session.userId;

  if (userIdParam && isNaN(userId as number)) {
    return NextResponse.json(
      { error: "Invalid userId parameter" },
      { status: 400 }
    );
  }

  // Average score
  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as total_ratings,
        ROUND(AVG(score), 1) as average_score,
        SUM(CASE WHEN score = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN score = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN score = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN score = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) as one_star
       FROM ratings
       WHERE rated_user_id = ?`
    )
    .get(userId) as {
      total_ratings: number;
      average_score: number | null;
      five_star: number;
      four_star: number;
      three_star: number;
      two_star: number;
      one_star: number;
    };

  // Number of completed groups
  const completedGroups = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM listing_members lm
       JOIN listings l ON lm.listing_id = l.id
       WHERE lm.user_id = ? AND l.is_full = 1`
    )
    .get(userId) as { count: number };

  // Number of groups where this user has given ratings
  const groupsRated = db
    .prepare(
      `SELECT COUNT(DISTINCT listing_id) as count
       FROM ratings
       WHERE rater_id = ?`
    )
    .get(userId) as { count: number };

  // Recent ratings received (with anonymized feedback)
  const recentRatings = db
    .prepare(
      `SELECT r.score, r.comment, r.created_at, l.book_title
       FROM ratings r
       JOIN listings l ON r.listing_id = l.id
       WHERE r.rated_user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 10`
    )
    .all(userId) as {
      score: number;
      comment: string;
      created_at: string;
      book_title: string;
    }[];

  // Strip comments from ratings when viewing other users' profiles (privacy)
  const sanitizedRatings = isOwnProfile
    ? recentRatings
    : recentRatings.map(({ score, created_at, book_title }) => ({
        score,
        created_at,
        book_title,
      }));

  return NextResponse.json({
    reputation: {
      averageScore: stats.average_score || 0,
      totalRatings: stats.total_ratings,
      completedGroups: completedGroups.count,
      groupsRated: groupsRated.count,
      breakdown: {
        5: stats.five_star || 0,
        4: stats.four_star || 0,
        3: stats.three_star || 0,
        2: stats.two_star || 0,
        1: stats.one_star || 0,
      },
      recentRatings: sanitizedRatings,
    },
  });
}
