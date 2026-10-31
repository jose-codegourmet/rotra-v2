# Session setup, preparation, download, and start

**Surfaces:** `Q-SETUP`, `Q-PREPARE`, `Q-DOWNLOAD`, `Q-START`.

**Sources:** [sessions](../../../../business_logic/product/queue/modules/sessions/README.md), [offline rules](../../../../business_logic/product/queue/modules/offline/README.md), [financials](../../../../business_logic/product/queue/modules/financials/README.md). **Reference:** [ROTRA Queue prototype](../../../../../app/mocksups-app/queue-app/rotra-queue.html).

## Q-SETUP — Create / edit preparation wizard

**Entry:** **Create session** (club header on the dashboard, the phone dock, the now card when nothing is planned, a calendar day) or **Edit preparation**. **Actor:** licensed club operator. **Connectivity:** saving requires internet.

Header: “Create session” or “Edit preparation”, “For CLUB. Saving needs an internet connection.” Back link: Home, or Back to preparation.

A numbered step bar shows **three pages** (Date, venue and courts · Formats, mode and minimum · Costs and review), each containing two titled sections, and **every page is clickable at any time**, so the operator can skip ahead (hint: “Tap any step to jump to it. Finished steps glow green.”). Step states:

| State | When | Presentation |
|---|---|---|
| Current | The open step | Accent top bar |
| Done | Visited and its required fields are valid; every step of a saved session counts as visited | Green top bar with a soft green glow and ✓ |
| Needs details | Visited but a required field is missing or invalid (e.g. Details without a title) | Amber top bar and “!” |
| Not visited | Not opened yet | Neutral, step number |

Each step button's accessible name says its state (“Step 1, Date, venue and courts, complete”). Skipping never bypasses validation: **Next** still checks the current step, and saving checks every step and opens the first one with an error.

