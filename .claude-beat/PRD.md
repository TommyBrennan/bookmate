# Product Requirements Document

## Project Name

Bookmate

## Overview

Bookmate is a web service that helps fiction readers find companions for reading and discussing books together. Users post listings for books they want to read, others join, and once a group forms, they connect via Telegram to coordinate their reading sessions. Think of it as matchmaking for book clubs.

**Target audience:** English-speaking fiction readers who want structured reading companionship but struggle to find like-minded partners.

## Goals

- Make it effortless to find people who want to read the same book at the same pace
- Remove the friction of organizing a reading group — from discovery to first meeting
- Keep the platform lightweight: match readers, hand off to Telegram for discussion

## P0 — Must Have (Core, launch blocker)

### User Authentication

Email + password registration and login. Required to post or join any listing.

### Create a Reading Listing

A user creates a listing with:
- **Book** — selected via Open Library API (title, author, cover art auto-populated)
- **Preferred language** — language for discussion
- **Reading pace** — e.g., "1 chapter per week", "50 pages per day"
- **Start date** — when the group begins reading
- **Meeting format** — voice calls, text chat, or mixed
- **Max group size** — author sets the cap (e.g., 3–6 people)

### Browse Listings

Simple chronological list of open listings. No search or filters at this stage — just a scrollable feed of available reading groups to join.

### Join a Listing

Any authenticated user can join an open listing. First-come-first-served, no approval step. A user can be part of multiple reading groups simultaneously.

### Group Formation

When a listing reaches its max group size:
- The listing becomes invisible to non-participants (effectively closed)
- The author is prompted to share a Telegram group link with participants
- The author manually creates the Telegram group and pastes the invite link

### Notifications

Email + in-app notifications for:
- **Each new sign-up** — listing author is notified when someone joins
- **Group full** — all participants are notified when the group reaches its cap

### User Profile (Basic)

- Display name
- Short bio

## P1 — Should Have (Important, not launch blocker)

### Search and Filters

- Search listings by book title or author
- Filter by reading pace, start date, meeting format
- Browsable feed with sorting options

### Telegram Group Creation Assistance

Provide guidance or tooling to help the listing author create and share the Telegram group link more easily (e.g., step-by-step instructions, link validation).

### Extended User Profile

- Reading history (past groups participated in)
- "Currently reading" list
- Favorite genres

## P2 — Nice to Have (Bonus, if time permits)

### Automatic Telegram Group Creation

System auto-creates a Telegram group via API and shares the invite link with all participants — no manual step needed.

### Applicant Approval System

Listing author can review and approve/reject users who want to join, instead of first-come-first-served.

### Rating and Reputation System

Users can rate their reading group experience. Build a reputation score based on participation history and peer ratings.

### Discord Support

Allow group creation via Discord as an alternative to Telegram.

## Non-Goals

- No payment or monetization features
- No mobile app (web only)
- No real-time chat within the platform (groups communicate via Telegram)
- No complex third-party integrations beyond Open Library API
- No AI-powered recommendations or matching (AI is allowed where it genuinely improves UX)
- No content hosting (e-books, PDFs, etc.)

## Tech Stack

- **Frontend + Backend:** Next.js (full-stack)
- **Database:** SQLite (local, persistent across container restarts)
- **Analytics:** SQLite-based (no third-party analytics)
- **Deployment:** Docker container with mounted volume for SQLite persistence
- **Book data:** Open Library API (free, no API key required)
