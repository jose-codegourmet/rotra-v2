# Queue: No show (cancelled) on the live Players view

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › poolPane card actions, noShowPanel, SHEETS.noShow, ACT.openNoShow / confirmNoShow / undoNoShow
Source: artifact comment on the live Players cards: “you should have the option put them in No Show (cancelled)”

## What changed
- A live Players card for a player who is away, has played no games and is in no match gets **No show (cancelled)** next to Move to waitlist.
- It opens “Mark NAME as No show?” with **Cancel** / **Mark No show**. Confirming takes them off tonight's roster and opens their slot (toast “NAME marked No show (cancelled) · 23/24”).
- A **No show (cancelled) · N** card above the waitlist lists them (face, name, “Marked TIME”) with **Back to roster**, disabled while the roster is full.
- If they were put in a match meanwhile, confirming refuses: “Remove NAME from their match first.”

## Docs updated
- Screen: `docs/screens/product/modules/queue/players-roster.md`.
- Business: `docs/business_logic/product/queue/modules/players/README.md`.
- Terms: `docs/product-terms.md` (No show (cancelled)).
- Database (proposed `session_players.no_show_at`, no migration): `docs/database_design/product/queue/modules/sessions-roster.md`.

## Open (ask the owner before ticketing)
- Does a no show still owe the session fee and keep their paid mark on Payments? (The mockup keeps the mark with the no-show entry but leaves them off Payments.)
- Is it shown on the player's own history or the public page?
- Should it be possible before Start, or is Remove from roster enough there?
