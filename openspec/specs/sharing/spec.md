# Sharing Specification

## Purpose

Documented shareable artifacts, formats, privacy, and link expiry.

## Status

**Documented product rules** from `docs/business_logic/client_app/13_sharing.md`. Current `queue-session` join SHARE QR is mock-only. Do not invent extra share destinations.

## Actors

Players, match participants, session participants, club members, Club Owners, Que Masters.

## Requirements

### Requirement: Shareable items
The product SHALL support sharing:
- Player profile — anyone — public URL + OG card
- Match result — any match participant — image card + URL
- Session leaderboard live — any session participant — live URL
- Session leaderboard snapshot — any session participant — image + URL
- Club leaderboard — any club member — live URL
- Club invite — Club Owner when enabled — link + QR
- Session join — Que Master — link + QR

#### Scenario: Match participant shares result
- GIVEN a player who played the match
- WHEN they share the result
- THEN an image card and URL are produced

### Requirement: Formats
Shareable items SHALL produce a stable URL, an auto-generated PNG image card (server-side, branded, with QR), and Open Graph tags for rich previews. Share UI SHALL offer copy link, share image to the OS share sheet, download image, and full-screen QR.

#### Scenario: OG preview
- GIVEN a public profile URL
- WHEN it is pasted into a messenger that reads OG tags
- THEN a preview card is available

### Requirement: Privacy and expiry
Player profile and match result URLs SHALL be public without login and SHALL never expire. Live session leaderboard SHALL become a read-only snapshot when the session closes. Club leaderboard SHALL stay live and never expire. Club invite SHALL be active only while enabled and SHALL expire on disable/rotate. Session join SHALL be active only while the session is open/active and SHALL expire when the session closes or is full.

#### Scenario: Join link after close
- GIVEN a session is closed
- WHEN someone opens the session join link
- THEN the link is no longer an active registration grant

## Source

- `docs/business_logic/client_app/13_sharing.md`
