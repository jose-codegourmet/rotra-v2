# Queue

## Purpose

Record the mock Queue behavior built by epic Q18 (#586): the Requests sheet (#616),
the Checked in themselves mark (#617) and the match request formats (#618). This
specification describes this branch's implementation on mock data; the business docs
remain authoritative for product behavior and `apps/mockup/queue-app/rotra-queue.html`
for appearance and copy. Real mode does not read or decide requests and does not
persist `requestFormats` (there is no Prisma column).

## Requirements

### Requirement: Requests sheet with Join and Match tabs

The Queue app SHALL show one **Requests · N** button in place of every former
**Join requests · N** button, where N is pending join requests plus open drop-out
notices plus open match requests, taken from the session read's `requestCount`. It
SHALL open the Requests sheet with **Join** and **Match** tabs. The Preparation
card SHALL show while anything waits.

#### Scenario: Decide a join request
- GIVEN a pending join request from a ROTRA player
- WHEN the Queue Master opens Requests and picks a level
- THEN the card shows whether the player is already in the club or new to it, the
  shared rank hint and, if present, who invited them
- AND Confirm gives the player the slot, or the waitlist when slots are full
- AND Decline removes the request.

#### Scenario: Link a guest request to a saved player
- GIVEN a guest request whose phone matches a saved player
- WHEN the Queue Master selects Link
- THEN the toast "Linked to NAME" shows and confirming gives that saved player the slot
- WHEN the Queue Master selects Not them
- THEN the prompt is hidden.

#### Scenario: Handle a drop-out notice
- GIVEN a player said they can't make it
- THEN the Join tab lists them under "Can't make it" and the slot stays
- WHEN the Queue Master selects Remove from roster
- THEN the player leaves the roster and the slot frees
- WHEN the Queue Master selects Keep
- THEN the player stays on the roster.

#### Scenario: Add or decline a match request
- GIVEN an open match request on the Match tab
- WHEN the Queue Master selects Add to queue
- THEN a waiting match is added at the end of the Main Queue, protected like a manual
  match, with the toast "Match added to the queue"
- AND each Anyone spot is filled from present players not already named, fewest games
  (played plus queued) first, the same for every format size
- AND if the spots can't be filled, the toast says there are not enough present players
- WHEN the Queue Master selects Decline
- THEN the request closes with the toast "NAME's match request declined".

### Requirement: Checked in themselves and Left marks

The roster rows, roster cards and live Players cards SHALL show a muted line under
the presence control: "Checked in themselves" with the time while the player's own
I'm here stands, and "Left" with the time after their I'm leaving. The Queue Master's
last action SHALL win.

#### Scenario: Queue Master changes presence
- GIVEN a player with the Checked in themselves mark
- WHEN the Queue Master turns Present off or uses Mark all absent
- THEN the mark clears
- WHEN the Queue Master turns Present on or uses Mark all present on a player marked Left
- THEN the Left mark clears
- AND a later self check-in shows a new mark.

### Requirement: Request formats

The session setup SHALL offer a **Players can request** toggle per format (2 v 2,
1 v 1, 1 v 2, 3 v 3, 4 v 4, 5 v 5) stored as `requestFormats`. The Preparation Setup
card SHALL summarize the allowed formats. The owner decided the defaults on
2026-11-10 (option A).

#### Scenario: Default formats
- WHEN a new Queue Session is created, or one saved with no selection is opened
- THEN 2 v 2 is on, 1 v 1 follows the Singles switch, and 1 v 2, 3 v 3, 4 v 4 and
  5 v 5 are off.

#### Scenario: Turn formats on and off
- WHEN the Queue Master toggles a format
- THEN players can request only the formats that are on
- AND with none on, the setup shows that players can't send match requests.
