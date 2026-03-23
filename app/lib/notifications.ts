import db from "./db";
import { sendEmail } from "./email";

function getUserEmail(userId: number): string | null {
  const user = db
    .prepare("SELECT email FROM users WHERE id = ?")
    .get(userId) as { email: string } | undefined;
  return user?.email || null;
}

export function createNotification(
  userId: number,
  listingId: number | null,
  type: string,
  message: string
) {
  db.prepare(
    "INSERT INTO notifications (user_id, listing_id, type, message) VALUES (?, ?, ?, ?)"
  ).run(userId, listingId, type, message);

  // Also send email notification (fire-and-forget)
  const email = getUserEmail(userId);
  if (email) {
    const subject = getEmailSubject(type);
    sendEmail(email, subject, message).catch(() => {
      // Email sending is best-effort — don't block on failure
    });
  }
}

function getEmailSubject(type: string): string {
  switch (type) {
    case "new_member":
      return "Bookmate: Someone joined your reading group!";
    case "group_full":
      return "Bookmate: Your reading group is full!";
    case "application_received":
      return "Bookmate: New application for your reading group";
    case "application_approved":
      return "Bookmate: Your application was approved!";
    case "application_rejected":
      return "Bookmate: Application update";
    case "rating_received":
      return "Bookmate: You received a new rating";
    case "listing_deleted":
      return "Bookmate: A reading group has been cancelled";
    case "listing_updated":
      return "Bookmate: A reading group has been updated";
    default:
      return "Bookmate: Notification";
  }
}

export function notifyListingAuthor(
  listingId: number,
  joinerName: string
) {
  const listing = db
    .prepare(
      "SELECT l.author_id, l.book_title FROM listings l WHERE l.id = ?"
    )
    .get(listingId) as { author_id: number; book_title: string } | undefined;

  if (listing) {
    createNotification(
      listing.author_id,
      listingId,
      "new_member",
      `${joinerName} joined your reading group for "${listing.book_title}"`
    );
  }
}

export function notifyApplicationReceived(
  listingId: number,
  applicantName: string
) {
  const listing = db
    .prepare(
      "SELECT l.author_id, l.book_title FROM listings l WHERE l.id = ?"
    )
    .get(listingId) as { author_id: number; book_title: string } | undefined;

  if (listing) {
    createNotification(
      listing.author_id,
      listingId,
      "application_received",
      `${applicantName} applied to join your reading group for "${listing.book_title}"`
    );
  }
}

export function notifyApplicationDecision(
  userId: number,
  listingId: number,
  decision: "approved" | "rejected"
) {
  const listing = db
    .prepare("SELECT book_title FROM listings WHERE id = ?")
    .get(listingId) as { book_title: string } | undefined;

  if (listing) {
    const type = decision === "approved" ? "application_approved" : "application_rejected";
    const message =
      decision === "approved"
        ? `Your application to join "${listing.book_title}" was approved!`
        : `Your application to join "${listing.book_title}" was not accepted.`;
    createNotification(userId, listingId, type, message);
  }
}

export function notifyGroupFull(listingId: number) {
  const listing = db
    .prepare("SELECT book_title, platform_preference FROM listings WHERE id = ?")
    .get(listingId) as { book_title: string; platform_preference: string } | undefined;
  const members = db
    .prepare("SELECT user_id FROM listing_members WHERE listing_id = ?")
    .all(listingId) as { user_id: number }[];

  if (listing) {
    const platform = listing.platform_preference === "discord" ? "Discord" : "Telegram";
    const botConfigured = listing.platform_preference === "discord"
      ? !!process.env.DISCORD_BOT_TOKEN
      : !!process.env.TELEGRAM_BOT_TOKEN;
    const message = botConfigured
      ? `The reading group for "${listing.book_title}" is now full! The ${platform} group will be set up automatically.`
      : `The reading group for "${listing.book_title}" is now full! The organizer will share a ${platform} link soon.`;

    for (const member of members) {
      createNotification(
        member.user_id,
        listingId,
        "group_full",
        message
      );
    }
  }
}
