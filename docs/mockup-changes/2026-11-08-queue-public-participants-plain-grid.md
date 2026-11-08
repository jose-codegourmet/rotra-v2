# Public page participants become a plain grid, not cards

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Participants (also its operator preview)
Screen ID: public session page

## What changed
- Before: each participant sat in a bordered card with the picture on the left and the name beside it.
- After: a plain grid of centered tiles with no border or fill: picture on top, masked name under it, and
  nothing else. Four tiles per row at every width with wider gaps (owner comment: it looked congested), and the picture at 80% of its tile (up to 77 px). Follow-up comment, same day: the ring is thicker (5 px) with a 4 px gap between ring and picture, and names are 130% bigger (17 px). “Shrink the avatar to 8%” was read as 80%, since 8% would hide it.
- Later comment, same day: empty slots show as placeholder tiles (dashed grey ring, muted “Open”) after the
  participants, until the session is finished.
- Later comment, same day: three tiles per row on a phone (four on wider screens), and the list is capped at
  three rows (9 on a phone, 12 wider). Past the cap the last row fades into the page background and a
  “Join to see the full roster” button (opens Request to join; plain text when requests are off) sits on
  the fade.
- Later comment, same day (“make this into a nice CTA”, read as that button): a muted “N players are in” line
  above it and a larger pill button with a lock icon and an accent glow.
- Owner decision, later the same day: the “Has a ROTRA profile” label is removed and the
  level shows as a ring around the picture instead of text (owner: “borders to their avatar, color by
  skill level”): blue Beginner, yellow Intermediate, red Advanced, grey for no level; hover shows “Beginner Mid”. This reverses the earlier business rule that the public page
  never ties a participant to a level, so the business doc changed too.
- The operator's own post-session roster list (with level and paid) is unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: this does not need cards; a grid of users with picture,
  name and level.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — masked-names rule and Public skill mix now allow a per-person level
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/public-session.md — participants grid description
