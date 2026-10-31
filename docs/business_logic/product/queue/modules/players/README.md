# Players and roster

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../app/mocksups-app/queue-app/rotra-queue.html).

## Entry and identity

The operator adds and confirms every slot. Confirmed players are remembered in a **saved club player list**, including name-only guests. This does not imply formal club membership.

Adding a player offers three sources, in this order:

| Source | Behavior |
|---|---|
| Saved players | Search by name, nickname, or RTR ID; exclude players already in the session. Unclaimed profiles always require identity confirmation. Otherwise add in one tap when a level exists; if no level exists, Confirm player requires choosing one |
| Player Information | Online only. Search by name or RTR ID; shows RTR ID and shared rank. Already-saved players are not repeated. Unclaimed profiles require identity confirmation; registered profiles with a level are added in one tap |
| New player | Name required; nickname and phone optional |

A name match is a suggestion, not proof of identity. To link an **unclaimed** Player Information profile, the operator confirms one of: **RTR ID matches**, **Scanned their QR**, or **Phone confirmed**. **Registered (claimed)** profiles need no identity check and no confirmation step: tapping one adds them at once at their Player Information level (decided October 26, 2026). The same one-tap add applies to saved club players who have a level; the level can still be changed in the roster before the session starts (in a live session it locks on entry). A **Confirm player** step appears for every unclaimed profile, whether picked from Player Information or from the club's saved players (identity check), and when the player has no level yet (the operator must choose one). Players hiding their phone show "Phone hidden by player"; an unclaimed one is confirmed by RTR ID or QR. The same phone number identifies the same profile across clubs. Lookup must respect hidden contact details.

Offline, Player Information search is unavailable. The operator adds the person as a new player; their profile can be linked after reconnecting.

## Saved player statistics

