import db from "./db";

export function createNotification(
  userId: number,
  listingId: number,
  type: string,
  message: string
) {
  db.prepare(
    "INSERT INTO notifications (user_id, listing_id, type, message) VALUES (?, ?, ?, ?)"
  ).run(userId, listingId, type, message);
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

export function notifyGroupFull(listingId: number) {
  const listing = db
    .prepare("SELECT book_title FROM listings WHERE id = ?")
    .get(listingId) as { book_title: string } | undefined;
  const members = db
    .prepare("SELECT user_id FROM listing_members WHERE listing_id = ?")
    .all(listingId) as { user_id: number }[];

  if (listing) {
    for (const member of members) {
      createNotification(
        member.user_id,
        listingId,
        "group_full",
        `The reading group for "${listing.book_title}" is now full! The organizer will share a Telegram link soon.`
      );
    }
  }
}
