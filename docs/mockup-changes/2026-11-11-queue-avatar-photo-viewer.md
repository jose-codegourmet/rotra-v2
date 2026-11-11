# Avatar photo viewer: tap a picture to see the full photo (#716, proposed; Queue part)

Status: IN MOCK APP — #758
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Every avatar that shows a picture; Full-photo viewer; Profile sheet big photo
Route: any Queue screen with avatars, e.g. /queue/sessions/s-tonight/preparation?tab=roster and the session page
Screen ID: none found (shared Avatar behaviour, new viewer dialog)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: avatar, photo-viewer (new)
Supersedes: none
Superseded by: none

## What changed
- Before: avatars were pictures only; a tap did nothing (or opened a profile where it was already a profile button).
- After: every avatar that shows a real picture (an uploaded photo or a chosen character, not initials) that is not already a profile button opens the **photo viewer**: a black overlay (new token `--photo-scrim`) with the photo centred, an × top right, closing on a tap anywhere on the overlay, the × or Esc, and returning to whatever dialog was open under it. Where tapping an avatar already opens a profile (roster faces, match tiles, participant tiles), that stays; the viewer opens from the big photo inside the profile sheet. Initials do nothing. Whoever can already see the picture can enlarge it; a picture masked for the viewer (#715, always private) shows initials, so there is nothing to enlarge. Queue only in this log; Player, Admin and the public session page follow in their own logs.

## Why
- Owner decision pack, ticket #716 (recommended options): everywhere an avatar shows a picture, one behaviour in the shared Avatar; only real pictures; keep the profile as the tap target with the photo opening from inside the profile; whoever can see the picture can enlarge it; close by tapping the overlay, × or Esc.
- Owner's words: “all avatars has the option to click the avatar to view the full photo ( open a dialog with black overlay )”.
- Proposed, built to the recommended option of the owner decision pack. The owner has not approved it yet.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: viewer with an uploaded photo, with a character image, opened from a standalone avatar, opened from the big photo in the profile sheet (closing returns to the profile), closing by overlay, × and Esc, initials avatar (no action), avatar inside a button (no viewer), small and large screens (photo stays inside the screen, at most 560 px).
- Copy: Dialog name “Photo of NAME”; × button “Close”; the big photo in the participant profile “View full photo of NAME”. No visible text.
- Tokens: new: --photo-scrim rgba(0, 0, 0, 0.94), the same in dark and light (the overlay is black by request)
- Known differences: none

## Reuse plan
- Reuses as is: avatar picture rendering, sheet open/close and Esc handling.
- Extends: avatar (data attribute and zoom cursor for picture avatars; real app: a button with the accessible name “View full photo of NAME” when it is not inside another control).
- New: photo-viewer dialog, no existing component shows a photo at full size.
- Shares work with: 2026-11-11-queue-participant-profile-tap.md

## Docs updated
- Business logic: `docs/business_logic/product/queue/modules/players/README.md` › Identity states (the **Full photo** rule, #716; D-2026-11-11-11).
- Database design: none needed (UI only; `docs/database_design/product/queue/modules/results-publication.md` notes the viewer stores nothing).
- Screen docs: `docs/screens/product/dialogs.md` › D-PHOTO-VIEWER (new); `docs/screens/product/modules/queue/players-roster.md` › Full profile dialog (photo opens from inside the profile); `docs/screens/product/modules/queue/public-session.md` and D-PARTICIPANT-PROFILE (photo opens from the big picture in the card).
- Known gap: the new token `--photo-scrim` and Player, Admin and public-page avatars belong to other logs and docs.

## Real app work
- Shared Avatar behaviour in packages/ui (opens the viewer when a picture exists and the avatar is not inside a profile button), the photo-viewer dialog, `--photo-scrim` token, big photo button in profile sheets. Player and Admin parts are separate logs.