Footer: **Cancel**/**Back**, then **Create session** (or **Save changes** when editing) on pages 1–2 beside **Next**, and the primary **Create session** on page 3. Hint on new sessions: “Only page 1 is required. Create session works from any page; the rest uses sensible defaults you can change later.” Older six-step drafts open on the matching page.

| Page · section | Contents |
|---|---|
| 1 · Details | Session title (placeholder “e.g. Thursday Open Play”); Date (opens the date picker dialog below); Starts; Ends — hint shows duration and “Ends the next day ·” when overnight; **Venue** — one field (pin icon, venue name, address under it, or “Choose or add a venue”) that opens the venue picker below. Hint: the venue doesn't change the club's founding address |
| 1 · Courts | “How many courts did you book?” − / count / + (minimum 1); one label field per court; **Players per court** − / count / + (2–20, default from Club settings, usually 8) with “How many players you budget for each court you reserve.”; a summary “24 slots: 3 courts × 8 players. Anyone added after that goes on the waitlist.” When editing a prepared session: if the new budget is below the roster, a warning “14 players already have a slot. With 8 slots, the last 6 added move to the front of the waitlist when you save, in the order they joined.”; if it opens slots and people are waiting, “When you save, the first N on the waitlist get the new slots.” The save toast adds “· N players moved to the waitlist” or “· N players moved from the waitlist”. Hint: free courts can still be added or removed during the session, and slots follow the court count |
| 2 · Formats and mode | Singles and Doubles switches with “Include standard … when generating matches.”; with both off, warning “With both formats off, Auto queue has nothing to generate. Only manual fun games would be possible.”; Mode choice cards Chill / Fair / Hard with their descriptions; hint explaining easy games and that modes are flexible |
| 2 · Minimum games | Chip **Calculated** or **Set by you**. Expected players (only when the roster is empty; optional, placeholder and default = the slot budget, “Leave empty to use your N slots.”) or “N on the roster”. Estimate “low–high games each” with the explanation (usable courts × duration of format mix at 15–20 min a game; how many players are on court at once). Minimum field: disabled and equal to the low end when calculated, editable when set by you. **Set it yourself** / **Use the estimate**. Footer: full fun games count; partial and invalid don't; a target, not a guarantee |
| 3 · Financials | See [Q-FINANCIALS](financials-inventory.md) |
| 3 · Notes and review | Notes (optional) — “Shown on the public session page.” Review list: Session, When (with duration), Venue, Courts, Formats · Mode, Minimum (“(calculated)”), Costs — each section with Edit |

**Repeats (new sessions only).** Under the times: **Repeats** — Does not repeat (default), Every week, Every 2 weeks, Every month (same date; the last day of shorter months) — and, when repeating, **Number of sessions** (− / count / +, 2–12, default 4). A list shows every date with its time and either ✓ or the clash, and a summary: “3 sessions will be created; 1 clashing date is skipped. They're separate sessions you can edit one by one.” The review step adds **Repeats** (“Every week · 4 sessions (1 clashing date skipped)”). Saving creates one prepared session per free date (toast “4 sessions created · 1 clashing date skipped”) and opens the first.

**Clash guardrails.** Every date is checked against the club's other sessions (not invalid ones):
- **Venue clash** — another session at the same venue overlaps: “Venue clash: Banilad Sports Hub is already booked for Sunday Night Queue, 6:00 PM–9:00 PM”.
- **Time clash** — another session at a different venue overlaps (the club runs one session at a time): “Time clash: Sunday Night Queue runs 6:00 PM–9:00 PM at Banilad Sports Hub”.
A single session that clashes shows the message on step 1 and cannot continue or save (“… Pick another date or time.”). In a series, clashing dates are skipped and never created; if every date clashes the step shows “Every date clashes with another session. Change the start date, time or venue.” Editing a saved session checks it against the others the same way. The step bar shows step 1 as needing details while a clash blocks it.

**Venue picker dialog.** **Choose a venue** lists the club's saved venues (name, address, “₱350/h per court” or “No court fee set”), with a search field (“Venue name or area”) and **Edit** per venue. Typing a name that isn't saved offers **+ Add “NAME” as a new venue**; with an empty search there is **+ Add a new venue**. Picking a venue fills the venue and address and, when saved, its court fee and entrance fee (toast: “Lahug Covered Court · court fee ₱250/h and entrance ₱60 filled in”). Picker rows show “₱250/h per court · ₱60 entrance”. The **New venue / Edit venue** form has Venue name (required, unique: “You already have a venue with this name.”), Address (optional) Court fee per hour per court (optional, 0 or more) and Entrance fee per head (optional, 0 or more; “If this venue charges each player to get in.”); saving adds it to the club's venues and selects it for this session. Validation on step 1: “Choose where you are playing.”

**Date picker dialog.** Every date field is a button showing a calendar icon and the full date (“Tuesday, December 15, 2026”); there is no native date input. It opens **Choose a date**, a single-date picker with no ranges:

- A highlighted summary of the selected date (“Today” under it when applicable).
- Month name with previous/next; previous is disabled on the current month.
- A seven-column month grid. Today has an accent ring; the selected day is filled. Past days are disabled, except a past date already saved on the session. Days on which the club already has another session show a small dot, explained by a legend (“Your club already has a session”).
- **Today** jumps back to today. Arrow keys move by a day (←/→) or a week (↑/↓), crossing months; one day is in the tab order at a time.
- Footer **Cancel** (or Escape) leaves the date unchanged; **Set date** applies it. Focus returns to the date field.

On phones the dialog is a bottom sheet. Start and end stay time fields.

Footer actions: **Cancel** on step 1, otherwise **Back**; **Next**; on the last step **Create session** / **Save changes**. When editing, **Save changes** is also available on every step. Save buttons are disabled offline.

Validation on Next and on save:

| Field | Message |
|---|---|
| Title empty | “Give the session a title.” |
| Venue empty | “Add where you are playing.” |
| Expected players (empty roster) | “Enter how many players you expect.” — whole number, at least 1 |
| Minimum (set by you) | “Use a whole number, 0 or more.” |
| Court fee / entrance fee | See Q-FINANCIALS |

A step with errors shows “Fix the highlighted fields to continue.” On save, the wizard jumps to the first step that has an error.

Offline: “You're offline. You can fill this in, but it isn't saved until you reconnect. A draft can't be run offline.”

Success: opens Q-PREPARE with “Session created” or “Preparation saved”.

New-session defaults: tomorrow, 19:00–22:00, Court 1 and Court 2, Doubles on, Singles off, Fair, calculated minimum, 12 expected players, shuttle plan from the first shuttlecock item.

**Clash links.** Every time or venue clash message in setup (the single-date notice and each skipped date in a repeating series) ends with **View it**, which opens a summary dialog of the clashing session (status chip, when, venue, courts, roster count) with **Back to setup** (the draft is untouched) and **Open live session / preparation / session record**.

## Q-PREPARE — Session preparation overview

Header: “Preparation”, title, date · time · venue. Actions: **Edit preparation**, **Preview public page**, **Copy Facebook post**, **Delete session** (danger style; always opens [D-DELETE-SESSION](../../dialogs.md#d-delete-session--delete-session); on success it goes Home with the toast “Session deleted · <title>”).

**Copy Facebook post** (also on the live console) opens a dialog with the club's post template filled in for this session (players numbered, courts and shuttle tubes listed, where/when, court rules) in a read-only text box, **Copy post** (“Facebook post copied”, or the text is selected if the browser blocks copying) and **Edit template** (Club settings). ROTRA never posts to Facebook itself; the operator pastes the text. The waitlist key lists waitlisted players in order, or “None yet. N slots left.”

**Session link card** (Overview tab, below Setup / This device): “Share it in your Facebook post or group chat. Anyone with it sees the public page; guests can send a join request, and nobody gets a slot until you confirm them.” A read-only link field with **Copy link** (toast “Session link copied”), **Open as a guest**, **Preview public page**, a chip “N join requests” when any are waiting, and an **Accept join requests** switch (“Guests can request a slot from the public page.” / “The public page says to contact the Queue Master instead.”).

**Join requests card** (only while requests are waiting): “Join requests · N”, “Check each one is a real person you expect (ask at the door, or match their name and phone) before confirming. Oldest first.” (+ “Slots are full, so confirmed guests go on the waitlist.”). Each row: initials, name and nickname, phone or “No phone given” · “says LEVEL” · “requested HH:MM”, chip **Guest request**, a level select pre-set to the middle of the stated band (empty for Not sure; “Choose a level for this club before confirming.”), **Decline** and **Confirm guest** / **Confirm to waitlist**. Confirmed guests join the roster (or waitlist) and the toast names their level.

| Card | Contents |
|---|---|
| Setup | Courts, Formats, Mode with description, Minimum with its calculation (“Calculated: N players on C courts for duration gives about low–high games each. Updates as the roster changes.” or “Set by you. The estimate suggests low–high.”), Roster “N confirmed · M present”, Costs when saved |
| This device | Download state chip; [Q-DOWNLOAD](#q-download--device-readiness) |
| Tabs | Below the header (and any Join requests card): **Overview** (default: the Setup and This device cards and the Session link card), **Roster and levels · 14/24**, **Waitlist · N**, **Payments · P/N paid**; one shows at a time. |
| Roster and levels (tab) | Roster tab: “Confirm each player's slot and set their level for this club. Levels lock when the session starts.” A **slots meter** under the header: “14/24 slots · 10 left before the waitlist” with a bar (accent; amber when 2 or fewer are left), “8/8 slots · Full · new players go on the waitlist”, or “N over budget …” after Give slot anyway; adds “· N on the waitlist” when anyone is waiting. **Mark all present** (shown only while someone isn't present), **Mark all absent** (shown only while someone is present), **Add player**. Warning “N players need a level before the session can start.” Rows: picture/initials, name, identity chip, “Suggestion: LEVEL”, level select (grouped by band, “Choose a level…”, highlighted when missing) with an indicator under it: “▲ May be too high · N steps above suggestion” (amber), “▼ May be too low · N steps below suggestion” (red), or “✓ Matches suggestion” (accent); none when there is no suggestion or no level, Present switch, remove (×). Empty: “No players yet. Add players from your saved list or as new guests.” |
| Waitlist (tab) | “Waitlist · N”, “Slots: 14 of 24 used (3 courts × 8 players) · 10 open. First come, first served.” Rows: position #, picture, name, level, “waiting since TIME”, **Give slot** (or **Give slot anyway** when full) and remove ×. **Fill N open slots** when slots are open and people are waiting. Empty: “Nobody is waiting.” |
| Start (sticky bar) | Not a card any more: a bar fixed to the bottom of the screen, always visible while scrolling. Left: the first blocking reason in amber (“N players need a level before you can start.”, “TITLE is already running. One session at a time.” with an **Open TITLE** button that goes to that live session, “No downloaded copy on this device. Connect, or download first.”, “Your license has ended, so new sessions can’t start.”) or, when ready, “N players · M present. Starting locks levels; no match starts by itself.” Right: **Start session** (disabled while blocked) |

Level changes save immediately with a toast (“Migs: Intermediate Mid”) and can influence shared rank after sync. Removing a roster player is immediate (“NAME removed from the roster”); the calculated minimum updates.

## Q-DOWNLOAD — Device readiness

Card **This device** with a chip: **Not downloaded on this device**, **Downloading…** (warning), or **Ready on this device** (success).

Copy: “Download the session so this device can keep running it if the venue's internet drops. A download on one device doesn't prepare any other device.” Button **Download for offline use**, or **Update download** when ready; disabled while downloading and offline (“Downloading needs an internet connection.”). Success toast: “Ready on this device”.

On failure keep any previous usable snapshot and label its age; a partial transfer is not Ready. Never advise clearing unsynced session data. Device enrollment and start authorization remain technical dependencies.

## Q-START — Start review

**Start session** (in the sticky bar) is disabled when any roster player has no level, another session is active (“TITLE is already running. Your club can run one session at a time.”), the device is offline without a download (“This device has no downloaded copy. Connect to start, or download first.”), or the license has ended (“Your license has ended, so new sessions can't start.”).

The dialog “Start session?” lists Session, Courts, Formats, Mode, Minimum, and Roster (“N confirmed · M present”), then: “Every player's level locks now. Players you add later get a level when you add them, and it locks too.” Offline adds “Starting on this device while offline. It syncs when you reconnect.” Actions **Back** and **Start session**.

Success opens Q-CONSOLE on the Session view with “Session started · levels locked”. No match starts automatically. An empty roster does not block the start.

## Acceptance examples

- Creating a session without internet cannot produce a functioning offline event.
- Downloading on one device does not mark another device ready.
- A different active session blocks Start, but not recovery of the existing session.
- Starting locks levels already assigned in preparation.
- A roster player without a level blocks Start until a level is chosen.
- Adding a player in preparation changes the calculated minimum.
