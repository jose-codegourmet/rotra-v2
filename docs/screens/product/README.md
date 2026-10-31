# ROTRA v1 screen specification

**Status:** Proposed screen composition implementing agreed business rules. Screen identifiers are documentation IDs, not URLs or existing component names.

## Read in this order

1. [Experience contract](experience-contract.md): rules shared by every screen.
2. [Navigation and surface inventory](navigation.md): complete screen/sheet/dialog map.
3. [Product modules](modules/README.md): detailed behavior per product.
4. [State and permission matrix](state-matrix.md): connectivity, entitlement, identity, and result gates.
5. [Confirmation dialogs](dialogs.md): irreversible actions and recovery decisions.
6. [Coverage](coverage.md): mapping from requirements to screen specifications.
7. [Open decisions](open-decisions.md): exact behavior still needing a focused decision before implementation.

## Product boundaries

| Product | Primary user | Screen purpose |
|---|---|---|
| Queue | Dedicated licensed club account, operated by the Queue Master | Prepare rosters and cost estimates, run courts and one shared queue, recover offline work, finalize/share results |
| Player Information | Public visitors and registered players | Public identity, rank/history, global leaderboard, profile claiming/editing, contact requests |
| Admin | Platform owner | Manage clubs, manually activate licenses, approve contact changes, manage agreed configuration and flags |
| World | Deferred | No v1 navigation, screens, or discovery flow specified |

Use **Queue**, **Queue Master**, and **ROTRA**. The result-export footer is the explicitly requested lowercase **“powered by rotra”**.

## Confirmed rules versus composition proposals

The business documents determine behavior. Labels, screen groupings, card/sheet layouts, proposed navigation, and help copy in this tree are experience proposals to make that behavior reviewable. They do not silently authorize new business features, routes, or APIs.

One module can render as a page on desktop and a sheet on mobile. A documentation surface is not necessarily a separate route. Keep implementation details such as operation hashes, database IDs, and stream sequences out of normal player/operator copy.

## Design references

**ROTRA Queue prototype** — [`app/mocksups-app/queue-app/rotra-queue.html`](../../../app/mocksups-app/queue-app/rotra-queue.html), also published as the ROTRA Queue artifact. A clickable single-file prototype of the whole Queue app (login through results and the public page) with fictional data. As of October 26, 2026 it is the agreed design reference for Queue screens: the Queue module specs follow its layout, copy, and behavior. Its demo controls are not product features; see [Queue modules](modules/queue/README.md#prototype-only-behavior). It uses the client app's dark/light color tokens.

**ROTRA Players prototype** — [`app/mocksups-app/player-app/rotra-player.html`](../../../app/mocksups-app/player-app/rotra-player.html), also published as the ROTRA Players artifact. A clickable single-file prototype of the Player Information app (leaderboard, public and own profiles, rank explanation, games, player ID/QR, privacy and contact, sign-in, password reset, profile claim) with fictional data. It shares the Queue prototype's tokens and patterns. It is a design reference for review; where it settles a layout or copy choice the module specs record it as a proposal (see [Player Information modules](modules/player-information/README.md#reference-prototype)). Its demo controls are not product features.

**ROTRA Admin prototype** — [`app/mocksups-app/admin-app/rotra-admin.html`](../../../app/mocksups-app/admin-app/rotra-admin.html), also published as the ROTRA Admin artifact. A clickable single-file prototype of the Admin app for the platform owner (mock sign-in, clubs with tabbed detail, adding a club, per-club or free pricing, license activation and renewal, public-page retention, club name changes, players, contact-change review, ranking settings, feature flags) with fictional data. It shares the Queue prototype's tokens and patterns. As of October 27, 2026 the platform owner settled club provisioning, per-club prices and flag creation with it (see [Admin modules](modules/admin/README.md#reference-prototype)). Its Prototype menu is not a product feature.

The user supplied Reclub images `IMG_6434.PNG` and `IMG_6435.PNG`: date/title header, club identity, Details/Participants tabs, venue/time details, and participant avatars. Use that information hierarchy as inspiration, not a requirement to copy ads, multiple organizers, Request to join, Can't go, Matches, or Chat.

The public page and the private operator console serve different purposes. Removing the public Matches tab does **not** remove the operator's match queue/court controls or the Player Information match-history view.

## Sources and dependencies

- [Business scope](../../business_logic/product/README.md)
- [Business open decisions](../../business_logic/product/open-decisions.md)
- [Proposed database design](../../database_design/product/README.md)
- [Database design limits](../../database_design/product/open-decisions.md)

Old combined Client/Umpire/EXP/MMR/payment screens are not included just because old code or docs once mentioned them.
