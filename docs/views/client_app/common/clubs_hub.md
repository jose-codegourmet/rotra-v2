# View: Clubs Hub

## Purpose

Landing surface for the **Clubs** area (`/clubs`): navigation to discover, owned clubs, settings, and a **persistent CTA** to start a new club via the application flow.

## Route

`/clubs` — authenticated users (Player, Que Master, Club Owner).

---

## Layout

- Standard authenticated shell (header + bottom nav or sidebar on desktop).
- Primary content: list or cards for **My clubs**, link to **Discover** (`/clubs/explore` or existing discover route), entry to club settings where applicable.
- **CTA card** (always visible):
  - Short title + one-line value prop (“Run your own sessions and grow a community”).
  - Primary button: **Apply to start a club** → navigates to [`/clubs/apply`](../player/club_application.md).
- The CTA does **not** hide when the user already owns clubs or has a pending application (per product spec); optional **secondary banner** when a pending application exists: “You have an application under review” with link to [`/profile/applications`](../player/profile_applications.md).

---

## Cross-links

- Application form: [`../player/club_application.md`](../player/club_application.md)
- Discovery: [`club_discovery.md`](./club_discovery.md)
