# Queue: No show (cancelled) on the live Players view

Status: IN MOCK APP — #832
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
- Database (`session_players.no_show_at`, migration `20261114000300_session_players_no_show`, #839): `docs/database_design/product/queue/modules/sessions-roster.md`.

## Decisions (November 14, 2026, #839, D-2026-11-14-02)
- **Fee and Payments:** a no show owes nothing. They are off the Payments list and out of the fee split while marked; their stored paid mark is kept and shows again after Back to roster (the same rule as Move to waitlist).
- **Visibility:** not shown on the player's own history or the public session page; only on the live Players view of the Queue console. Out of standings and finalization like any non-participant.
- **Before Start:** not possible. Remove from roster covers a prepared session.
