# Queue

## Purpose

Record the mock Queue behavior built by epic Q18 (#586): the Requests sheet (#616),
the Checked in themselves mark (#617) and the match request formats (#618). This
specification describes this branch's implementation on mock data; the business docs
remain authoritative for product behavior and `apps/mockup/queue-app/rotra-queue.html`
for appearance and copy. Real mode (November 12, 2026) persists `requestFormats`
(`queue_sessions.request_formats`) and runs match requests on the server with the same
rules: the Player app's `…/match-request` routes send, cancel and read them, the Queue
app's `GET …/requests` reads them with the live session read's `requestCount`, and
`POST …/match-requests/{id}/add` / `…/decline` decide them (Add to queue then runs Auto
Queue like any add). They close by themselves when anyone named stops being present and
when the session finishes, is marked invalid or is cancelled. In real mode the Requests
read carries match requests only; join requests come from the roster read.

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

### Requirement: Club-set profile pictures

Edit details on a Saved players row SHALL show a **Profile picture** field only for
**Guest** and **Unclaimed** players. A registered player keeps their own picture, and
Edit details does not open for them. The picture is an uploaded photo, a character
from the library, or initials, and each change applies at once, independent of
**Save details**.

#### Scenario: Upload a photo
- GIVEN a guest saved player in Edit details
- WHEN the Queue Master chooses Upload photo and picks an image up to 4 MB
- THEN the photo becomes the player's picture and the toast reads "Picture updated · NAME"
- AND a file that is not an image shows "Choose an image file"
- AND an image over 4 MB shows "Choose an image under 4 MB"
- AND an image that cannot be read shows "That image could not be read".

#### Scenario: Remove keeps the photo as previous
- GIVEN an unclaimed saved player with a photo
- WHEN the Queue Master chooses Remove
- THEN the player shows initials, the toast reads "Using initials · NAME"
- AND the removed photo becomes the previous picture.

#### Scenario: Use previous picture swaps
- GIVEN a saved player with a current and a previous picture
- WHEN the Queue Master chooses Use previous picture
- THEN the two pictures swap and the toast reads "Previous picture restored · NAME"
- AND only the current and the previous picture are kept.

#### Scenario: Pick a character
- GIVEN the character picker in Edit details
- WHEN the Queue Master opens it
- THEN it shows 8 characters per page with a pager
- AND choosing one sets it as the current picture without a file.

#### Scenario: Registered players
- GIVEN a registered saved player
- WHEN the Queue Master opens their row
- THEN no Edit details control shows that changes their picture.
