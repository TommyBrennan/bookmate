import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { notifyApplicationDecision, notifyGroupFull } from "@/lib/notifications";

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
    return NextResponse.json({ error: "Only the organizer can manage applications" }, { status: 403 });
  }

  const body = await req.json();
  const { applicationId, action } = body;

  if (!applicationId || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid request. Provide applicationId and action (approve/reject)." },
      { status: 400 }
    );
  }

  // Verify application belongs to this listing and is pending
  const application = db
    .prepare(
      "SELECT * FROM listing_applications WHERE id = ? AND listing_id = ? AND status = 'pending'"
    )
    .get(applicationId, listingId) as Record<string, unknown> | undefined;

  if (!application) {
    return NextResponse.json(
      { error: "Application not found or already decided" },
      { status: 404 }
    );
  }

  const applicantUserId = application.user_id as number;

  if (action === "approve") {
    // Use transaction to ensure atomicity
    const approveTransaction = db.transaction(() => {
      // Check if group is already full
      const { count } = db
        .prepare("SELECT COUNT(*) as count FROM listing_members WHERE listing_id = ?")
        .get(listingId) as { count: number };

      if (count >= (listing.max_group_size as number)) {
        throw new Error("Group is already full");
      }

      // Update application status
      db.prepare(
        "UPDATE listing_applications SET status = 'approved', decided_at = datetime('now') WHERE id = ?"
      ).run(applicationId);

      // Add to members
      db.prepare(
        "INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)"
      ).run(listingId, applicantUserId);

      // Check if group is now full
      const newCount = count + 1;
      let rejectedApps: { id: number; user_id: number }[] = [];
      if (newCount >= (listing.max_group_size as number)) {
        db.prepare("UPDATE listings SET is_full = 1 WHERE id = ?").run(listingId);

        // Reject remaining pending applications inside the transaction
        rejectedApps = db
          .prepare(
            "SELECT id, user_id FROM listing_applications WHERE listing_id = ? AND status = 'pending'"
          )
          .all(listingId) as { id: number; user_id: number }[];

        for (const app of rejectedApps) {
          db.prepare(
            "UPDATE listing_applications SET status = 'rejected', decided_at = datetime('now') WHERE id = ?"
          ).run(app.id);
        }

        return { isFull: true, rejectedApps };
      }
      return { isFull: false, rejectedApps };
    });

    try {
      const result = approveTransaction();

      // Send notifications outside the transaction (non-critical)
      try {
        notifyApplicationDecision(applicantUserId, listingId, "approved");

        if (result.isFull) {
          notifyGroupFull(listingId);
          for (const app of result.rejectedApps) {
            notifyApplicationDecision(app.user_id, listingId, "rejected");
          }
        }
      } catch (notifErr) {
        console.error("Notification error (approval succeeded):", notifErr);
      }

      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    // Reject
    db.prepare(
      "UPDATE listing_applications SET status = 'rejected', decided_at = datetime('now') WHERE id = ?"
    ).run(applicationId);

    notifyApplicationDecision(applicantUserId, listingId, "rejected");

    return NextResponse.json({ ok: true });
  }
}
