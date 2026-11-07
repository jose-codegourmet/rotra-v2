# Public session page

**Last verified:** 2026-11-07 for the operator-only preview route (#469), masked participant names (#475) and the aggregate skill mix (#474).

**Surfaces:** `Q-PUBLIC-DETAILS`, `Q-PUBLIC-PARTICIPANTS`, `Q-PUBLIC-RESULTS`, `Q-PUBLIC-STALE`, `Q-PUBLIC-JOIN`.

**Audience:** anyone with the link; no sign-in required. **Sources:** [Queue page brief](../../../../business_logic/product/queue/README.md), [license retention](../../../../business_logic/product/admin/modules/clubs-licenses/README.md). **Reference:** [ROTRA Queue prototype](../../../../../apps/mockup/queue-app/rotra-queue.html) — **Public page** / **Preview public page**.

## Shared composition

No operator top bar. Hero: “Date · start–end”, session title, club logo/initials and name labeled **Organizer**, and a chip **Happening now** (active), **Finished** (finalized) or **Cancelled** (cancelled). Tabs: **Details** and **Participants · N**.

The operator reaches it from preparation (**Preview public page**), the console, and the session record. In the operator app a banner reads “Public page preview. What anyone with the session link sees, no sign-in needed.” with **Back to Queue app**, and a second line “Share this link, not this page's address:” with the session link (origin + `/s/<slug>`) and **Copy link** (toast “Session link copied”; if the clipboard is unavailable the link is shown in an error toast). The real public page has no banner.

**Two addresses.** The session link `/s/<slug>` is the only address to share; it is what Copy link, Copy invite link and the Session QR hold. The preview `/sessions/<sessionId>/public-page` is operator-only: only a signed-in account of the club that owns the session sees the preview. Anyone else who opens it (signed out, private window, another club) is redirected to `/s/<slug>` and gets the visitor page with its normal join state and visibility rules (an unavailable page stays unavailable); an unknown session id is not found.

Do not copy the reference's ads, Can't go, Matches, Chat, or multiple-organizer controls. **Request to join** is now in scope as a request only (Q-PUBLIC-JOIN). A contact route can be added only when the club-contact presentation is decided.

## Q-PUBLIC-JOIN — Guest join request

Shown under the hero on prepared and live sessions. Card **Want to play?**: “N of M slots open.” (or, during preparation, “All slots are taken; confirmed guests join the waitlist.” During an active session the card says the Queue Master can admit additional players.) “Send a quick request and the Queue Master confirms it.” with **Request to join**. When the club turned requests off: “This session isn't taking requests online. Contact the Queue Master to play.”

Sheet **Request to join**: session line (title · date, time · venue); two choices (#476): **Continue as guest** (selected; the form below) and **Log in with ROTRA Player** (a link to the player app login, which returns here with `?join=1`), with “New to ROTRA? Sign-up isn't open yet — continue as a guest for now.” (no sign-up link until player registration exists). Back from the login the sheet opens with “You're back — finish your request below.”; the request API cannot yet attach a signed-in player, so the guest form is still what sends. Logging in never grants a slot. **Your name** (required, “Enter your name.”); **Nickname (optional)**; **Phone (optional)** with “Helps the club recognise you and link your ROTRA profile. Only the club sees it.” (“Enter a full mobile number, or leave it empty.”); **Your level**: Beginner / Intermediate / Advanced / Not sure (“Pick your level, or Not sure.”; hint “Your best guess. The Queue Master sets your level for the night.”); note “This is a request, not a booking. The Queue Master confirms each guest before giving a slot.” **Cancel** / **Send request** (toast “Request sent”).

Afterwards the same visitor sees a status card instead: **Request sent** (“…Your slot isn't held until they do.”), **Confirmed · you have a slot**, **Confirmed · waitlist #N**, or **Request not accepted**. In the prototype, **Open as a guest** (preparation, Prototype panel) shows this view with the banner “Guest view (prototype)…”.

**Cancelled session** (owner decision, November 6, 2026): in place of the join card, a warning notice “**This session is cancelled.** REASON.” (the reason without its trailing period, then one period; just the first sentence when no reason was given). No **Request to join** and no status card. Details and Participants (with the waitlist) stay visible.

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

A grid of cards: profile picture (registered or unclaimed players with an uploaded picture) or initials, masked name, and “Has a ROTRA profile” (a label, not a link) for registered and unclaimed players. Guests get initials and no profile label.

**Masked names** (owner decision, November 7, 2026; #475): each word of the name shows as its first letter plus a fixed `***` (“Jose Adrian” → “J*** A***”, “Mika” → “M***”; a blank name reads “Player”). The server masks them, so the full name is not in the page data, avatar label or tooltips. The operator preview and the record's **Public page** tab show the same masked names. A visitor's own request status card may still show the name they typed. See [Players › Public participant names](../../../../business_logic/product/queue/modules/players/README.md#public-participant-names).

**Skill mix** (#474): above the grid, when anyone is confirmed, a `SkillDistributionBar` labeled “Skill mix” with the total (“N players”), a stacked bar and a legend with Beginner, Intermediate, Advanced and No level counts (zero groups are left out). Its accessibility label reads “Skill mix: 4 Advanced, 8 Intermediate, …”. Counts only, computed on the server over the same confirmed participants as the grid (not the waitlist): never who is which level. The grid keeps roster order and is never grouped or sorted by level. Hidden when nobody is confirmed. See [Players › Public skill mix](../../../../business_logic/product/queue/modules/players/README.md#public-skill-mix).

No phone, email, identity-verification state, level, presence, games, operator notes, or Off Day; no participant is tied to a level. Below the grid, when anyone is waiting: “Waitlist · N” as a numbered list of masked names and “Waitlisted players get a slot if one opens. Ask the Queue Master.” Empty: “Players have not been added yet.”

## Q-PUBLIC-RESULTS — Published results only

For finished sessions, a **Results** section below the tabs shows the published Standings and/or Awards slides, and Off Day only if explicitly included (without its private band). Before publication: “Results for this session have not been shared.” — never claim there were no games.

Before publication, private result data must not be in hidden panels or preloaded payloads. Invalid sessions have no results section.

## Q-PUBLIC-STALE — Expired license and deleted page

On club expiry the page becomes stale; the exact remaining read access is an open business detail. Distinguish stale from deleted.

After six months of continuous expiry the page is deleted. Show a neutral unavailable state without leaking retained internal data. Player match history and earned ranks remain in Player Information. Renewal within the retention period cancels deletion.

## Offline public visitor

A previously cached copy may show with its last-update time. With no cache, explain that a connection is needed.

## Acceptance examples

- A public visitor sees Details/Participants without signing in and can use Request to join when requests are enabled. A request never reserves a slot; only the Queue Master confirms or declines it.
- A cancelled session's page says Cancelled with the reason and offers no Request to join.
- A confirmed guest has no broken fake profile link.
- Private Off Day never appears in public data or image previews.
- The session's cost estimate never appears publicly.
- Deleting the page does not remove a player's profile/history.
