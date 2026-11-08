# Profile picture drafts, framing and save on Done

Status: IN MOCK APP — #567
Date: 2026-11-08
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Profile picture
Route: /player/players/u1
Screen ID: P-OWN-PROFILE, P-EDIT-PROFILE
Artifact: none
Components: profile-picture-sheet, avatar
Supersedes: 2026-11-08-player-change-avatar.md
Superseded by: none

## What changed

Photo, character and initials selection now creates a local draft. Done saves it; X, Escape and the
scrim discard it. New photo drafts show a draggable square preview and one Zoom slider. GIF previews remain animated. The prototype stores a local
SVG representation on Done, never a Storage object.

## Why

Owner follow-up in #567: “selecting a photo must not attach or upload it immediately”; “Done is the commit action”.
The owner approved pinned libheif-js for HEIC decoding and existing Sharp for GIF processing.
Latest owner follow-up: “make it a simple scale and crop (draggable)”; position sliders and the rotation
control were removed. Source orientation is still honored.

## Like for like

- Compare at: 375 px and 1280 px, dark and light.
- States: saved initials/character/photo, local photo draft, framing, discarded draft; real sheet also has preparing, pending and actionable error states.
- Copy: “Changes are saved only when you click Done. WebP, GIF, PNG, HEIC/HEIF and JPEG. Keep it to a clear picture of you; the club's Queue Master can ask you to change it.”
- Tokens: none.
- Known differences: static prototype uses native browser image decoding; actual Player/Storybook decodes HEIC via the approved worker. Both use the same framing and draft interactions.

## Reuse plan

Extend ProfilePictureSheet and Avatar; reuse Sheet and Button. Existing account hook persists on Done.

## Docs updated

Identity business rules, profile screen, picture storage, architecture, coding conventions and MVP decisions.

## Tickets

- #567; replaces immediate selection from #522/#542.

## Verification notes

- Local Player browser: HEIC worker decoding, GIF framing, explicit pending Done, character dismissal
  and retry behavior; dark/light layouts at 375 and 1280 CSS pixels.
- Server processing fixtures: PNG/JPEG/GIF/WebP/HEIC, original GIF/WebP timing/loop and frame colors,
  MIME mismatch, malformed bytes, excessive input bytes, invalid crop and 121-frame rejection.
- Live bucket: public, requested six MIME types, 2,097,152-byte stored-object limit confirmed by Storage API.
- Authenticated real profile save/reload and reduced-motion OS/browser emulation were not exercised;
  reduced-motion canvas rendering is implemented and covered by the story/manual instructions.
