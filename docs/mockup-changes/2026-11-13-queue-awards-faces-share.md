# Awards: faces and a Share button per award

Status: IN MOCK APP — #842
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › awardRow, slideAwards, slideOffDay, SHEETS.shareFinish (kind: 'award'), ACT.shareAward
Route: /queue/sessions/<id>/results (Awards slide); /queue/s/<session> (Details › Awards)
Screen ID: Q-AWARDS-SLIDE, Q-OFF-DAY-SLIDE, Q-PUBLIC-RESULTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: award-card, share-dialog (award image)
Supersedes: none
Superseded by: none

## What changed
- Before: award cards showed only the label, the name and the reason; on the public page the name was always in full, even for a player the page masks elsewhere; awards could not be shared.
- After: each award card shows the winner's picture left of the text (60 px; MVP 68 px with an accent ring; Off Day 44 px). On the public page the name and picture follow the page's masking rule and the face opens the profile card for signed-in players. MVP and Most Improved each have a Share button opening the standard share dialog (“Share MVP” / “Share Most Improved”): images with the winner's picture and name, club, session title, the award big in the accent, its reason and the date; then OR and the Session link. Off Day stays private, no Share. On phones the Share button wraps under the text.
- Unchanged: award maths, Publish results choices.

## Why
- Owner artifact comment, November 13, 2026: “should have faces or avatars”; owner, same day: “each individual award should be shareable”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: MVP and Most Improved present or missing; masked winner (private or guest) on the public page; Off Day slide (operator only).
- Copy: “Share”, “Share MVP”, “Share Most Improved”, “Share AWARD: NAME”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: share-dialog, avatar, profile card.
- New: award image layout in the share card.

## Pass 2 (artifact comment, November 13, 2026: “please update the awards layout”)
- On the session page, Awards is now a page section instead of the embedded result slide (no club header or “powered by rotra” frame). Award cards sit side by side (one column under 560 px): the award as a pill on top (MVP filled in the accent with a trophy icon; Most Improved grey), a big face (MVP 96 px with an accent ring and glow, others 88 px), the name (20 px, masked by the page rule), the reason, and a full-width Share button at the bottom. A shared Off Day shows under an “Off Day” heading as small row cards (44 px face, name, reason, no Share). The footnote follows. The Queue Master's Awards slide is unchanged (face rows).

## Pass 3 (artifact comment, November 13, 2026: “this card can be shareable too”)
- The Awards section heading has a **Share awards** button (shown when there is at least one award) that shares the whole set as one image: the club logo and name, the session title and date, “Awards”, then one row per award (face, award label, name; MVP first, tinted and outlined in the accent), the ROTRA mark. Same share dialog (Story, Facebook post, Square; OR; Session link). Each award keeps its own Share.

## Pass 4 (artifact comment, November 13, 2026, on Off Day: “this card should be shareable and also individual cards”)
- When the club has shared Off Day on the session page, the Off Day heading has **Share Off Day** (one image listing every Off Day player: face, “Off Day”, name), and each Off Day card has a share icon button (accessible name “Share Off Day: NAME”) for that player's own image (“Off Day” big, the reason, the date). Off Day cards now use the same two-column grid as the award cards. Off Day remains private unless the club shares it in Publish results, and the Queue Master's Off Day slide is unchanged.

## Pass 5 (artifact comment, November 13, 2026: “should show standing and games won”)
- Award and Off Day cards on the session page show the player's standing in this session and games won: “#N of M · W won · L lost” under the name (accent numbers on MVP). The award share images carry the same: the single-award image adds a record line (“#N of M”, “W won”, “L lost”) under the award name; the Share awards / Share Off Day image adds “#N of M · W won” under each name. Players with no counted game show no line.

## Pass 6 (artifact comment, November 13, 2026, on the MVP card: “add fire pixel effect”)
- The MVP card has the animated pixel fire (the same accent-green fire as Latest stats and the podium's #1) burning behind the face, fading out before the card's top edge; the pill, name, standing and Share sit above it. Reduced motion shows a still frame. Other award cards have no fire.
