# Public session page

**Surfaces:** `Q-PUBLIC-DETAILS`, `Q-PUBLIC-PARTICIPANTS`, `Q-PUBLIC-RESULTS`, `Q-PUBLIC-STALE`, `Q-PUBLIC-JOIN`.

**Audience:** anyone with the link; no sign-in required. **Sources:** [Queue page brief](../../../../business_logic/product/queue/README.md), [license retention](../../../../business_logic/product/admin/modules/clubs-licenses/README.md). **Reference:** [ROTRA Queue prototype](../../../../frames/queue-app/rotra-queue.html) — **Public page** / **Preview public page**.

## Shared composition

No operator top bar. Hero: “Date · start–end”, session title, club logo/initials and name labeled **Organizer**, and a chip **Happening now** (active) or **Finished** (finalized). Tabs: **Details** and **Participants · N**.

The operator reaches it from preparation (**Preview public page**), the console, and the session record. In the operator app a banner reads “Public page preview. What anyone with the session link sees, no sign-in needed.” with **Back to Queue app**; the real public page has no banner.

Do not copy the reference's ads, Can't go, Matches, Chat, or multiple-organizer controls. **Request to join** is now in scope as a request only (Q-PUBLIC-JOIN). A contact route can be added only when the club-contact presentation is decided.

## Q-PUBLIC-JOIN — Guest join request

Shown under the hero on prepared and live sessions. Card **Want to play?**: “N of M slots open.” (or “All slots are taken; confirmed guests join the waitlist.”) “Send a quick request and the Queue Master confirms it.” with **Request to join**. When the club turned requests off: “This session isn't taking requests online. Contact the Queue Master to play.”

Sheet **Request to join**: session line (title · date, time · venue); **Your name** (required, “Enter your name.”); **Nickname (optional)**; **Phone (optional)** with “Helps the club recognise you and link your ROTRA profile. Only the club sees it.” (“Enter a full mobile number, or leave it empty.”); **Your level**: Beginner / Intermediate / Advanced / Not sure (“Pick your level, or Not sure.”; hint “Your best guess. The Queue Master sets your level for the night.”); note “This is a request, not a booking. The Queue Master confirms each guest before giving a slot.” **Cancel** / **Send request** (toast “Request sent”).

Afterwards the same visitor sees a status card instead: **Request sent** (“…Your slot isn't held until they do.”), **Confirmed · you have a slot**, **Confirmed · waitlist #N**, or **Request not accepted**. In the prototype, **Open as a guest** (preparation, Prototype panel) shows this view with the banner “Guest view (prototype)…”.

## Q-PUBLIC-DETAILS — Session description

| Row | Content |
|---|---|
| When | Date, start–end, duration |
| Venue | Venue name and address |
| Courts | Count and labels |
| Formats | “Doubles”, “Singles + Doubles”, or “No standard format” |
| Mode | Name and description (“Fair · Mainly level-matched games, roughly 10% easy games.”) |
| Minimum | “N games per player” |

Then the notes, and a footer: “Slots are confirmed with the Queue Master directly. Last updated HH:MM.” — adding “Recent changes from the venue haven't synced yet.” when the server knows changes are pending.

No fees, costs, or payment states. The club founding location never replaces the venue. Values change only after sync, never from a disconnected operator's local edits. Do not call stale data “Live.”

## Q-PUBLIC-PARTICIPANTS — Confirmed people

A grid of cards: profile picture (registered or unclaimed players with an uploaded picture) or initials, name, and “Has a ROTRA profile” for registered and unclaimed players. Guests get initials and no profile label.

No phone, email, identity-verification state, level, presence, games, operator notes, or Off Day. Below the grid, when anyone is waiting: “Waitlist · N” as a numbered list of names and “Waitlisted players get a slot if one opens. Ask the Queue Master.” Empty: “Players have not been added yet.”

## Q-PUBLIC-RESULTS — Published results only

For finished sessions, a **Results** section below the tabs shows the published Standings and/or Awards slides, and Off Day only if explicitly included (without its private band). Before publication: “Results for this session have not been shared.” — never claim there were no games.

Before publication, private result data must not be in hidden panels or preloaded payloads. Invalid sessions have no results section.

## Q-PUBLIC-STALE — Expired license and deleted page

On club expiry the page becomes stale; the exact remaining read access is an open business detail. Distinguish stale from deleted.

After six months of continuous expiry the page is deleted. Show a neutral unavailable state without leaking retained internal data. Player match history and earned ranks remain in Player Information. Renewal within the retention period cancels deletion.

## Offline public visitor

A previously cached copy may show with its last-update time. With no cache, explain that a connection is needed.

## Acceptance examples

- A public visitor sees Details/Participants with no login barrier and no join controls.
- A confirmed guest has no broken fake profile link.
- Private Off Day never appears in public data or image previews.
- The session's cost estimate never appears publicly.
- Deleting the page does not remove a player's profile/history.
