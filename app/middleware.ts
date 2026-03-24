import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to block invalid Server Action requests.
 *
 * This app uses zero Server Actions — all mutations go through API route handlers.
 * Any request with a `Next-Action` header is from a bot/scanner probing for
 * Next.js server actions. Returning 400 here prevents the framework from
 * logging noisy "Failed to find Server Action" errors in PM2 logs.
 */
export function middleware(req: NextRequest) {
  if (req.headers.get("next-action")) {
    return NextResponse.json(
      { error: "Server Actions are not supported" },
      { status: 400 }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets and internal Next.js paths
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
