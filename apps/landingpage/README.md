# ROTRA landing page (rotra.club)

Static marketing site for rotra.club: a scroll story for players plus a separate landing for club owners and
Queue Masters. One self-contained `index.html`; open it through any static server
(`python3 -m http.server --directory apps/landingpage`). No build step, no package, no dependencies in the
workspace; Lenis (smooth scroll) loads from jsDelivr.

**Status: wireframe.** It was designed as a claude.ai artifact on November 17, 2026 and copied here as is. It is
not wired to the apps or to real data.

## Pages (hash routes)

| Route | What it is |
|---|---|
| `#home` | Player landing: hero (“Do you play, or run the game?”, Tara drops through the hole), 01 the real Tara, 02 how a rank moves, 03 the leaderboards, 04 one record |
| `#clubs` | Club owners and Queue Masters: hero, 01 the assessors (Roster and levels), 02 run the night, 03 pricing, 04 partner request |
| `#ranking`, `#pricing`, `#request` | Detail pages |
| `#assets` | List of every art asset on the site |

## Art

Generated with Higgsfield in the chosen “Samurai Jack” flat-vector direction (no outlines, near-black, dark
greens, one mint `#00FF88`).

- `hero-a/`: hero layers (far, mid, near).
- `art/<section>-{far,mid,near}.jpg`: three parallax layers per section; mid and near sit on black and are
  composited with `mix-blend-mode: lighten`.
- `art/sprites/*.png`: character animation strips, 40 frames of 240×358 side by side, played at 8 fps
  (Kling/Seedance image-to-video, background keyed out).
- `art/*-cut.png`: transparent character cut-outs.
- `art/shots/`: screenshots of the Queue prototype (`apps/mockup/queue-app`), demo data.

## Open product questions shown on the page

- Weekly, monthly and annual leaderboards are not in the docs yet (today: one overall board, 90 days).
- Public partner pricing: each club has its own price in Admin today.
- Where partner requests land.
- “ROTRA Partner” is not in `docs/product-terms.md` yet.
