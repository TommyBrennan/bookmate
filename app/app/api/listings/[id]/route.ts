import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession, requireAuth } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { isBotConfigured } from "@/lib/telegram";
import { isBotConfigured as isDiscordBotConfigured } from "@/lib/discord";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const listing = db
    .prepare(
      `SELECT
        l.*,
        u.display_name as author_name
      FROM listings l
      JOIN users u ON l.author_id = u.id
      WHERE l.id = ?`
    )
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const members = db
    .prepare(
      `SELECT u.id, u.display_name, u.bio, lm.joined_at
       FROM listing_members lm
       JOIN users u ON lm.user_id = u.id
       WHERE lm.listing_id = ?
       ORDER BY lm.joined_at ASC`
    )
    .all(listingId) as { id: number; display_name: string; bio: string; joined_at: string }[];

  const session = await getSession();
  const isMember = session.userId
    ? members.some((m) => m.id === session.userId)
    : false;
  const isAuthor = session.userId
    ? listing.author_id === session.userId
    : false;

  // PRD: full listings should be invisible to non-participants
  if (listing.is_full && !isMember && !isAuthor) {
    return NextResponse.json(
      { error: "This listing is no longer available" },
      { status: 404 }
    );
  }

  // Check if the current user has an application (regardless of requires_approval,
  // since the flag may have been toggled after the application was submitted)
  let hasApplied = false;
  let applicationStatus = "";
  if (session.userId && !isMember) {
    const app = db
      .prepare(
        "SELECT status FROM listing_applications WHERE listing_id = ? AND user_id = ?"
      )
      .get(listingId, session.userId) as { status: string } | undefined;
    if (app) {
      hasApplied = app.status === "pending";
      applicationStatus = app.status;
    }
  }

  // Fetch pending applicants if the viewer is the author
  // Show regardless of requires_approval — pending apps can exist after the flag is toggled off
  let pendingApplicants: { application_id: number; id: number; display_name: string; bio: string; applied_at: string }[] = [];
  if (isAuthor) {
    pendingApplicants = db
      .prepare(
        `SELECT la.id as application_id, u.id, u.display_name, u.bio, la.applied_at
         FROM listing_applications la
         JOIN users u ON la.user_id = u.id
         WHERE la.listing_id = ? AND la.status = 'pending'
         ORDER BY la.applied_at ASC`
      )
      .all(listingId) as { application_id: number; id: number; display_name: string; bio: string; applied_at: string }[];
  }

  // Strip sensitive data from the response
  const safeListingData = { ...listing };
  // Always strip internal platform IDs — these are internal bot/channel identifiers
  delete safeListingData.telegram_chat_id;
  delete safeListingData.discord_channel_id;
  if (!isMember && !isAuthor) {
    // Strip invite links for non-members
    delete safeListingData.telegram_link;
    delete safeListingData.discord_link;
  }

  return NextResponse.json({
    listing: {
      ...safeListingData,
      members,
      memberCount: members.length,
      isMember,
      isAuthor,
      hasApplied,
      applicationStatus,
      pendingApplicants,
      currentUserId: session.userId || null,
      telegramBotConfigured: isBotConfigured(),
      discordBotConfigured: isDiscordBotConfigured(),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const listing = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.author_id !== session.userId) {
    return NextResponse.json({ error: "Only the author can edit this listing" }, { status: 403 });
  }

  // Cannot edit if a platform link has been shared (group already formed)
  if (listing.telegram_link || listing.discord_link) {
    return NextResponse.json(
      { error: "Cannot edit a listing after the group chat link has been shared" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const {
      language,
      readingPace,
      startDate,
      meetingFormat,
      maxGroupSize,
      requiresApproval,
      platformPreference,
    } = body;

    // Validate fields that are provided — type check before string operations
    if (readingPace !== undefined && (typeof readingPace !== "string" || !readingPace || readingPace.length > 200)) {
      return NextResponse.json({ error: "Reading pace is required (max 200 characters)" }, { status: 400 });
    }

    if (startDate !== undefined) {
      if (typeof startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return NextResponse.json({ error: "Invalid start date format (expected YYYY-MM-DD)" }, { status: 400 });
      }
      const today = new Date().toISOString().split("T")[0];
      if (startDate < today) {
        return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });
      }
    }

    if (meetingFormat !== undefined && (typeof meetingFormat !== "string" || !["voice", "text", "mixed"].includes(meetingFormat))) {
      return NextResponse.json({ error: "Invalid meeting format" }, { status: 400 });
    }

    if (maxGroupSize !== undefined) {
      if (typeof maxGroupSize !== "number" && typeof maxGroupSize !== "string") {
        return NextResponse.json({ error: "Invalid group size type" }, { status: 400 });
      }
      const size = parseInt(String(maxGroupSize), 10);
      if (isNaN(size) || size < 2 || size > 20) {
        return NextResponse.json({ error: "Group size must be between 2 and 20" }, { status: 400 });
      }

      // Pre-check member count (authoritative check happens inside transaction below)
      const memberCount = (db
        .prepare("SELECT COUNT(*) as count FROM listing_members WHERE listing_id = ?")
        .get(listingId) as { count: number }).count;

      if (size < memberCount) {
        return NextResponse.json(
          { error: `Cannot reduce group size below current member count (${memberCount})` },
          { status: 400 }
        );
      }
    }

    if (language !== undefined && (!language || typeof language !== "string" || language.length > 100)) {
      return NextResponse.json({ error: "Language is required (max 100 characters)" }, { status: 400 });
    }

    if (platformPreference !== undefined && !["telegram", "discord"].includes(platformPreference)) {
      return NextResponse.json({ error: "Invalid platform preference" }, { status: 400 });
    }

    // Build dynamic UPDATE
    const updates: string[] = [];
    const values: unknown[] = [];

    if (language !== undefined) {
      updates.push("language = ?");
      values.push(language);
    }
    if (readingPace !== undefined) {
      updates.push("reading_pace = ?");
      values.push(readingPace.trim());
    }
    if (startDate !== undefined) {
      updates.push("start_date = ?");
      values.push(startDate);
    }
    if (meetingFormat !== undefined) {
      updates.push("meeting_format = ?");
      values.push(meetingFormat);
    }
    // Track whether maxGroupSize change needs is_full recalculation
    let needsIsFullRecalc = false;
    let parsedNewSize = 0;
    if (maxGroupSize !== undefined) {
      parsedNewSize = parseInt(String(maxGroupSize), 10);
      updates.push("max_group_size = ?");
      values.push(parsedNewSize);
      needsIsFullRecalc = true;
    }
    if (requiresApproval !== undefined) {
      updates.push("requires_approval = ?");
      values.push(requiresApproval ? 1 : 0);
    }
    if (platformPreference !== undefined) {
      updates.push("platform_preference = ?");
      values.push(platformPreference);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Check if requires_approval is being toggled off — need to handle orphaned pending apps
    const togglingApprovalOff = requiresApproval === false && listing.requires_approval;

    // Wrap in transaction to prevent race between is_full recalculation and concurrent joins
    // Use local copies of updates/values inside the transaction to avoid mutating outer arrays
    const updateTransaction = db.transaction(() => {
      const txUpdates = [...updates];
      const txValues = [...values];

      if (needsIsFullRecalc) {
        // Re-read member count and is_full inside transaction to prevent stale data
        const fresh = db.prepare("SELECT is_full FROM listings WHERE id = ?").get(listingId) as { is_full: number } | undefined;
        const currentMemberCount = (db
          .prepare("SELECT COUNT(*) as count FROM listing_members WHERE listing_id = ?")
          .get(listingId) as { count: number }).count;

        if (parsedNewSize < currentMemberCount) {
          return { error: `Cannot reduce group size below current member count (${currentMemberCount})` };
        }

        if (parsedNewSize === currentMemberCount && !fresh?.is_full) {
          // Group is now exactly full — mark it
          txUpdates.push("is_full = ?");
          txValues.push(1);
        } else if (parsedNewSize > currentMemberCount && fresh?.is_full) {
          // Group has room now — reopen it
          txUpdates.push("is_full = ?");
          txValues.push(0);
        }
      }

      txValues.push(listingId);
      db.prepare(`UPDATE listings SET ${txUpdates.join(", ")} WHERE id = ?`).run(...txValues);

      // When requires_approval is toggled off, auto-reject orphaned pending applications
      // so those users can join directly instead of being stuck in limbo
      if (togglingApprovalOff) {
        db.prepare(
          "UPDATE listing_applications SET status = 'rejected', decided_at = datetime('now') WHERE listing_id = ? AND status = 'pending'"
        ).run(listingId);
      }

      return null;
    });

    const txResult = updateTransaction();
    if (txResult?.error) {
      return NextResponse.json({ error: txResult.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const listing = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.author_id !== session.userId) {
    return NextResponse.json({ error: "Only the author can delete this listing" }, { status: 403 });
  }

  // Cannot delete if a platform link has been shared
  if (listing.telegram_link || listing.discord_link) {
    return NextResponse.json(
      { error: "Cannot delete a listing after the group chat link has been shared" },
      { status: 400 }
    );
  }

  try {
    // Get members to notify (excluding the author)
    const members = db
      .prepare("SELECT user_id FROM listing_members WHERE listing_id = ? AND user_id != ?")
      .all(listingId, session.userId) as { user_id: number }[];

    // Delete in a transaction (notifications sent after, so they aren't wiped)
    const deleteTransaction = db.transaction(() => {
      db.prepare("DELETE FROM pending_telegram_groups WHERE listing_id = ?").run(listingId);
      db.prepare("DELETE FROM listing_applications WHERE listing_id = ?").run(listingId);
      db.prepare("DELETE FROM listing_members WHERE listing_id = ?").run(listingId);
      db.prepare("DELETE FROM notifications WHERE listing_id = ?").run(listingId);
      db.prepare("DELETE FROM ratings WHERE listing_id = ?").run(listingId);
      db.prepare("DELETE FROM listings WHERE id = ?").run(listingId);
    });

    deleteTransaction();

    // Send deletion notifications after transaction (listing_id is NULL since listing is gone)
    for (const member of members) {
      try {
        createNotification(
          member.user_id,
          null,
          "listing_deleted",
          `The reading group for "${listing.book_title}" has been cancelled by the organizer.`
        );
      } catch {
        // Notification failure should not block response
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete listing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
