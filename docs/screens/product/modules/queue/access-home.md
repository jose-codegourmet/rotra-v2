# Queue access and session home

**Surfaces:** `Q-LOGIN`, `Q-ACCESS`, `Q-HOME`, `Q-CLUB`.

**Source:** [club account/licensing rules](../../../../business_logic/product/admin/modules/clubs-licenses/README.md), [Queue app](../../../../business_logic/product/queue/README.md). **Reference:** [ROTRA Queue prototype](../../../../frames/queue-app/rotra-queue.html).

## Top bar (all operator screens)

ROTRA wordmark with “Queue”, then the sync status pill on the right: “Synced HH:MM”, “Syncing…”, “Offline · N waiting to sync”, or “Working offline”. The pill is a button that opens the [sync status dialog](offline-recovery.md#q-sync--sync-status-and-pending-work). Hidden on the login screen. Next to it, a **light / dark mode switch** (sun or moon icon, label “Switch to light mode” / “Switch to dark mode”), shown on every screen with a top bar, login included. Dark is the default, following the device setting until the person picks one; the choice is remembered on that device (a per-device preference, not club data). The public page has no top bar.

**Left navigation (all operator screens except login, the license gate, finalizing and the public page):** a **burger** at the far left of the top bar controls a left nav. Items, each with an icon: **Live session** (only while one is live, accent with a pulsing icon), **Dashboard**, **Saved players** (count), **Venues** (count), **Inventory** (count), **Club settings**, **License**, **This device**, (Sign out lives in Club settings, not in the nav). The current screen's item is highlighted (`aria-current="page"`).

- **Wide screens (over 900 px):** the nav is a sticky rail beside the content, 232 px wide with labels and counts. The burger collapses it to a 68 px icon rail (labels become tooltips and accessible names) and expands it again; the choice is remembered on that device. Fixed bottom bars (Start session, Session done) start beside the rail.
- **Phones and tablets (900 px and narrower):** the nav is hidden and the top bar has no burger. Instead a **dock** is fixed to the bottom of every operator screen: **Menu** (opens the nav as a drawer from the left over a scrim; choosing an item, tapping the scrim, or Esc closes it), an emphasized center pill that is the page's main action, and **Settings** (Club settings, highlighted when open). The center pill is **Session done** on the live console, **Start session** on a prepared session's preparation page (disabled while blocked), **Continue session** elsewhere while a session is live, and **Create session** otherwise. So there is only one floating action on phones: the console's Session done bar is hidden, and the preparation Start bar is hidden when ready or shrinks to just its blocking reason (with any **Open TITLE** link) above the dock.

## Q-LOGIN — Dedicated club login

**Entry:** signed-out Queue app. **Exit:** club home, or the license gate.

Layout: ROTRA mark, “Run the game.”, heading **Club login**, form, and “Club access is set up and licensed by the ROTRA platform owner.”

| Control | Behavior |
|---|---|
| Username | Required; hint “Your club account username, not a player phone or email.” |
| Password | Required, masked; **Show** / **Hide** toggle with an accessible label and pressed state |
| Sign in | Shows “Signing in…” and is disabled while pending |

Errors: “Enter your club username and password.”; offline “Signing in needs an internet connection. Try again when you're connected.” Invalid credentials show a safe error without disclosing another club's details. Credentials stay editable after a failure.

Club password recovery/provisioning is not decided. Do not add a fabricated email reset or club application. Player registration links cannot authenticate this screen.

## Q-ACCESS — License gate

**Entry:** any club screen while the license has ended (home, saved players, inventory, club settings).

Card: club logo/initials, name, chip **License expired**; “Your club's license has ended. New sessions, saved players and past reports are unavailable until it's renewed.”; “Licenses are monthly or yearly and are activated manually by the ROTRA platform owner. Contact them to renew.” No prices or checkout.

If a session is active: a highlighted card “You can still finish this session” with title, time, venue, “This lets you finish and sync it. It doesn't let you start another session.” and **Continue active session**.

If status cannot be verified, show “Unable to verify access” separately from “Expired.” Do not turn network failure into an expiry claim.

## Q-HOME — Club dashboard

**Entry:** signed-in, licensed club.

**Club header:** club logo/initials; “Club dashboard · Weekday, Month Day”; club name; chip **License active** with the license line and founding address (“Yearly license · active until Mar 31, 2027 · Founded at …”).

**Now card** (full width under the header) shows exactly one state, styled so live and upcoming can't be confused:

- **Live:** accent edge and tint, a filled pulsing **LIVE NOW** badge, title, “venue · start–end · N h M min left” (or “past its end time”), live numbers (courts in use “1/3”, games played, players present “14/14”, queued), **Continue session**, and “Up next: TITLE · DATE” when another session is prepared.
- **Upcoming** (earliest prepared session, nothing live): neutral edge, an outlined **UPCOMING · …** badge with a clock and a countdown (“Starts in 45 min”, “Starts in 2 h 15 min”, “Tomorrow, 6:00 PM”, “In 3 days · DATE”, “Starting now”, or “Was due 6:00 PM · not started”), title, date · time · venue, preparation numbers (slots filled “14/24”, on the waitlist, courts, offline copy Ready/No), **Open preparation** and “Not started yet”.
- **Nothing planned:** outlined badge, “Plan your next club night”, **Create session**.

On phones the action button drops below the numbers at full width.

**Calendar card:** the view follows the screen (decided October 27, 2026), and **Previous / Today / Next** move by that view's unit:

- **Desktop (over 1024 px): month.** Month and year title; a full-width, seven-column month grid; today highlighted; the last opened day tinted. Each day lists up to two sessions (“7:00 PM Sunday Night Queue”) colored by state, then “+N more”. Tapping a date opens its day dialog; tapping a session label opens it directly: the console (live), preparation (prepared), or session record (completed/invalid). Day buttons have full accessible names (“Monday, October 26, today, 1 session”).
- **Tablet (641–1024 px): week.** Title “Oct 25 – 31, 2026”; seven day columns (Sun–Sat), today outlined in the accent; each column header (weekday + date) opens that day's dialog; each session is a card with time range, title (up to two lines) and venue, edged by state; empty days show “—”.
- **Phone (640 px and narrower): day.** Title “Tuesday, October 27”; a seven-day strip for the current week (selected day filled, today in accent, a dot on days with sessions) to jump between days; then that day's sessions as cards with time range, title, venue and a state chip. An empty day reads “No sessions this day.” with **Create session on this day** (today or later).

Legend under every view: Live, Prepared, Completed, Invalid. Crossing a breakpoint (rotating or resizing) redraws the calendar in the matching view.

**Day dialog (`Q-HOME` calendar):** tapping a date or “+N more” opens a dialog (a bottom sheet on phones) titled with the full date, plus “· Today” when relevant. It lists that day's sessions — state color, title, time · venue, and state chip — each opening the same screen as above, or “No sessions this day.” Footer: **Close**, and for today or a future date **Create session today** / **Create session on this day**, which opens setup with that date filled in. Past dates have no create action. Escape or Close returns focus to the date.

**Navigation (app-wide left nav, not part of the dashboard):** see the top bar section. The dashboard has no sidebar and no Prepared / Past session lists any more: the club header (with a primary **Create session** button, full width on phones), the now card, and the calendar, which opens every prepared, live and past session.



Each download badge is device-specific. One active session per club: preparing a future session is allowed; Start is blocked while another is active.

| State | Presentation/action |
|---|---|
| No sessions | Next-session card offers Create session; calendar empty |
| History empty | Past sessions empty; no demo standings |
| Invalid historical session | Invalid chip; record shows the reason; no slides |
| Offline with downloaded active session | Continue that session; creation unavailable |
| Offline without a local copy | Explain that the session must be downloaded online |
| License expired while viewing | Show Q-ACCESS |

## Q-VENUES — Venues

**Entry:** left nav **Venues** (with count). License-gated. Back link **Home**.

Header “Venues”, “Places your club books. Picking one in session setup fills in the address and court fee.” (and its entrance fee when set), primary **Add venue**. A grid of venue cards: pin icon, name, address (or “No address”), three stat tiles (court fee “per court, per hour”, entrance fee “per head”, each “—” when unset, and “N sessions here”), the next prepared session there (“Next: TITLE · DATE”) or “Nothing booked here yet”, and actions **Create session here** (opens setup with the venue and its fee filled in) and **Edit**. Empty: “No venues yet. Add one here, or when you create a session.” Add and Edit use the venue form from [setup](session-setup.md).

## Q-CLUB — Club settings

**Entry:** left nav Club settings, License, or This device (each opens that section), or **Edit template** from the Facebook post dialog. Back link **Home**.

**Layout:** a left-hand menu, pinned while scrolling, ending with a red **Sign out** item (the club account's only Sign out besides the Account section; on phones it is the last item in the settings drawer), grouped as **Club** (Club identity, Session defaults, Facebook post), **License** (License and payments, one page with the license card above the payment history), **This device** (Downloads) and **Account** (Account). Only the chosen section shows on the right, so nothing needs a long scroll. The current item is highlighted. On phones (760 px and narrower) the menu becomes a single full-width button showing the current section (“☰ Club identity · All settings”) that opens the whole settings menu as a drawer from the left, with a **Club settings** header and close ×; picking a section, tapping the scrim, or Esc closes it and returns focus to the button. Only one drawer is open at a time: opening the settings drawer closes the main menu, and opening the main menu closes the settings drawer.

**Offline:** the whole page is unavailable. It shows only “Club settings need an internet connection. Your club details, license and account are kept online, so they can't be viewed or changed while you're offline.”, a note that downloaded sessions still run offline, and **Back to home**.

| Section | Contents |
|---|---|
| Club identity | **Logo**: large preview (or initials), **Upload logo** / **Replace logo** (any image up to 5 MB, centre-cropped to a 256 px square) and **Remove**; shown on the dashboard, public page and result images. **Club name**: text field (required, up to 60 characters) with **Request change**, disabled offline or when unchanged; hint “Name changes need approval from the ROTRA platform owner. Nothing changes until they approve it.” After sending, the field is replaced by the current name and a notice “Name change requested: “NEW” · sent DATE, TIME. … Your club keeps its current name everywhere until it's approved.” with **Cancel request**. Founding address and city code (e.g. `PH-CEB`, “used in new players' RTR IDs”) are fixed |
| Facebook post | Three tabs: **Template** (default), **Club description**, **Court rules**. Edits are kept when switching tabs, and one **Save post template** saves all three. Club description and Court rules are text areas (fill `{{ club_description }}` and `{{ court_rules }}`). The **Template** tab is two columns: on the left, a scrollable list of keys, each showing `{{ key }}` and what it fills (e.g. “Payment per player”), which inserts the key at the cursor; on the right, the template text field (monospace). On phones the keys wrap above the field and show only `{{ key }}`. A **Preview** button opens a **Post preview** dialog filled in from the current or next session, including unsaved changes (“Includes your unsaved changes.”), with **Back to editing**; disabled until a session exists. Then **Save post template** and **Reset template to default**. Keys: club_name, club_description, title, day, date, where, when, x_courts (number of courts reserved), courts (court names, one per line), tube_count, x_tubes, player_count, players, waitlist, mode, minimum, fee_per_head (the full payment per player, e.g. “₱700 per head”), entrance_fee (the misc fee, e.g. “₱60 per head (included)” or “None”), court_rules. Unknown keys are left as typed |
| Session defaults | “Used to fill in new sessions.” **Players per court**: − / count / + (2–20, default 8), “Your slot budget: 8 players for each court you reserve, so 3 courts give 24 slots. The rest go on the waitlist.” **Entrance fee per head** (misc cost): switch plus amount and **Save** (“Enter an amount, 0 or more.”); status line “New sessions list a ₱60 entrance fee per head, unless the venue has its own.” or “New sessions start with no entrance fee, unless the venue has one.” Hint: “It's added to each session's costs, so the payment per player covers it.” Turning the switch off clears the default |
| License | Status chip and tiles: Plan, Active since, Active until, Days left. Copy: licenses are monthly or yearly, activated and renewed by hand by the platform owner after payment outside ROTRA; a running session can still be finished and synced if it lapses |
| Payment history (on the License page) | Table: Paid, Plan, Covers (from – to), Amount, Reference, newest first, “Recorded by the platform owner each time a license is activated.” **Export CSV** saves the table as `<club>-license-payments.csv` through the viewer's save prompt. Amounts are samples until prices are set |
| This device | Sessions downloaded here with **Ready** chips, or “No sessions downloaded on this device yet. Download one from its preparation page.”; “Downloads are per device. A session downloaded on a laptop isn't ready on a phone.” |
| Account | Username; **Change password**: current password, new password (at least 8 characters), confirm, with a Show passwords toggle. Errors: “That isn't your current password.”, “Use at least 8 characters.”, “Choose a password different from your current one.”, “Passwords don't match.” Success toast: “Password changed. Use the new one next time you sign in.” Note: “Forgot your current password? The ROTRA platform owner can reset it for you.” **Sign out** |

## Acceptance examples

- An expired club opening Saved players or Inventory sees the access gate, not a cached list.
- A club with one active session can continue it on a second prepared device but cannot start a different session.
- An invalid historical session never offers result slides or downloads.
- The calendar shows a live session on today's date and opens the console from it.
- Tapping an empty future date opens its day dialog, and Create session pre-fills that date.
- Requesting a club name change leaves the old name on the dashboard and public pages until the platform owner approves it.
- Changing the password with a wrong current password shows “That isn't your current password.” and changes nothing.
- Opening Club settings offline shows only the connection message.
- Switching to light mode and reloading on the same device keeps light mode; another device still opens in its own setting.
