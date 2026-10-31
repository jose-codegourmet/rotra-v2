# Queue app

**Status:** Target v1 behavior; primary product. Updated October 26, 2026.

The club operator runs sessions from preparation to confirmed results. Players do not operate the queue, reserve their own slots, or need an account to participate.

**Reference prototype:** [`app/mocksups-app/queue-app/rotra-queue.html`](../../../../app/mocksups-app/queue-app/rotra-queue.html), also published as the ROTRA Queue artifact. It is a clickable, single-file prototype with fictional data, and it is the agreed design reference for the Queue app. Where it says a detail is not decided yet, the module docs keep that detail open.

| Module | Owns |
|---|---|
| [Sessions](modules/sessions/README.md) | Three-page setup, formats, calculated minimum, courts and time, lifecycle |
| [Players](modules/players/README.md) | Saved players, lookup, identity states, presence, roster levels |
| [Queueing](modules/queueing/README.md) | Modes, Make match, Suggest, Auto queue, shared queue, dispatch, regeneration |
| [Matches](modules/matches/README.md) | Starts, results, substitutions, invalid games |
| [Offline](modules/offline/README.md) | Download, sync status, continuity, recovery, sync integrity |
| [Results](modules/results/README.md) | Live leaderboard, finalization, standings, awards, publishing, downloads, session record |
| [Financials](modules/financials/README.md) | Optional session cost estimate and club inventory |

Licensing belongs to [Admin](../admin/modules/clubs-licenses/README.md); shared identity/rank belongs to [Player Information](../player-information/README.md).

## Club home

After sign-in, the club sees its dashboard: club name, logo, founding address, license status and a **Create session** button; the live or next session with **Continue session** or **Open preparation** (or **Create session** when nothing is planned); and a month **calendar** marking live, prepared, completed, and invalid sessions, which is how prepared and past sessions are opened (there are no separate lists). A collapsible left navigation on every operator screen covers Live session (while one is live), Dashboard, Saved players, Venues, Inventory, Club settings, License and This device; on phones a bottom dock gives Menu, Create/Continue session and Settings. Sign out is in Club settings. Every operator screen's top bar has the sync status and a light/dark mode switch (dark by default, remembered per device).

Club settings are online only (offline, the page says so and shows nothing else) and use a left-hand menu: **Club** (Club identity, Session defaults, Facebook post), **License** (License and payments), **This device** (Downloads), **Account**. The club uploads or removes its logo directly (used on the dashboard, public page and result images); a **club name change is a request** the platform owner approves in Admin, and the old name stays until then. Settings also show the fixed founding address and city code, session defaults (players per court, default entrance fee), license details (plan, active since/until, days left) with the license payment history and CSV export on the same page, sessions downloaded on this device, and the account username. The club can **change its password** by entering the current one; a forgotten password is reset by the platform owner.

The club can keep a **Facebook post template** with `{{ keys }}` (club name and description, weekday, where/when, courts, shuttle tubes per brand, numbered players, court rules, payment per player, entrance fee and more). Each session's **Copy Facebook post** fills it in for the operator to paste; ROTRA does not post to social networks itself. Each session's public page is also its **session link**: guests who open it can send a join request, which the Queue Master confirms or declines ([join requests](modules/players/README.md#join-requests-from-the-session-link)). The template is edited in three tabs (Template, Club description, Court rules) with the keys listed beside the text, and a Preview dialog.

Saved players is a filterable grid (sort A–Z and more; filter by skill level, city registered in, when added, account status, and **right now**: playing on a court, at the live session but not playing, or anywhere in the live session). Cards keep RTR IDs out of the way; they appear in the full profile. Guests and unclaimed profiles get an **Invite** link to create or claim a ROTRA account, which never books a session.

## Public session page

A dedicated page is accessible to anyone with its link, without login. The supplied Reclub screenshots inspire the layout:

- Header: date and time, session title, club as **Organizer**, and **Happening now** or **Finished**.
- **Details:** date, time and duration, venue and address, number and labels of courts, enabled singles/doubles formats, mode with its description, minimum games per player, and notes. A footer says slots are confirmed with the Queue Master directly and shows when the page was last updated, adding that recent venue changes have not synced when that is the case.
- **Participants · N:** each player's picture (or initials) and name, with "Has a ROTRA profile" for registered and unclaimed players. No levels, presence, contacts, or identity checks.
- **Results** (finished sessions only): the published slides, or "Results for this session have not been shared."

Financial estimates never appear on the public page.

There is no Matches or Chat tab. Screenshot join/cancel buttons do not introduce player slot requests; multiple organizer avatars do not introduce multiple-manager permissions. The screenshots are layout references, not a feature checklist.

Public information reflects the last sync while the operator is offline. Continuous live spectator connections are not a v1 requirement.

Visual references: user-supplied `IMG_6434.PNG` and `IMG_6435.PNG`. Images have not been copied into this tree.
