# Phase 3 (task 3.1): what the recaptured goldens changed

Recaptured on 2026-11-27 from the TypeScript on `go-stack` after the `origin/main` merge (#1177), on a throwaway `postgres:16-alpine` with all 61 migrations, `TZ=UTC`. Scripts run: `capture-claim`, `capture-signedin-{admin,player,profile,pubsession,queue}`, `capture-writes-player`, `capture-writes-profiles`. `capture-writes-queue` groups were recaptured with their tasks in Phase 2. Nothing was edited by hand.

**Reading the table.** One line per JSON path that differs between the committed golden and the new capture: `added` (the TypeScript now sends it), `changed` (the value differs), `length` (a list got longer or shorter). The number is how many cases show it. Only the biggest paths per file are listed (top 45); the golden files in git have the rest.

**Failing subtests in `go test` (auth/claim, playerwrites, signedin, publicreads), before and after the recapture:** 52 → 486.

| Test | Before | After |
|---|---|---|
| `TestClaimWritesGolden` | 16 | 0 (the recapture fixed it: the new `club_players` columns) |
| `TestClaimRoutesMatchRouteHandlers` | 0 | 7 (`preview.pictureSeedId`) |
| `TestNotificationsGolden` | 0 | 7 (reminder-read timing, see below) |
| `TestProfileGolden` (writes) | 0 | 57 (profile answer: gender, verified, shots, play style, favourite player) |
| `TestAdminReadsMatchRouteHandlers` | 0 | 21 |
| `TestPlayerReadsMatchRouteHandlers` | 0 | 22 |
| `TestProfileReadsMatchRouteHandlers` | 0 | 181 |
| `TestSessionPageReadsMatchRouteHandlers` | 4 | 67 |
| `TestQueueReadsMatchRouteHandlers` | 24 | 116 |
| `TestSessionReadsMatchRouteHandlers` | 3 | 3 (the no-ties standings `position`, Phase 2 note) |
| `TestPublicSessionMatchesTheRouteHandler` | 5 | 5 (unchanged: not recaptured here) |

## Where each difference comes from (grouping for 3.2 and 3.3)

1. **New columns only in database snapshots** (`club_players.saved_skill_level_id` and `saved_level_at`): claim, googleflow, register goldens. Additions; Go passes once the snapshot reads them (it does: these goldens are green).
2. **Player profile and gender** (D-2026-11-23-05/07, verified): `gender`, `verified`, `shots`, `shotsOther`, `playStyle`, `favoritePlayer`, `favoritePlayerOther` on every profile answer (writes and reads), `verification` and `gender` in the Admin player edit and list. → 3.2 (gender, verified) and 3.3.
3. **Win chance and Upset** (D-2026-11-27-02/03): `games[].games[].winChance`, `upset`, `games[].ranked` on the Player games read. → 3.3 (listed as a new gap after the main merge).
4. **Leaderboards** (D-2026-11-25-04): `leaderboardPlaces[].period`, `entries[].previousPosition`, `fullName`/`nickname` ordering, `hits[]`: four periods, shared places, full names. → 3.3, a real rule.
5. **Queue session reads**: `levelRestriction` (2.2, owner), `plannedBeforeStart` (done in writes in 2.3, reads still lack it), `handicapSpots` (2.5, owner), `courts[].position`, `matches[].almostDoneAt` (done for writes in 2.6, reads lack it), `recordGames` (2.10), `payments.players[].free/refund/transfer`, `payments.totals.waived/refunded`, `transfers`, `counts.transfers`, `cost.estimate.payers` (payments free and slot transfer: 2.12, owner), `roster[].form`, `details.level` and `details.picture` (2.7 leftovers).
6. **Public session** (`pubsession`): `levelBlock`, `hosts`, `waitlist`, `slotTransfer`, `canTransfer`, `queue[].label` (match name), `participant` on match players, `fullRoster`, `waitlistPosition` (the strict waitlist order, 2.9 on the signedin side).
7. **Notifications**: the Player notification list changed (9 cases longer; new kinds), and the reminder-read timing in `notifications.golden.json` (7 cases: `verification_reminder_read_at` and `updated_at`). → 3.3.

## Case-level detail (top paths per file)

```text
### auth/claim/testdata/claim.golden.json cases old 50 new 50 added 0 removed 0
  added       7  .body.link.preview.pictureSeedId
### playerwrites/testdata/claim.golden.json cases old 16 new 16 added 0 removed 0
  added      16  .db.club_players[].saved_skill_level_id
  added      16  .db.club_players[].saved_level_at
### playerwrites/testdata/googleflow.golden.json cases old 58 new 58 added 0 removed 0
  added      58  .db.club_players[].saved_skill_level_id
  added      58  .db.club_players[].saved_level_at
### playerwrites/testdata/notifications.golden.json cases old 45 new 45 added 0 removed 0
  changed     7  .db.player_accounts[].verification_reminder_read_at
  changed     7  .db.player_accounts[].updated_at
### playerwrites/testdata/profile.golden.json cases old 129 new 129 added 0 removed 0
  added      55  .steps[].body.profile.playStyle
  added      55  .steps[].body.profile.favoritePlayerOther
  added      55  .steps[].body.profile.shots
  added      55  .steps[].body.profile.gender
  added      55  .steps[].body.profile.verified
  added      55  .steps[].body.profile.favoritePlayer
  added      55  .steps[].body.profile.shotsOther
  added       2  .steps[].parallel[].body.profile.playStyle
  added       2  .steps[].parallel[].body.profile.favoritePlayerOther
  added       2  .steps[].parallel[].body.profile.shots
  added       2  .steps[].parallel[].body.profile.favoritePlayer
  added       2  .steps[].parallel[].body.profile.verified
  added       2  .steps[].parallel[].body.profile.gender
  added       2  .steps[].parallel[].body.profile.shotsOther
### playerwrites/testdata/register.golden.json cases old 182 new 182 added 0 removed 0
  added     182  .db.club_players[].saved_skill_level_id
  added     182  .db.club_players[].saved_level_at
### signedin/testdata/admin.golden.json cases old 141 new 141 added 0 removed 0
  added      12  .body.edit.verification
  added       8  .body.edit.gender
  added       7  .body.games[].ranked
  added       2  .body.players[].gender
  added       2  .body.players[].verification
### signedin/testdata/player.golden.json cases old 80 new 80 added 0 removed 0
  length      9  .body.notifications[]
  changed     8  .body.notifications[].title
  changed     8  .body.notifications[].kind
  changed     8  .body.notifications[].id
  changed     8  .body.notifications[].pinned
  changed     8  .body.notifications[].target
  changed     8  .body.notifications[].body
  changed     8  .body.notifications[].createdAt
  changed     8  .body.notifications[].readAt
  changed     7  .body.unreadCount
  added       6  .body.clubs[].isHost
### signedin/testdata/profile.golden.json cases old 423 new 423 added 0 removed 0
  added      67  .body.profile.playStyle
  added      67  .body.profile.favoritePlayerOther
  added      67  .body.profile.shots
  added      67  .body.profile.gender
  added      67  .body.profile.favoritePlayer
  added      67  .body.profile.shotsOther
  length     41  .body.profile.leaderboardPlaces[]
  changed    41  .body.profile.leaderboardPlaces[].period
  changed    40  .body.entries[].previousPosition
  added      36  .body.games[].games[].upset
  added      36  .body.games[].games[].winChance
  added      36  .body.games[].ranked
  added      35  .body.profile.verified
  changed    35  .body.entries[].fullName
  changed    34  .body.entries[].nickname
  changed    28  .body.profile.leaderboardPlaces[].wins
  changed    25  .body.profile.leaderboardPlaces[].position
  changed    22  .body.entries[].position
  changed    16  .body.hits[].previousPosition
  changed    14  .body.entries[].id
  changed    12  .body.total
  length     10  .body.hits[]
  changed     9  .body.standing.previousPosition
  changed     8  .body.standing.position
  changed     8  .body.entries[].levelHidden
  changed     8  .body.entries[].playingLevel
  changed     6  .body.hits[].position
  changed     3  .body.hits[].levelHidden
  changed     3  .body.hits[].wins
  changed     3  .body.hits[].id
  changed     3  .body.hits[].nickname
  changed     3  .body.hits[].masked
  changed     3  .body.hits[].fullName
  changed     3  .body.hits[].pictureUrl
  changed     3  .body.hits[].losses
  changed     3  .body.hits[].bannerKey
  changed     3  .body.hits[].playingLevel
  changed     3  .body.hits[].unclaimed
  length      1  .body.entries[]
### signedin/testdata/pubsession.golden.json cases old 140 new 140 added 0 removed 0
  added      46  .body.levelBlock
  added      24  .body.hosts
  added      24  .body.waitlist
  added      22  .body.slotTransfer
  added      22  .body.canTransfer
  length     18  .body.compare.viewer.profile.leaderboardPlaces[]
  changed    18  .body.compare.viewer.profile.leaderboardPlaces[].period
  length     18  .body.compare.other.profile.leaderboardPlaces[]
  changed    18  .body.compare.other.profile.leaderboardPlaces[].period
  changed    10  .body.fullRoster
  added      10  .body.queue[].label
  changed     4  .body.waitlistPosition
  added       2  .body.queue[].teamB[].participant
  added       2  .body.queue[].teamA[].participant
  length      2  .body.participants[]
  changed     2  .body.joinRequest.waitlistPosition
  added       1  .body.matches[].teamA[].participant
  added       1  .body.matches[].teamB[].participant
  changed     1  .body.to
  changed     1  .body.shared
  length      1  .body.matches[]
  length      1  .body.courtLabels[]
  changed     1  .body.total
  changed     1  .body.from
### signedin/testdata/queue.golden.json cases old 525 new 525 added 0 removed 0
  added      20  .body.recordGames
  added      14  .body.cost.estimate.payers
  added      14  .body.payments.totals.refunded
  added      14  .body.payments.totals.waived
  changed    13  .status
  added      12  .body.counts.transfers
  added      12  .body.transfers
  changed    12  .body.error.code
  changed    12  .body.error.message
  added      11  .body.session.levelRestriction
  added      11  .body.session.plannedBeforeStart
  added      11  .body.roster[].handicapSpots
  added      11  .body.payments.players[].refund
  added      11  .body.payments.players[].transfer
  added      11  .body.payments.players[].free
  added      10  .body.matches
  added       8  .body.courts[].position
  added       8  .body.roster[].form
  added       8  .body.details.picture
  added       8  .body.details.level
  changed     7  .body.waitlist[].clubPlayerId
  changed     7  .body.waitlist[].addedAt
  changed     7  .body.waitlist[].id
  changed     7  .body.waitlist[].level
  added       7  .body.noShows[].handicapSpots
  added       6  .body.sessions[].session.levelRestriction
  added       6  .body.sessions[].session.plannedBeforeStart
  added       6  .body.matches[].almostDoneAt
  changed     4  .body.players[].emailOnFile
  added       3  .body.sessions[].courts[].position
  changed     2  .body.player.fullName
  changed     2  .body.players[].fullName
  changed     2  .body.cost.estimate.collect
  changed     2  .body.cost.estimate.result.amount
  changed     2  .body.cost.estimate.players
  changed     2  .body.snapshot.standings[].position
  changed     2  .body
  changed     1  .body.cost.estimate.perHead
  changed     1  .body.cost.estimate.entrance
  changed     1  .body.cost.estimate.total
  changed     1  .body.cost.estimate.breakEven
  changed     1  .body.payments.totals.cost
  changed     1  .body.payments.totals.againstCosts
  changed     1  .body.payments.amountDue
```
