# Queue app: Mode and Scoring cards get illustrations; Scoring picks the points first, then Deuce

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `viewSetup()` step 2, `artCard()`, `CARD_ART`, `SCORING_POINTS`, `pointsOf()`
Route: /queue/sessions/new, /queue/sessions/x-next-full/edit (step 2 · Formats, mode and minimum)
Screen ID: Q-SETUP
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: illustrated choice card (art on top, title, text, check badge), Deuce switch row, scoring summary line
Supersedes: the five-card Scoring picker in 2026-11-18-queue-scoring-modes.md (the five modes themselves stay)
Superseded by: none

## What changed
- **Mode:** Chill, Fair and Hard keep their text. Each card now has a 16:9 illustration across the top. The picked
  card gets an accent border, a soft glow and a check badge. Unpicked art is slightly dimmed and brightens on hover.
  Cards lift 2 px on hover.
- **Scoring:** before, five text cards. After:
  1. Three illustrated points cards: **31 points** (“One game · change sides at 16”), **21 points** (“One game · change
     sides at 11”), **21 × 3** (“Best of 3 games to 21”).
  2. A **Deuce** switch: “Deuce at 30–30.” (or 20–20) when on, “No deuce: the first to 31 wins.” (or 21) when off.
     **21 points** has no no-deuce mode, so the switch is on and disabled: “One game to 21 always plays deuce at 20–20.”
  3. A summary line with a check: “16/31 · One game to 31. Change sides at 16. Deuce at 30–30.”
  - The picks map to the existing five modes: 31 + deuce = 16/31, 31 without = 16/31 no deuce, 21 = 11/21,
    21 × 3 + deuce = 11/21 × 3, 21 × 3 without = 21 × 3. Nothing new is stored. Changing the points card keeps the
    Deuce setting when the new card has both.
- After Start, Scoring stays read-only as before.
- **Art:** six images from Higgsfield (gpt_image_2_6, 3:2, ROTRA flat-vector style: near-black, dark greens, grey,
  neon mint), shrunk to 560 px WebP (about 53 KB in all) and embedded in the mockup. Higgsfield job IDs: Chill
  ce2ac443-b498-4ed0-9709-5cc07f9cfbbf, Fair 9be46558-1109-4b20-9c55-39f223262866, Hard
  92d239a9-9afd-40ad-a638-3f0bb8a2363e, 31 points a2e2e535-4761-4502-ad56-7e8fb52e9a36, 21 points
  327cfa16-e7cc-4c07-aa07-3e140f025d29, 21 × 3 f60449a8-ff7f-41fd-b9a2-a8f176db5b80. The real app serves them as static
  files.

## Why
- Owner, November 19, 2026, in chat: “refine this by picking the game points first and then a switch to include Deuce or
  not and please put the cards some life · feel free to add graphics via higgsfield”, then on the Mode cards: “give
  this cards some life · add designs · use higgsfield to generate graphics”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light (the art is dark in both themes).
- States: each Mode; each points card with Deuce on and off; 21 points (switch disabled); after Start (read-only).

## Copy
- Cards: “31 points”, “21 points”, “21 × 3” and their lines above. Switch row: “Deuce” plus the lines above.

## Open
- Should **21 points** also offer no deuce? That would add a sixth scoring mode, so it needs a decision
  (D-2026-11-18-04 lists five).
- Light theme: the art keeps its dark background. Keep it, or generate light versions?

## Docs updated
- docs/screens/product/modules/queue/session-setup.md (step 2: Mode cards, Scoring picker)
