# MVP decisions and tracking

**Last verified:** 2026-11-27 (D-2026-11-27-01 to 03 added; amendment note on D-2026-11-27-02); 2026-11-26 (D-2026-11-26-01 to 10 added; D-2026-11-25-06 added; amendment notes on D-2026-11-19-02 and D-2026-11-19-13); 2026-11-25 (D-2026-11-25-01 to 03 added; D-2026-11-25-04 added; D-2026-11-25-05 added; amendment note on D-2026-11-16-05); 2026-11-23 (D-2026-11-23-01 to 07 added; amendment note on D-2026-11-16-04); 2026-11-22 (D-2026-11-22-01 added; status updated for #1004 to #1008, now implemented; D-2026-11-22-02 to 07 added); 2026-11-20 (D-2026-11-20-01 and 02 added; D-2026-11-16-01 status updated); 2026-11-19 (register split into one file per day; D-2026-11-19-02 to 14 added; amendment note on D-2026-11-19-01; amendment notes on D-2026-11-18-03 and D-2026-11-18-04); 2026-11-18 (D-2026-11-18-05, 06 and 07 added, amendment note on D-2026-11-16-04; D-2026-11-18-01 to 04 added; the club nickname decision renumbered from 02 to 03, which two decisions shared; amendment note on D-2026-11-17-01; P15.8 status lines on D-2026-11-16-04 and the club nickname); 2026-11-17 (D-2026-11-17-01 added); 2026-11-16 (D-2026-11-16-01 to 06 added); 2026-11-13 (D-2026-11-13-01 approved; amendment notes on D-2026-11-08-03, D-2026-11-09-04, D-2026-11-09-09, D-2026-11-11-04); 2026-11-12 (decisions and status lines; code trace of `main` @ `aca899f2` for the older entries); decisions added 2026-11-09. This is the short decision register
for MVP discussions. The [MVP hub](../README.md) summarizes delivery; GitHub issues track implementation.
Product rules and existing open-decision documents remain authoritative for their domains.

## Layout

One file per day, named `YYYY-MM-DD.md` after the date in the decision ID: `D-2026-11-14-01` lives in
[2026-11-14.md](2026-11-14.md#d-2026-11-14-01). Open the day you need instead of reading every file.
This README holds the index, the status conventions and the entry template.

## Index

| ID | Title | Decision status | Implementation | Ticket | Workstream |
|---|---|---|---|---|---|
| [D-2026-11-07-01](2026-11-07.md#d-2026-11-07-01) | Manual player password recovery for MVP | approved (updated #491) | in progress | #491 | [Player](../workstreams/player.md), [Admin](../workstreams/admin.md) |
| [D-2026-11-07-02](2026-11-07.md#d-2026-11-07-02) | Decision and roadmap status tracking | approved | implemented | none | Tracking (this folder) |
| [D-2026-11-07-03](2026-11-07.md#d-2026-11-07-03) | Offline session boundaries and guest reconciliation | approved | not started | needed; #246 | [Queue offline](../workstreams/queue-offline.md), [Player](../workstreams/player.md) |
| [D-2026-11-07-04](2026-11-07.md#d-2026-11-07-04) | Freeze the current MVP scope | approved | not applicable | none | All |
| [D-2026-11-07-05](2026-11-07.md#d-2026-11-07-05) | Payment amounts reuse the existing paid mark | approved | implemented | #479 | [Queue](../workstreams/queue.md) |
| [D-2026-11-07-06](2026-11-07.md#d-2026-11-07-06) | Public participant names are masked | approved | implemented | #475, #474 | [Queue](../workstreams/queue.md) |
| [D-2026-11-07-07](2026-11-07.md#d-2026-11-07-07) | Player invite links use player login until sign-up exists | approved | implemented | #476, #478; #477 blocked | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-08-01](2026-11-08.md#d-2026-11-08-01) | Where Admin Sales numbers are calculated | approved | implemented in source; SQL not yet verified against a database | #533, #540 (epic #504) | [Admin](../workstreams/admin.md) |
| [D-2026-11-08-02](2026-11-08.md#d-2026-11-08-02) | Player Compare data, rules and route | approved | implemented in source; SQL draft, verification pending | #525, #526, #541 (epic #502) | [Player](../workstreams/player.md) |
| [D-2026-11-08-03](2026-11-08.md#d-2026-11-08-03) | Profile pictures in Supabase Storage | approved | in progress | #522, #542 (epic #502) | [Player](../workstreams/player.md) |
| [D-2026-11-08-04](2026-11-08.md#d-2026-11-08-04) | Scheduled jobs: Supabase pg_cron calls protected Route Handlers | approved | not started | #545; #546, #547 blocked | [Backend](../workstreams/backend.md) |
| [D-2026-11-08-06](2026-11-08.md#d-2026-11-08-06) | Player access to public Queue sessions | approved | implemented in source; authenticated real verification pending | #569 | [Queue](../workstreams/queue.md) |
| [D-2026-11-09-01](2026-11-09.md#d-2026-11-09-01) | Next-match picker after every result | approved | in progress | #579 | [Queue](../workstreams/queue.md) |
| [D-2026-11-09-02](2026-11-09.md#d-2026-11-09-02) | Signed-in Players on the session page: full names and one-tap join | approved | in progress (mock app; real mode: join only) | #585, #687 | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-09-03](2026-11-09.md#d-2026-11-09-03) | Players check themselves in, leave, and say they can't make it | approved | in progress | #617, #619, #624, #626, #964, #968 | [Queue](../workstreams/queue.md) |
| [D-2026-11-09-04](2026-11-09.md#d-2026-11-09-04) | The player's live view: My night, Courts now, own standing, refresh only | approved | not started | needed | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-09-05](2026-11-09.md#d-2026-11-09-05) | Match requests | approved | not started | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-09-06](2026-11-09.md#d-2026-11-09-06) | Registration from session and club links, guest linking and club membership | approved | in progress | #622, #625, #627 | [Player](../workstreams/player.md), [Queue](../workstreams/queue.md) |
| [D-2026-11-09-07](2026-11-09.md#d-2026-11-09-07) | Public or private player profile | approved | in progress (three levels and the hide switch built in P08.5, #753; always-private rules in the services) | #753 | [Player](../workstreams/player.md) |
| [D-2026-11-09-08](2026-11-09.md#d-2026-11-09-08) | Sharing: links, QR codes and post/story images | approved | in progress (club invite code checked on the server in real mode, #755; Post image stays 1080 × 1350) | #620, #621, #624, #626, #755, #968 | [Player](../workstreams/player.md), [Queue](../workstreams/queue.md) |
| [D-2026-11-09-09](2026-11-09.md#d-2026-11-09-09) | Keeping the session page cheap to serve | approved | not started | needed | [Queue](../workstreams/queue.md), [Backend](../workstreams/backend.md) |
| [D-2026-11-09-10](2026-11-09.md#d-2026-11-09-10) | Uploaded pictures: keep only the current and the previous | approved | in progress | #619, #624, #626 | [Player](../workstreams/player.md), [Queue](../workstreams/queue.md), [Backend](../workstreams/backend.md) |
| [D-2026-11-09-11](2026-11-09.md#d-2026-11-09-11) | Session page and Queue refinements from the owner's artifact review | approved | in progress (Q18 Queue Master side in the mock app; request-format defaults decided 2026-11-10) | needed | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-09-12](2026-11-09.md#d-2026-11-09-12) | Club-set pictures for guests and unclaimed players | approved | in progress | #623, #628 | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-09-13](2026-11-09.md#d-2026-11-09-13) | Admin-managed profile character library | approved | in progress (mock app; real mode merged in #703, migration applied) | #644, #645, #646 | [Admin](../workstreams/admin.md), [Player](../workstreams/player.md) |
| [D-2026-11-09-14](2026-11-09.md#d-2026-11-09-14) | Admin edits everything on a player, with a beta-only password field | approved for MVP or beta only; signed off 2026-11-10 | in progress (mock app; real mode not started) | #647, #648, #649, #650 | [Admin](../workstreams/admin.md) |
| [D-2026-11-11-01](2026-11-11.md#d-2026-11-11-01) | Observability: OpenTelemetry traces to Grafana Cloud, plus a local Grafana stack | approved 2026-11-11 | implemented in the repository; Grafana Cloud stack and Vercel `OTEL_*` variables not set up yet | none | [Backend](../workstreams/backend.md) |
| [D-2026-11-11-02](2026-11-11.md#d-2026-11-11-02) | Join request: the player picks Join a slot or Be waitlisted, and can join from the waitlist | approved | in progress (mock app + real-mode services; migration applied 2026-11-11) | #706 | [Queue](../workstreams/queue.md) |
| [D-2026-11-11-03](2026-11-11.md#d-2026-11-11-03) | Guests and unclaimed profiles stay in their club | approved | in progress on Epic P08 (migration and services built, #749, #757; real-mode marker and history attribution still open) | #749, #757 | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-12-01](2026-11-12.md#d-2026-11-12-01) | Answers to the leftover questions of the November 11 round | approved 2026-11-12 | in progress on Epic P08, #748 | #748, #749–#759 | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md), [Admin](../workstreams/admin.md) |
| [D-2026-11-12-02](2026-11-12.md#d-2026-11-12-02) | Club members join upcoming sessions right away; the Always require a request switch | approved 2026-11-12 (open points to be confirmed by the owner) | in progress (#764; migration applied 2026-11-12) | #764 | [Queue](../workstreams/queue.md) |
| [D-2026-11-12-03](2026-11-12.md#d-2026-11-12-03) | Profile banner: 5:2, nothing overlaps it, banner dialog | approved 2026-11-12 (open points to be confirmed by the owner) | in the mockups and the mock app (#765); real mode shares the same services | #765 | [Player](../workstreams/player.md), [Admin](../workstreams/admin.md) |
| [D-2026-11-12-04](2026-11-12.md#d-2026-11-12-04) | Clubs on every readable profile; Leave club on the club page; no Report a problem | approved 2026-11-12 | in progress (#766) | #766 | [Player](../workstreams/player.md) |
| [D-2026-11-12-05](2026-11-12.md#d-2026-11-12-05) | Playwright regression suite on a throwaway local Supabase | approved 2026-11-12 | in progress (feat/e2e-regression) | none | [Queue](../workstreams/queue.md) |
| [D-2026-11-13-01](2026-11-13.md#d-2026-11-13-01) | Go API on Railway: API, database, sign-in and pictures off Vercel functions and Supabase; live updates | approved 2026-11-13 (B-01 to B-19) | not started | needed | [Backend](../workstreams/backend.md) |
| [D-2026-11-13-02](2026-11-13.md#d-2026-11-13-02) | Shared rule-cases package `@rotra/rule-cases` | approved 2026-11-13 | not started | needed | [Backend](../workstreams/backend.md) |
| [D-2026-11-13-03](2026-11-13.md#d-2026-11-13-03) | Stats on every profile dialog; Admin sets the default banner | approved 2026-11-13 | mockup only | needed | [Admin](../workstreams/admin.md) |
| [D-2026-11-13-04](2026-11-13.md#d-2026-11-13-04) | Profile card layout and display name (nickname first) | approved 2026-11-13 | mockup only | needed | [Player](../workstreams/player.md) |
| [D-2026-11-13-05](2026-11-13.md#d-2026-11-13-05) | Finished session page (Match history, Leaderboard tab); club profile cards | approved 2026-11-13 | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-13-06](2026-11-13.md#d-2026-11-13-06) | Sharing widened: any public profile, leaderboard, awards and Off Day; no QR on share images | approved 2026-11-13 | mockup only | needed | [Player](../workstreams/player.md) |
| [D-2026-11-13-07](2026-11-13.md#d-2026-11-13-07) | Generate matches leaves out players already in the Main Queue; fewer matches when too few are free | approved 2026-11-13 | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-13-08](2026-11-13.md#d-2026-11-13-08) | Which rules are shared, which move to Go, and deleting the TypeScript copies | approved 2026-11-13 | not started | needed | [Backend](../workstreams/backend.md) |
| [D-2026-11-14-01](2026-11-14.md#d-2026-11-14-01) | Shared queue rules: one Go copy, run on the device as WebAssembly (spike first) | approved 2026-11-14 (spike first; B-21 to B-23) | not started | needed | [Backend](../workstreams/backend.md) |
| [D-2026-11-14-02](2026-11-14.md#d-2026-11-14-02) | No show (cancelled): no fee, club-only, after Start only | approved 2026-11-14 | in progress | #839 | [Queue](../workstreams/queue.md) |
| [D-2026-11-16-01](2026-11-16.md#d-2026-11-16-01) | Google sign-in is mandatory for players; password players connect Google by a deadline | approved 2026-11-16 (deadline and password questions settled 2026-11-18; details open) | mock app behind the flag; real mode written, not run against Google (#922, pending #896); migration `20261118000200_player_google_sign_in` applied to the shared database | #892 | [Player](../workstreams/player.md) |
| [D-2026-11-16-02](2026-11-16.md#d-2026-11-16-02) | Player account verification (Google, phone, matching email) with an Admin override | approved 2026-11-16 (consequences open) | mockup only | #889 | [Player](../workstreams/player.md), [Admin](../workstreams/admin.md) |
| [D-2026-11-16-03](2026-11-16.md#d-2026-11-16-03) | Player notifications page | approved 2026-11-16 (delivery open) | mock and real modes in source | #890 | [Player](../workstreams/player.md) |
| [D-2026-11-16-04](2026-11-16.md#d-2026-11-16-04) | Player statuses: unclaimed needs an email and gets an RTR ID; lookup by RTR ID or email only | approved 2026-11-16 (phone lookup and old QR codes open; storage answered 2026-11-18) | mock data built (#923); real mode written (#927), migration applied locally only | #900 | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md), [Admin](../workstreams/admin.md) |
| [D-2026-11-16-05](2026-11-16.md#d-2026-11-16-05) | Three leaderboards: Top annual, Top monthly, Top weekly | approved 2026-11-16, clarified 2026-11-18; amended in part by D-2026-11-25-04 | in progress | #891 | [Player](../workstreams/player.md) |
| [D-2026-11-16-06](2026-11-16.md#d-2026-11-16-06) | Phones: stored as E.164, shown masked and in one format | approved 2026-11-16 | mock app (Player #904, Admin #911) | #893 | [Player](../workstreams/player.md), [Admin](../workstreams/admin.md) |
| [D-2026-11-17-01](2026-11-17.md#d-2026-11-17-01) | Privacy Policy and Terms of Service pages on the Player app | approved 2026-11-17 (legal review and details open) | in progress | none | [Player](../workstreams/player.md) |
| [D-2026-11-18-01](2026-11-18.md#d-2026-11-18-01) | Google sign-in ships behind a feature flag that starts off | approved 2026-11-18 (details open) | in progress | #938 (epic #892) | [Player](../workstreams/player.md), [Admin](../workstreams/admin.md) |
| [D-2026-11-18-02](2026-11-18.md#d-2026-11-18-02) | Fuller Privacy Policy and Terms of Service, also on rotra.club | approved 2026-11-18 (lawyer review and details open) | in progress | none | [Player](../workstreams/player.md) |
| [D-2026-11-18-03](2026-11-18.md#d-2026-11-18-03) | Club nickname: set by the Queue Master, shown on Queue Master screens only | approved 2026-11-18 (details open) | in mock app; real mode written (#927), migration applied locally only | #941, #942; real mode #927 (epic #900) | [Queue](../workstreams/queue.md) |
| [D-2026-11-18-04](2026-11-18.md#d-2026-11-18-04) | Scoring modes: a scoring mode per Queue Session and a match result that follows it | approved in part 2026-11-18 (details open) | in the mock app; real mode reads 16/31 and stores no game scores yet | #944 (#955, #956, #984–#988) | [Queue](../workstreams/queue.md) |
| [D-2026-11-18-05](2026-11-18.md#d-2026-11-18-05) | Session standings: players with the same wins and losses share a position | approved 2026-11-18 (details open) | mockup only | #961 | [Queue](../workstreams/queue.md) |
| [D-2026-11-18-06](2026-11-18.md#d-2026-11-18-06) | Record games: a Queue Session can run without recording its games | approved in part 2026-11-18 (details open); what Off does replaced by D-2026-11-20-02 | in progress: mock app; real mode written (#976), migration applied to the shared database 2026-11-19 | #961 | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-01](2026-11-19.md#d-2026-11-19-01) | Gender (optional) and the match category | approved 2026-11-19 (details open) | mockup only | — |
| [D-2026-11-19-02](2026-11-19.md#d-2026-11-19-02) | Live console tabs, the Settings tab, and one Share button | approved 2026-11-19 (details open) | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-03](2026-11-19.md#d-2026-11-19-03) | Correct Queue Time Format: minutes, then hours, then “long time ago” | approved 2026-11-19 (wording open) | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-04](2026-11-19.md#d-2026-11-19-04) | Every time input opens the time picker dialog | approved 2026-11-19 | mockup only | needed | All apps |
| [D-2026-11-19-05](2026-11-19.md#d-2026-11-19-05) | Live match controls: pause, move a playing match, swap partners, swap from match | approved 2026-11-19 (details open) | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-06](2026-11-19.md#d-2026-11-19-06) | Edit player during a session: one form, games played without a confirmation | approved 2026-11-19 (details open) | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-07](2026-11-19.md#d-2026-11-19-07) | Generate Queue exemption list | approved 2026-11-19 (details open) | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-08](2026-11-19.md#d-2026-11-19-08) | Regenerate is removed from the Main Queue | approved 2026-11-19 (rules cleanup open) | mockup only | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-09](2026-11-19.md#d-2026-11-19-09) | Embla Carousel for sliders | approved 2026-11-19 by the owner naming it (scope open) | mockup only (loaded from a CDN) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-10](2026-11-19.md#d-2026-11-19-10) | Player Home for signed-in players | approved 2026-11-19 by the owner | mockup only | needed | [Player](../workstreams/player.md) |
| [D-2026-11-19-11](2026-11-19.md#d-2026-11-19-11) | Invite-link onboarding and getting-to-know answers | approved 2026-11-19 by the owner | mockup only | needed | [Player](../workstreams/player.md) |
| [D-2026-11-19-12](2026-11-19.md#d-2026-11-19-12) | Session level restrictions | approved 2026-11-19 by the owner | data built (#1076); screens not built | #1071 | [Queue](../workstreams/queue.md) |
| [D-2026-11-19-13](2026-11-19.md#d-2026-11-19-13) | Player bottom dock on phones | approved 2026-11-19 by the owner | mockup only | needed | [Player](../workstreams/player.md) |
| [D-2026-11-19-14](2026-11-19.md#d-2026-11-19-14) | Higgsfield art inside the apps | approved 2026-11-19 by the owner | mockup only | needed | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-18-07](2026-11-18.md#d-2026-11-18-07) | A guest's invite link claims that guest's record | approved 2026-11-18 (details open) | mock app and real mode written, not run against a database yet | #966 (epic Q24) | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-20-01](2026-11-20.md#d-2026-11-20-01) | Google sign-in in real mode: the Admin link, the inviter on a session invite, one accepted risk | approved 2026-11-20 | in progress: written behind the flag (#922); migration `20261120000100_admin_link_registration` applied 2026-11-22 | #922 (epic #892) | [Player](../workstreams/player.md) |
| [D-2026-11-20-02](2026-11-20.md#d-2026-11-20-02) | Record games off: games recorded as usual; their wins don't count toward the leaderboards or win rate | approved 2026-11-20 (details open) | mockup only | needed | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-22-01](2026-11-22.md#d-2026-11-22-01) | Trusted club hosts and session host display | approved 2026-11-22 | implemented (mock app + real services: #1003 Club settings › Trusted hosts, #1004 session setup › Hosts, #1005 change hosts before and during the session, #1006 public Hosts section, #1007 Host badge on profile Clubs, #1008 finished sessions keep their hosts; migrations local only, not applied to the shared database) | #1003, #1004, #1005, #1006, #1007, #1008 (epic #1002) | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-22-02](2026-11-22.md#d-2026-11-22-02) | Payment status share: numbered Paid, Partial and Unpaid text in the Queue app and on the public session page | approved 2026-11-22 (#1015) | in progress: mock app and real mode written (not run against a database) | #1010 (epic #1009) | [Queue](../workstreams/queue.md) |
| [D-2026-11-22-03](2026-11-22.md#d-2026-11-22-03) | Slot transfer: the player requests, the Queue Master approves or rejects, before Start only | approved 2026-11-22 (#1009, #1015) | in progress: mock app and real mode written; migration applied to a local database only | #1011 (epic #1009) | [Queue](../workstreams/queue.md) |
| [D-2026-11-22-04](2026-11-22.md#d-2026-11-22-04) | Transfer links: a single-claim link for a recipient with no ROTRA account, first signed-in claimant, invalidation | approved 2026-11-22 (#1009, #1015) | in progress: mock app and real mode written; migration applied to a local database only | #1012 (epic #1009) | [Queue](../workstreams/queue.md) |
| [D-2026-11-22-05](2026-11-22.md#d-2026-11-22-05) | Slot transfer accounting: recipient Paid in Full, automatic waiver shown before Approve, cash never moves, immutable chain | approved 2026-11-22 (#1009, #1015), with assumptions | in progress: mock app and real mode written; migration applied to a local database only | #1013 (epic #1009) | [Queue](../workstreams/queue.md) |
| [D-2026-11-22-06](2026-11-22.md#d-2026-11-22-06) | Manual full refunds: Reject and refund with FIFO promotion, Refund everyone who paid after a cancellation, net kept cash | approved 2026-11-22 (#1009, #1015), with assumptions | in progress: mock app and real mode written; migration applied to a local database only | #1014 (epic #1009) | [Queue](../workstreams/queue.md) |
| [D-2026-11-22-07](2026-11-22.md#d-2026-11-22-07) | Club membership: automatic join on signup and transfer-link claim, leave anytime, rejoin on the same record, pending transfers cancelled on leave | approved 2026-11-22 (#1009, #1015), with assumptions | in progress: mock app and real mode written; no migration | #1018 (epic #1009) | [Player](../workstreams/player.md), [Queue](../workstreams/queue.md) |
| [D-2026-11-23-01](2026-11-23.md#d-2026-11-23-01) | Player lookup finds unclaimed players by name and shows their name and picture | approved 2026-11-23 | implemented (mockup, mock app, real services) | none | [Queue](../workstreams/queue.md) |
| [D-2026-11-23-02](2026-11-23.md#d-2026-11-23-02) | A social link is an entry key for an unclaimed player | approved 2026-11-22 | implemented (#1023, #1026); migration `20261123000100_shared_entry_social_key` applied 2026-11-23 | #1019 | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-23-03](2026-11-23.md#d-2026-11-23-03) | Add player › New player takes a phone and a profile picture, with the same fields in both contexts | approved 2026-11-23 | implemented (#1027, #1031) | none | [Queue](../workstreams/queue.md) |
| [D-2026-11-23-04](2026-11-23.md#d-2026-11-23-04) | The club gives a saved player a level outside a session | approved 2026-11-23 | implemented (#1028); migration `20261123000300_club_player_saved_level` applied 2026-11-23 | none | [Queue](../workstreams/queue.md) |
| [D-2026-11-23-05](2026-11-23.md#d-2026-11-23-05) | Unclaimed players saved by clubs have a public profile in the Player app | approved 2026-11-23 | implemented (#1029, #1032) | none | [Player](../workstreams/player.md) |
| [D-2026-11-23-06](2026-11-23.md#d-2026-11-23-06) | The waitlist is strictly first come, first served | approved 2026-11-23 | implemented (mockup, mock app, real services) | none | [Queue](../workstreams/queue.md) |
| [D-2026-11-23-07](2026-11-23.md#d-2026-11-23-07) | Admin and the public profile show who is verified | approved 2026-11-23 | implemented (mockups, mock app, real reads) | #1037, #1038 | [Admin](../workstreams/admin.md), [Player](../workstreams/player.md) |
| [D-2026-11-23-08](2026-11-23.md#d-2026-11-23-08) | Each scoring mode has an expected match length; the Playing court card shows the expected finish | approved 2026-11-23 | not started (mockup only) | Epic Q27 | [Queue](../workstreams/queue.md) |
| [D-2026-11-23-09](2026-11-23.md#d-2026-11-23-09) | Plan Ahead uses free players and players whose court is finishing soon, ranked together | approved 2026-11-23 | not started (mockup only) | Epic Q27 | [Queue](../workstreams/queue.md) |
| [D-2026-11-23-10](2026-11-23.md#d-2026-11-23-10) | The games badge opens a compact games dialog with Matches and Planned queue | approved 2026-11-23 | not started (mockup only) | Epic Q27 | [Queue](../workstreams/queue.md) |
| [D-2026-11-25-01](2026-11-25.md#d-2026-11-25-01) | Match making factors for Generate matches: Whose turn, Fresh faces, Even game | approved 2026-11-25 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-25-02](2026-11-25.md#d-2026-11-25-02) | "Almost done" switch on a Playing court card | approved 2026-11-25 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-25-03](2026-11-25.md#d-2026-11-25-03) | Handicap, tonight only, set by the Queue Master | approved 2026-11-25 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-25-04](2026-11-25.md#d-2026-11-25-04) | Four leaderboard periods for ROTRA and clubs, shared places, an always-on podium, full names on leaderboards | approved 2026-11-25 (top-50 cut-off with ties and the empty step look open) | not started (mockup only) | needed | [Player](../workstreams/player.md), [Queue](../workstreams/queue.md), [Ranking](../workstreams/ranking.md) |
| [D-2026-11-25-05](2026-11-25.md#d-2026-11-25-05) | Real-mode session page follows the mock: full roster and waitlist names when signed in, Payment per player, match name in View match | approved 2026-11-25 | written, not run | [403](../real-mode-ticket-drafts.md) | [Queue](../workstreams/queue.md), [Player](../workstreams/player.md) |
| [D-2026-11-25-06](2026-11-25.md#d-2026-11-25-06) | The regression suite runs on the Go API and a plain Postgres | approved | implemented (branch of #1097) | #1097 | Verification ([Queue](../workstreams/queue.md)) |
| [D-2026-11-26-01](2026-11-26.md#d-2026-11-26-01) | Session done deducts the planned shuttle tubes from inventory | approved 2026-11-26 | written, not run | none | [Queue](../workstreams/queue.md) |
| [D-2026-11-26-02](2026-11-26.md#d-2026-11-26-02) | Player navigation: a session button (Play, Ready, Next up) in the pixel style, and a Settings page | approved 2026-11-26 (Next up time window open) | not started (mockup only) | needed | [Player](../workstreams/player.md) |
| [D-2026-11-26-03](2026-11-26.md#d-2026-11-26-03) | Player Game page: the court beside a VS card, stats only for a tapped player | approved 2026-11-26 | not started (mockup only) | needed | [Player](../workstreams/player.md) |
| [D-2026-11-26-04](2026-11-26.md#d-2026-11-26-04) | Weekly Performance summary in one box | approved 2026-11-26 | not started (mockup only) | needed | [Player](../workstreams/player.md) |
| [D-2026-11-26-05](2026-11-26.md#d-2026-11-26-05) | Live session header trimmed to Match requests and Share; Payments becomes a console tab | approved 2026-11-26 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-26-06](2026-11-26.md#d-2026-11-26-06) | Court card: #N header and pills, status in the top right, Grid / Slide switch | approved 2026-11-26 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-26-07](2026-11-26.md#d-2026-11-26-07) | Edit player has Full name and Club nickname for every player | approved 2026-11-26 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-26-08](2026-11-26.md#d-2026-11-26-08) | Free court flow (pick or generate), Suggested match rework, stacked dialogs go back | approved 2026-11-26 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-26-09](2026-11-26.md#d-2026-11-26-09) | Queue player names read club nickname › nickname › full name everywhere | approved 2026-11-26 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-26-10](2026-11-26.md#d-2026-11-26-10) | Player status pill uses icons; Players card footer holds the status and Present | approved 2026-11-26 | not started (mockup only) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-27-01](2026-11-27.md#d-2026-11-27-01) | Payments: a player can play free, even after being marked paid | approved 2026-11-27 | implemented (mock app and real mode; migration applied) | none | [Queue](../workstreams/queue.md) |
| [D-2026-11-27-02](2026-11-27.md#d-2026-11-27-02) | Win chance on Queue Master match cards, Upset, and Even game by win chance | approved 2026-11-27 | built in the mockup, mock app and real mode (not run in a browser) | needed | [Queue](../workstreams/queue.md) |
| [D-2026-11-27-03](2026-11-27.md#d-2026-11-27-03) | Win chance in the Player app, with the breakdown dialog | approved 2026-11-27 | mockup only | needed | [Player Information](../workstreams/player.md) |

## Status conventions

Every decision entry must include:
- **Decision status:** `proposed` | `approved` | `deferred` | `canceled` | `superseded`.
- **Implementation status:** `not started` | `in progress` | `implemented` | `unknown` | `not applicable`. Only mark `implemented` after locating the code on `main`; otherwise use `unknown`.
- **Ticket:** `none` | `needed` | linked issue(s). A referenced epic does not mean the decision has its own implementation ticket.
- **Roadmap:** `MVP` | `post-MVP` | `out of scope`, plus the related workstream.
- **References:** relevant docs, code, issues, and any superseding decision.

**Workflow:** Record owner decisions promptly; do not turn suggestions into approved decisions. Check
existing issues before creating a new one. If approved MVP work lacks a ticket, mark `Ticket: needed`;
create/attach a ticket only under the repository's issue-creation rules. When code merges, update
implementation status, the index above and the workstream page. Canceled/deferred decisions stay
visible for history, and superseded decisions link their replacement. Never equate an approved decision
with implemented code. Audit findings go in a **Notes (audit …)** line; they never rewrite a decision.

## Entry template

```markdown
<a id="d-YYYY-MM-DD-NN"></a>
### D-YYYY-MM-DD-NN — <short title>
- **Decision status:** proposed | approved | deferred | canceled | superseded
- **Implementation status:** not started | in progress | implemented | unknown | not applicable
- **Ticket:** none | needed | #n
- **Roadmap:** MVP | post-MVP | out of scope — <workstream>
- **Decision:** <the owner's decision, in the owner's words>
- **Not in MVP / Out of scope:** <if any>
- **References:** <docs, code paths, issues, superseding decision>
```

Add the entry to `YYYY-MM-DD.md` for the decision's date (create the file if it is the first decision
of that day, with the heading `# MVP decisions — YYYY-MM-DD`), keep entries in ID order, then add a
row to the [index](#index) and link the entry from the workstream page as
`decisions/YYYY-MM-DD.md#d-yyyy-mm-dd-nn`.

## Admin implementation gap index

Moved to the [Admin workstream](../workstreams/admin.md#admin-implementation-gap-index).