Owner decision, October 31, 2026 ([#301](https://github.com/jose-codegourmet/rotra-v2/issues/301)):
the Saved players overview counts all saved records belonging to the current club, independently
of its search and filters. It shows total players, registered (claimed) players, and counts by
Beginner / Intermediate / Advanced club playing level. Unassigned levels only count toward total
players. No identities are combined by name.

“New players this week” counts the first time the club saved each player (`addedAt` in the mock;
`added_at` in the proposed records), from Monday at 00:00 in Asia/Manila through now, inclusive.
Missing, non-finite and future dates do not count. Counts are derived, never persisted separately.
The mock seeds three recent additions when its fixtures load; a reload resets the in-memory store.

## Identity states

| State | Meaning |
|---|---|
| Registered | Claimed Player Information profile |
| Unclaimed | Phone-linked profile not yet claimed |
| Guest | Name only, no phone; stays a club guest |
| Lookup pending | New player entered with a phone; ROTRA matches or creates their profile when the session syncs |

Registered and unclaimed players with an uploaded picture show it. Guests and profiles without a picture show initials.

## Guests and incomplete profiles

- No phone number: retain a club/session guest; bypass automatic Player Information creation.
- Phone provided: match an existing profile or create the profile and permanent RTR ID as soon as the entry successfully syncs, without waiting for Session done (owner decision, October 28, 2026). Match performance still waits for valid finalization.
- On a later addition, prompt for missing details or provide a registration link.
- Claiming requires email and phone. Social links remain optional; Facebook is not required.
- Guest history stays with the club for return visits and local awards. After the guest's identity is confirmed and linked, earlier valid games also contribute to personal history and ranking under the existing eligibility/window rules (owner decision, October 28, 2026). Do not duplicate games or rewrite permanent outcomes. Confirmation evidence and mistaken-link handling remain open.

## Levels

- Every player, including guests, has one of the nine levels (Beginner/Intermediate/Advanced × Low/Mid/High), assigned by the operator. A level is required to confirm a slot.
- When Player Information has a suggestion, the level starts at that suggestion. The club may choose any level, including one far below the shared rank. Under each level the roster shows how it compares with the suggestion: **May be too high** (▲, N steps above), **May be too low** (▼, N steps below), or **Matches suggestion**. These are prompts only; the club's choice stands.
- Reassess **only while preparing a roster**. There is no unrestricted player-list or post-session reassessment editor.
- Saving an assessment immediately influences shared rank when synced; it does not wait for another completed session.
- Levels lock once the session starts. A late arrival gets a level on entry, locked for the remainder.
- There are no mid-session level changes.

See [shared rank](../../../player-information/modules/ranking/README.md).

## Slots and waitlist

Each session has a **slot budget**: players per reserved court (club default 8, set per session in setup) × courts. For example, 3 courts × 8 = 24 slots.

- While slots are open, adding a player confirms their slot.
- When every slot is taken, newly added players join a first-come **waitlist** with their level. They are not on the roster, can't be marked present, and play no games.
- The operator gives a waitlisted player a slot (**Give slot**), or fills every open slot from the front of the line (**Fill N open slots**). Giving a slot past the budget is allowed (**Give slot anyway**) and the confirmation says how far over budget the session is.
- Slots follow the court count, so adding courts or raising players per court opens slots. A player given a slot during a live session becomes present with their level locked.
- **First come, first served when a prepared session's budget changes** (decided October 26, 2026). Saving setup with fewer slots than confirmed players moves the most recently added players, beyond the budget, to the **front** of the waitlist in the order they joined (ahead of anyone already waiting). Saving with more slots fills them from the front of the waitlist. Roster order is the order players were added. This applies to prepared sessions; in a live session, removing courts does not unseat anyone.
- The waitlist is shown on the public Participants tab and in the `{{ waitlist }}` key of the Facebook post.

This is the operator's planning budget, not player self-admission: players never take a slot themselves. Guests can only **ask** for one through the session link (below).

## Join requests from the session link

Decided October 26, 2026.

- Every prepared or live session has a **session link**: its public page. The club shares it, for example in the Facebook post or a group chat.
- The public page shows **Want to play?** with how many slots are open, and **Request to join**. The quick form asks for a name (required), a nickname and phone (optional; the phone must be a full mobile number if given), and a self-declared level: Beginner, Intermediate, Advanced or Not sure.
- A request is **not a booking**. It holds no slot and is not on the roster or waitlist until the Queue Master acts on it.
- The Queue Master sees pending requests, oldest first, in preparation (a **Join requests** card) and in the live console (a **Join requests · N** button). Each shows the name, nickname, phone or “No phone given”, the self-declared level and the request time. The QM checks it is a legitimate guest (asks at the door, or matches name and phone), sets a level for this club, then **Confirm guest** or **Decline**.
- Confirming saves them as a club player (a guest, or lookup pending when a phone was given), and gives them a slot. When slots are full they go on the waitlist in request-time order (**Confirm to waitlist**). In a live session they are added present with the level locked, like any late player.
- A guest's own page then shows: **Request sent**, **Confirmed · you have a slot**, **Confirmed · waitlist #N**, or **Request not accepted**.
- The club can turn requests off per session (**Accept join requests**). The public page then says to contact the Queue Master instead.
- Sending a request needs internet (it goes straight to the server). Confirming or declining is an ordinary roster change that works offline on a downloaded session and syncs.


## Roster changes

- **During preparation**, players added are not yet present. The operator can remove a roster player, and the calculated minimum updates.
- **During a live session**, players added are present immediately and their level locks. Roster players cannot be removed from a live session; the operator turns presence off instead.

## Presence

The operator toggles present / not present, one at a time or with **Mark all present** / **Mark all absent** during preparation. Auto queue and Suggest use present players only.

Turning someone off never ends their current game. Waiting matches that include them **need attention**, and the confirmation says how many. The operator edits the lineup or regenerates.

There is no rest-status workflow. The console derives a **wait time** for each available player: minutes since their last game ended, or since they were marked present (or the session started) if they have not played. A substituted-out player's wait starts when their match ends.

See [add-player flow](flow/add-player.md).
