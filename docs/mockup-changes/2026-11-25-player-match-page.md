# A public match page for every game, opened from any game court and from Share game

Status: IN MOCK APP — PR #1103
Date: 2026-11-25
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Match page (new); game court on Recent games, Games page, session matches dialog; Share game dialog
Route: /player/matches/m1-2 (real app: /matches/[matchId])
Screen ID: P-MATCH-PAGE
Artifact: none
Components: game-row (game court), share sheet, page head / back button, profile card (reused)
Supersedes: none
Superseded by: 2026-11-26-player-match-court-vs-card.md (the Before this game card only)

## What changed
- **New page `/matches/<matchId>`**, public (signed out too), one per match. Top to bottom:
  - Page head: back button (to the page the court was tapped on, labelled with it: the player's name,
    **Games**, **Sessions**, **Leaderboard**; **Leaderboard** when opened from a link), heading **Game**.
  - The game court, the same as the game row (format pill, score box, **Won** / **Lost** read from the left
    side, winning side lit, games badge on every face). A signed-in player who played sees their side on
    the left as **You**; everyone else sees Team A (the first team) on the left with first names. The court
    does not link to itself. The share icon shows only on the signed-in player's own game.
  - **Skill-group rings** on each face (new on this court only), see Like for like.
  - Under the court, muted: “SESSION TITLE · Tue, Nov 24 · Club name”; the title opens the public session
    page (the prototype's existing **Session page** toast), plain text once the page is gone.
  - Card **Before this game**: one block per player, left side then right side in court order. Block head:
    picture + first name (**You** for the viewer), opening the profile card, and “N earlier games” /
    “1 earlier game” / “No earlier games”. Under it, that player's earlier games of the session in play
    order, as game courts drawn from that player's side (them on the left, result and score turned round
    when they were on the other team). These courts have no rings and open their own match page.
  - Not found: heading **Game not found** and the notice “No game has the ID `<id>`. Check the link and try
    again.”
- **Court tap everywhere.** Before: only faces and the share icon were tappable. After: the court box
  (score box and format pill included) opens that game's match page on Recent games, the Games page, the
  session matches dialog (Recent sessions and the Sessions page) and the match page's own **Before this
  game** courts. Faces and the share icon keep their own actions. Built as a full-size button under the
  faces (`.gm-open`), so it is a real keyboard stop.
- **Share game.** Before: the **Link** field and its copy icon held the profile link. After: the game's
  match page, `<origin>/player/matches/<matchId>` (real app `https://<player host>/matches/<matchId>`).
  The copy-failed toast reads “Couldn't copy. The game link is …”. Other share kinds keep their links.
- **Match ids in the fixtures.** Every game now carries `mid = "<sessionId>-<n>"` (n = its place in the
  session), for example `m1-2`, `b5-s0-2`. Limitation: the prototype generates each player's history as
  its own fixture, so a real match does not appear in every participant's history with one id; the id is
  deterministic per session fixture and the page reconstructs the match from the history it came from.
  “Before this game” for a partner or opponent can therefore only show the earlier games that history's
  player also played. In the real app the id is the Queue match id shared by every participant.
- **Privacy on the page.** Names (labels, accessible names, the guest card name) are masked for the viewer
  as on profiles: visitors see Private players and guests masked, Always private is masked for everyone
  else; pictures stay visible. A player hidden from the viewer gets the **none** ring (no level shown).
  Game rows elsewhere are unchanged.
- **Tokens.** The Player prototype gains `--lv-beg`, `--lv-int`, `--lv-adv`, `--lv-none` (already in the
  Queue prototype and `packages/config/theme.css`).

## Why
- Owner decisions, November 25, 2026 (final): a shareable match page, one per match, the same for every
  player; anyone can open it; the court as on the game row with skill-group rings; “Before this match” per
  player; clicking a game court anywhere opens it; Share game links to it.
- Copy uses **game** for visible headings (“Game”, “Before this game”, “Game not found”), as the rest of
  ROTRA Player does (“Recent games”, “Share game”); the route stays `/matches`.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: signed out (Team A left, masked private players and guests), signed in and played (own side left,
  **You**, share icon), signed in and didn't play, partial game (Not counted chip, note), fun game (“Fun
  game · not counted”), not ranked game (its note), first game of the session (every block “No earlier
  games”), expired session page (plain title), not found; court hover (light inner outline) and keyboard
  focus (accent outline); face hover.
- Ring design: the picture's border is the skill group, 3 px `--ring`; the winning side adds a 2 px dark
  gap (`rgba(0, 0, 0, .72)`) and a 3 px `--accent` outer ring (`box-shadow: 0 0 0 3px ring, 0 0 0 5px gap,
  0 0 0 8px accent`); hover/focus swaps the accent for a light ring. The badge and name pill stay lit on
  the winning side as on every game row. Sides get 16 px / 6 px padding on this court for the wider rings.
- Copy: “Game”, “Before this game”, “N earlier games”, “1 earlier game”, “No earlier games”, “Game not
  found”, “No game has the ID … Check the link and try again.”, “Open the match page: …” (accessible name),
  “Couldn't copy. The game link is …”, back labels as above.
- Tokens: `--lv-beg` #3d9bff dark / #1d6fd1 light; `--lv-int` #ffd23f / #d19a00; `--lv-adv` #ff5a5f /
  #d6293a; `--lv-none` `var(--border-strong)` in both (all as in `packages/config/theme.css`).
- Known differences: none.

## Reuse plan
- Reuses as is: game row court (Before this game), profile card sheet, page head / back button, notice,
  share sheet.
- Extends: game row — `href`/tap target for the court (match page link), a `skillRings` option, a
  `maskNames` option, and drawing from another player's side; share sheet — the game link.
- New: the match page route in apps/player (`/matches/[matchId]`), wiring only.
- Shares work with: none.

## Docs updated
- Business logic: docs/business_logic/product/player-information/README.md — new **Public match page**
  section; modules/ranking/README.md — Share game links to the match page.
- Database design: docs/database_design/product/player-information/modules/ranking.md — the match page is
  keyed by the shared `match_id` of `player_match_facts`; history rows must carry it. No new table.
- Screen docs: new modules/player-information/match-page.md (P-MATCH-PAGE), linked from its README;
  ranking-history.md — court tap and the Share game link; navigation.md — the `/matches/[matchId]` route
  and the surface table.

## Real app work
- Player: a public `/matches/[matchId]` route and match-page read (mock data and real mode), the game row
  court as a link with skill rings and masking options, game rows carrying the shared match id, Share game
  link.
