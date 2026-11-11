# Players and roster

**Last verified:** 2026-11-11 for stepping down to the waitlist, overfilling, join requests ending at Start and the participant profile card ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11)); 2026-11-06 for busy On court players; 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Confirmed v1 target rules. Updated October 26, 2026 to match the [ROTRA Queue prototype](../../../../../../apps/mockup/queue-app/rotra-queue.html).

## Entry and identity

The operator adds and confirms every slot. Confirmed players are remembered in a **saved club player list**, including name-only guests. This does not imply formal club membership. The operator can also add someone straight to the saved players from **Saved players › Add player**, with no session (Player Information or New player; the level is optional and becomes the saved level). A profile already saved, or a new player whose phone matches a saved player's private phone, is refused; same-name guests stay separate.

Adding a player offers three sources, in this order:

| Source | Behavior |
|---|---|
| Saved players | Search by name, nickname, or RTR ID; exclude players already in the session. Unclaimed profiles always require identity confirmation. Otherwise add in one tap when a level exists; if no level exists, Confirm player requires choosing one |
| Player Information | Online only. Search by name or RTR ID; shows RTR ID and shared rank. Already-saved players are not repeated. Unclaimed profiles require identity confirmation; registered profiles with a level are added in one tap |
| New player | Name required; nickname and phone optional. From Saved players (no session) the level is optional too |

A name match is a suggestion, not proof of identity. **Player Information search shows registered (claimed) players only**; guests and unclaimed profiles stay in the club that saved them and are never found by another club ([D-2026-11-11-03](../../../../../mvp/decisions.md#d-2026-11-11-03)). Unclaimed profiles are the club's own records, so they need no identity check (the earlier **RTR ID matches** / **Scanned their QR** / **Phone confirmed** step is withdrawn). **Registered (claimed)** profiles need no identity check and no confirmation step: tapping one adds them at once at their Player Information level (decided October 26, 2026). The same one-tap add applies to saved club players who have a level; the level can still be changed in the roster before the session starts (in a live session it locks on entry). A level step appears only when the player has no level yet (the operator must choose one). Players hiding their phone show "Phone hidden by player". The same phone number identifies the same **registered** player across clubs; an unclaimed profile never links to another club's record until the person registers. Lookup must respect hidden contact details.

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

Registered and unclaimed players show their saved profile picture (uploaded photo or selected character) in preparation roster list/grid views and Saved players, including the profile dialog. Character choices use the linked global player ID and profile name, not the club-local ID or nickname. Guests, profiles without a picture and failed images show initials. Returning to the tab refreshes these player reads so a changed picture can appear (#577). **Full photo** (owner decision, November 11, 2026, #716; [log](../../../../../mockup-changes/2026-11-11-queue-avatar-photo-viewer.md)): wherever an avatar shows a real picture (an uploaded photo or a chosen character, never initials), tapping it opens that picture at full size in a viewer; where a tap already opens a profile (roster faces, match tiles, participant tiles), the photo opens from the big picture inside the profile instead. Whoever can already see a picture can enlarge it; a picture masked for the viewer shows initials, so there is nothing to enlarge. The viewer stores nothing.

Saved players show a linked player's own name and nickname from their ROTRA profile, not the copy the club saved (owner decision, November 11, 2026, #705). When an unclaimed or registered player changes their name through the invite link (registration) or later in their profile, every saved-player card linked to that profile shows the new name and nickname on the next load or refresh; there is no live push. A guest has no linked profile, so their card keeps the name the club entered; independent registration (#490) never links or renames the guest record.

## Guests and incomplete profiles

- No phone number: retain a club/session guest; bypass automatic Player Information creation.
- Phone provided: match an existing profile or create the profile and permanent RTR ID as soon as the entry successfully syncs, without waiting for Session done (owner decision, October 28, 2026). Match performance still waits for valid finalization.
- On a later addition, prompt for missing details or provide a registration link.
- **Who issues registration links (owner decision, November 8, 2026):** the Queue Master, from **Invite** on an unclaimed saved player. The link opens the player's `/claim/<token>` page in ROTRA Player, lasts 7 days and works once. Issuing a new one cancels the earlier link (#244).
- **Deleting a saved player (owner decision, November 8, 2026):** any saved player (guest, unclaimed or registered) can be deleted. It removes them from this club only: they leave Saved players, its counts and Add player. Finished sessions, results, facts and their ROTRA profile and rank are untouched. In prepared and upcoming sessions their roster slot is released and any waitlist spot removed. In the Active Session they are marked not present, so waiting matches with them need attention; a player on court or playing cannot be deleted until that match is finished or substituted, and only this case asks for confirmation. Adding a deleted linked player again (Player Information or join request) restores the same saved player.
- **Club edits before inviting (owner decision, November 8, 2026):** for its own guests and unclaimed profiles the Queue Master can set name, nickname, level for this club and a phone when none is on file; for unclaimed profiles also email, playing style, experience and links. These prefill the player's registration, where the player can change them. A phone already on file is not changed here (ask ROTRA). Registered players own their details; the club cannot edit them. An email or phone that belongs to another profile is refused. ROTRA sends nothing; the Queue Master shares it. A guest's Invite opens independent registration at `/register/[clubId]` (#490, owner decision November 8, 2026). Registration keeps the guest record unlinked; a separate linking invitation is required. Matching phone/email prompts sign-in/recovery or contact correction/help, never an automatic merge.
- **Club-set pictures (owner request, November 9, 2026):** the Queue Master can set the profile picture of the club's own guests and unclaimed profiles: upload a photo, choose a character, or go back to initials. Only the current and the previous photo are kept, and **Use previous picture** swaps them ([D-2026-11-09-10](../../../../../mvp/decisions.md#d-2026-11-09-10)). The picture shows wherever that player appears for the club, including the public session page under the existing masking rules. Registered players own their picture; the club cannot change it. What happens to the picture when the player claims the profile is [open](../../../open-decisions.md).
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
- During preparation, when every slot is taken, newly added players join a first-come **waitlist** with their level. During an active Queue Session, the Queue Master may directly admit additional players above the budget, including walk-ins or any chosen waitlisted player; they become present and their level locks. Waitlisted players are not on the roster, cannot be marked present, and play no games until admitted.
- The operator gives a waitlisted player a slot (**Give slot**), or fills every open slot from the front of the line (**Fill N open slots**). Giving a slot past the budget is allowed (**Give slot anyway**) and the confirmation says how far over budget the session is.
- Slots follow the court count, so adding courts or raising players per court opens slots. A player given a slot during a live session becomes present with their level locked.
- **First come, first served when a prepared session's budget changes** (decided October 26, 2026). Saving setup with fewer slots than confirmed players moves the most recently added players, beyond the budget, to the **front** of the waitlist in the order they joined (ahead of anyone already waiting). Saving with more slots fills them from the front of the waitlist. Roster order is the order players were added. This applies to prepared sessions; in a live session, removing courts does not unseat anyone.
- The waitlist is shown on the public Participants tab (names masked, below) and in the `{{ waitlist }}` key of the Facebook post.
- **Stepping down to the waitlist (owner decisions, November 11, 2026, #735, [D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11); [log](../../../../../mockup-changes/2026-11-11-queue-roster-waitlist-overfill.md)).** An admitted player can go back to the waitlist, before Start and after Start. The Queue Master does it with **Move to waitlist** on the player's roster row or card (Roster and levels) and on the live Players card; a signed-in joined player does it for themselves with **Move me to the waitlist** on **My night**. The player goes to the **front** of the waitlist; their level and paid mark stay and come back if they regain a slot (the same rule as a demotion, [D-2026-11-11-06](../../../../../mvp/decisions.md#d-2026-11-11-06)). A player who is in any waiting, On court or Playing match **cannot** step down: the Queue Master gets “Finish or remove NAME's match first.”, and the player's own button is not shown while they are in a match (it shows again once their match is done) ([owner comment](../../../../../mockup-changes/2026-11-11-queue-roster-waitlist-overfill.md)). The button is not offered once the session is finalized.
- **Overfilling (same decisions).** Only the Queue Master can put someone on the roster beyond the slot budget. When the roster is full and the Queue Master adds a player (**Add player**, **Add late player**) or gives a slot anyway, a confirmation asks once, naming the new count and how **expected games** change; for **Add player** the other choice is **Add to waitlist**. After it the count reads over capacity (25/24, in the warning colour, “1 over capacity”) and new players still go on the waitlist. **Expected games** (“about low–high each”) are recomputed on every change of the roster count: overfill, step down, waitlist promotion, late add and removal. Still open: whether a stepped-down player's finished games stay in tonight's standings (the prototype leaves them out; the record keeps them).

This is the operator's planning budget, not player self-admission: players never take a slot themselves. Guests can only **ask** for one through the session link (below).

## Join requests from the session link

Decided October 26, 2026.

- Every prepared or live session has a **session link**: its public page. The club shares it, for example in the Facebook post or a group chat.
- The public page shows **Want to play?** with how many slots are open, and **Request to join**. The quick form asks for a name (required), a nickname and phone (optional; the phone must be a full mobile number if given), and a self-declared level: Beginner, Intermediate, Advanced or Not sure.
- A request is **not a booking**. It holds no slot and is not on the roster or waitlist until the Queue Master acts on it.
- The Queue Master sees pending requests, oldest first, in preparation (a **Requests · N** card for join requests and drop-out notices; N counts both). During play there are no join requests, and the live console's **Match requests · N** button (upper right) opens the Requests sheet with match requests only (see [Join requests end at Start](#join-requests-from-the-session-link) below). Each shows the name, nickname, phone or “No phone given”, the self-declared level and the request time. The QM checks it is a legitimate guest (asks at the door, or matches name and phone), sets a level for this club, then **Confirm guest** or **Decline**.
- Confirming saves them as a club player (a guest, or lookup pending when a phone was given), and gives them a slot. During preparation, when slots are full they go on the waitlist in request-time order (**Confirm to waitlist**). In an active session they were added directly, present with the level locked, even above the budget; that applied until [join requests ended at Start](#join-requests-from-the-session-link) (November 11, 2026). The Queue Master still adds a late player by hand during play.
- A guest's own page then shows: **Request sent**, **Confirmed · you have a slot**, **Confirmed · waitlist #N**, or **Request not accepted**.
- **Join a slot or Be waitlisted** ([D-2026-11-11-02](../../../../../mvp/decisions.md#d-2026-11-11-02), owner decision, November 11, 2026, #706): the **player** picks on the request, guest form and signed-in one tap alike, under **How do you want to join?**: **Join a slot** or **Be waitlisted**. Before start, while every slot is taken (roster at the slot budget), **Join a slot** is unavailable and the server refuses a slot request (“All slots are taken. Join the waitlist instead.”); only the waitlist remains. During play the Queue Master can admit additional players (the active-session rule above), so a slot request stays possible then. Every request still waits for the Queue Master, who sees the choice on the request (**Asks for a slot** / **Asks to be waitlisted**). Confirming honours it: **Be waitlisted** always lands on the waitlist, in request-time order, even during play; **Join a slot** keeps the rules above (a slot while one is open; before start, full again by the time the QM confirms means the waitlist, **Confirm to waitlist**; during play the QM may admit above the budget as before). A request from before this rule counts as **Join a slot**.
- **Join from waitlist** (same decision): a waitlisted signed-in Player may ask for a slot while slots are open (**Join from waitlist** on their Confirmed · waitlist #N card; “Slot requested”). It is a join request like any other, one open per account: the QM sees **Waitlist #N · asks for a slot** and **Give slot** (prepared) or **Admit player** (live). Before start it never overfills: if slots are full again when the QM confirms, the confirmation is refused (“Slots are full again. NAME stays on the waitlist.”) and the player keeps their place; during play the QM admits above the budget, as with **Admit player**. The player can **Cancel request** while it is pending. Guests on the waitlist ask the Queue Master, as before.
- **Join requests end at Start (owner decision, November 11, 2026, [D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11); [log](../../../../../mockup-changes/2026-11-11-queue-match-requests-live-only.md)).** Starting the session closes every pending join request (recorded `closed`, the Start toast adds “· N join requests closed”) and the public page then says “The session has started, so online join requests are closed. Ask the Queue Master at the venue to add you.” instead of **Request to join**, for visitors and signed-in players. This **overrides** the earlier rules on this page and in D-2026-11-11-02 that let guests ask, and let a waitlisted player use **Join from waitlist**, during play; **Join from waitlist** is therefore a before-Start request. The player's **Join a slot / Be waitlisted** choice and every before-Start rule stay as written. There is no Match/Join split any more: before Start the Requests card holds join requests and drop-out notices only; after Start the Requests sheet holds match requests only.
- The club can turn requests off per session (**Accept join requests**). The public page then says to contact the Queue Master instead.
- Sending a request needs internet (it goes straight to the server). Confirming or declining is an ordinary roster change that works offline on a downloaded session and syncs.
- **Cancelled session** (owner decision, November 6, 2026): cancelling closes every pending request (kept on the record as closed), and the public page shows **Cancelled** with the reason instead of **Want to play?**, so no new requests can be sent. See [Cancelling a session](../sessions/README.md#cancelling-a-session-owner-decision-november-6-2026).
- **Signed-in ROTRA Players** ([D-2026-11-09-02](../../../../../mvp/decisions.md#d-2026-11-09-02), [D-2026-11-09-06](../../../../../mvp/decisions.md#d-2026-11-09-06)): the sheet offers **Continue as guest**, **Log in with ROTRA Player** and **Register with ROTRA** (registration under the session's club, returning signed in with the request ready). A signed-in Player sends **Request to join as NAME** with one tap and no form; the request carries their account. One open join request per account per session; the player can **Cancel request** while it is pending. The QM's request card shows “ROTRA player · already in your club” or “new to your club” and their shared rank as a hint, and “Invited by NAME” when they came through a Session invite ([D-2026-11-09-08](../../../../../mvp/decisions.md#d-2026-11-09-08)). The QM still sets the level and confirms or declines; logging in never grants a slot. The session page always shows who is signed in (owner request, November 10, 2026): **Log in** when nobody is, otherwise the Player's name with **My ROTRA profile** and **Sign out**. There is one ROTRA Player sign-in per device, so **Sign out** on the session page signs the Player out of ROTRA Player too; a request already sent stays sent. Finishing a session closes every pending join request (kept, not shown).
- **QM side** ([D-2026-11-09-05](../../../../../mvp/decisions.md#d-2026-11-09-05), changed November 11, 2026 by [D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11)): the **Join** and **Match** tabs are gone. Before Start the **Requests · N** card lists join requests, with drop-out notices at the top as “Can't make it · N”. After Start the **Match requests · N** button on the live console lists match requests only. Counts arrive with the QM's existing refresh. Confirming a ROTRA player who is new to the club saves them as a registered saved player marked “Joined via session link” ([D-2026-11-09-06](../../../../../mvp/decisions.md#d-2026-11-09-06)).
- **Club invite link** ([D-2026-11-09-08](../../../../../mvp/decisions.md#d-2026-11-09-08)): the club has one standing link (`/register/[clubId]`), shared from club settings or the dashboard as a link, QR or Post/Story image. A new person who registers through it joins the club's Saved players; a signed-in ROTRA player who opens it sees “Join <club>?” and joins with one tap. **Regenerate link** replaces the code, so the old link and its images stop working; people who already joined keep their place.
- **Guest linking by the QM** ([D-2026-11-09-06](../../../../../mvp/decisions.md#d-2026-11-09-06)): when a guest request's phone matches a saved player (never a registered one), the card asks “Is this NAME from your saved players?”; **Link** attaches the request to that record so confirming it gives that player the slot, **Not them** hides the prompt. From a guest's saved record, **Link to saved player…** lets the QM pick the saved player the guest really is; the guest's slots, games and payments move to that record and the guest row is hidden. Nothing merges automatically, and earlier valid games then count as the October 28, 2026 decision says.

## Public participant names

Owner decision, November 7, 2026 (#475).

- Narrowed by [D-2026-11-09-02](../../../../../mvp/decisions.md#d-2026-11-09-02) (November 9, 2026): the masking below applies to anyone who is not signed in. A signed-in ROTRA Player sees registered players' full names with the nickname under them, on the participants grid, the waitlist, Courts now and the Queue; guests and unclaimed profiles stay masked for everyone. Signing in also removes the three-row roster cap (the viewer need not be confirmed). There is no privacy setting for this in v1; the registration form says “Your full name shows to signed-in ROTRA players on sessions you join.”
- The public page (and the operator's preview of it, and the record's **Public page** tab, which show
  what visitors see) never shows a participant's full name. Each whitespace-separated word becomes
  its first letter plus a fixed `***`: “Jose Adrian” → “J*** A***”, “Mika” → “M***”. The fixed
  suffix never reveals how long a name is. A missing or blank name reads “Player”.
- This applies to confirmed participants and the waitlist. A nickname, if it is ever shown
  publicly, is masked the same way.
- Masking happens on the server: the full name never enters the public page payload, tooltips or
  accessibility labels. The avatar's initials come from the masked name.
- Owner decision, November 8, 2026: the public page shows each confirmed participant's level as a thick colored ring (with a small gap) around their picture (blue Beginner, yellow Intermediate, red Advanced; hovering shows “Beginner Mid”), not as text. This replaces the earlier rule that the page never tied a participant to a level. A participant with no level shows no level label. The waitlist still shows masked names only.
- For a signed-in Player, a registered participant's tile linked to that player's ROTRA profile by RTR ID (owner request, November 9, 2026). **Changed November 11, 2026** ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11), #731/#715; [log](../../../../../mockup-changes/2026-11-11-queue-participant-profile-tap.md)): every participant tile, on the Participants grid and the waitlist, is a button for a signed-in ROTRA player (in this session or not) and opens a **profile card** inside the page instead of leaving it. The card shows what that player's own profile settings allow:
  - **Registered, public or private:** the full card: banner, picture (tap for the full photo), name with nickname, **Registered**, level badge, a **Tonight ·** status taken from the live session (Playing · Court N, On court · getting ready · Court N, Queued · #N, Free, Away; none when they are not on tonight's roster), **About** (Registered in, RTR ID) and **Stats · last 90 days** (games, wins, losses, win rate, or “No games yet”), with **Open ROTRA profile**. A player with Private visibility is shown to signed-in players, as decided on November 9.
  - **Always private:** only the picture and banner are public. The card shows them with the masked name, a **Private profile** chip and a **Private** section: “This player has chosen to keep their ROTRA profile private. You can see their picture and banner; their name, level and games stay between them and the Queue Master.” No level, status, About or Stats. Their tile shows their real picture to signed-in viewers, not initials. This overrides the #715 proposal that always-private hides the picture too.
  - **Guest or unclaimed (no ROTRA account):** a card with a **Not on ROTRA yet** chip and a **Guest** section: “This player is playing as a guest and hasn't registered with ROTRA yet, so there's no profile to show. The club keeps their games for when they do.”
  - **The viewer's own tile** always opens their own full card, whatever their visibility (“NAME (you) · view your profile”), including in the waitlist.
  Visitors who are not signed in and guests still see plain tiles. Profile visibility itself (Public, Private, Always private; Hide me from Player Information) is owned by [Player Information](../../../player-information/README.md).

## Public skill mix

Owner request, November 7, 2026 (#474).

- The public page shows how many confirmed participants are Beginner, Intermediate and Advanced,
  plus how many have no level yet, as one aggregate **Skill mix** bar. The bar itself is counts only (hovering a segment shows its count, never
  names). Since November 8, 2026 each participant also shows their own level; the list is still not
  grouped or ordered by level.
- Scope: exactly the confirmed participants the public list shows (never the waitlist or join
  requests). Each level maps to its skill group the same way as the roster's **Group by: Skill
  group**; a missing level counts as **No level**, never as a guess.
- The server (and the mock server) computes the counts. The public page payload carries each confirmed participant's masked name and level label, never the full name.
  The participant list keeps roster order (when each person was confirmed).
- Hidden when nobody is confirmed. It refreshes with the public page itself.
- The **Has a ROTRA profile** label is no longer shown on the public page (owner request, November 8, 2026); the level takes its place.
- A visitor's own request status (**Request sent**, …) may still show the name they typed.
- Operator screens (roster, live console, join requests) keep full names. Published result slides
  are not covered by this rule.


## Roster changes

- **During preparation**, players added are not yet present. The operator can remove a roster player, and the calculated minimum updates.
- **During a live session**, players added are present immediately and their level locks. Roster players cannot be removed from a live session; the operator turns presence off instead, or steps the player down to the waitlist when they are not in a match ([Slots and waitlist](#slots-and-waitlist)).

## Presence

The operator toggles present / not present, one at a time or with **Mark all present** / **Mark all absent** (neither is shown before Start session, #704). Generate matches and Suggest use present players only.

**Owner decision, November 11, 2026 (#704):** the preparation roster shows no Present switches before Start session; they show once the session has started, on any roster surface, including Preparation reached again from a live session. Hiding the switches and the Mark all buttons changes no presence value, model or live behavior; existing presence is kept.

**Owner decision, November 1, 2026 (#324):** individual presence switches update immediately and save wanted end states together after 800 ms without another tap. One batch produces one summary confirmation and one Roster sync entry; reversals before saving are omitted. A failed batch preserves newer intent while rolling back its failed revisions. Pending writes flush before other roster operations.

**Owner decision, November 11, 2026 (#718):** adding a player (saved player, Player Information profile or new guest), removing a roster player, and accepting or declining a join request apply to the roster at once and save together after the same 800 ms without another tap, in preparation and live, as one request in click order; the server applies the whole burst in one transaction, all or nothing. Add then remove of the same player before saving sends nothing for that player; accept then decline (or the reverse) of the same request sends the last decision. A refused burst takes back only that burst's changes, keeps later taps, and shows one error with the server's reason. Remove keeps its per-item confirmation; the batch adds none. Present switches, inventory and payments keep their own batches.

Turning someone off never ends their current game. Waiting matches that include them **need attention**, and the confirmation says how many. The operator edits the lineup or regenerates. An **On court** match (placed, not started) that includes them shows the reason on its court, and Start match stays disabled until the operator replaces the player or sends the match back to the queue (owner decision, November 6, 2026).

Players in an On court match are **busy**, like players in a Playing match: they cannot be put on another court or start elsewhere ("Migs is on Court 1").

## Games played override (#717)

**Owner decisions, November 11, 2026.** During a live session the Queue Master can set a player's **games played**, or set every roster player's games played to the same number, from the Players tab (**Set games played…** on a card, **Set games for all…** in the header). Both go through the confirmation [D-SET-GAMES](../../../../../screens/product/dialogs.md#d-set-games--set-games-played) first.

- The override is stored on the shared session as an **adjustment** per roster entry (`games_adjustment` = requested − games counted from completed matches at override time), never as an absolute number, so games keep counting up after the override. Games played shown anywhere = counted games (existing completed-match and substitute-credit rules) + adjustment, floored at 0. The adjustment itself may be negative.
- "Set all" means every roster player shows the same number N; the sheet prefills the roster's median count. A single-player override prefills that player's current count. Range 0–99.
- Generate matches (Available Players, Plan Ahead, Longest Wait, Fewest Games loads and the Catch Up target), fewest-games sorting (the Players tab sort, the picker order, filling “Anyone” spots on a match request), the Players tab cards (**played** and **for the night**) and the live Leaderboard's Games column read the adjusted count immediately. Wins, losses and head-to-head come from recorded matches only; the adjustment adds no result.
- Facts, results, rank and long-term performance are unchanged: the adjustment is a session-running aid, not a recorded game. Whether the Session done minimum-games check should read the adjusted count is not decided; it reads counted games.
- It is an ordinary Roster write: offline on a downloaded session it saves on the device and syncs later, like presence.

There is no rest-status workflow. The console derives a **wait time** for each available player: minutes since their last game ended, or since they were marked present (or the session started) if they have not played. A substituted-out player's wait starts when their match ends.

See [add-player flow](flow/add-player.md).

### Self check-in, I'm leaving, I can't make it ([D-2026-11-09-03](../../../../../mvp/decisions.md#d-2026-11-09-03))

- During a live session, a confirmed signed-in Player who is not present taps **I'm here**; Present is set directly. The roster shows a small “Checked in themselves · TIME” mark and the QM can undo it with the ordinary Present switch (turning Present off clears the mark; a later self check-in shows a new mark). The club setting **Players can check themselves in** (Session defaults, default on) turns it off: the session page then says “Ask the Queue Master to mark you present.” A tap only: no location check, no venue QR.
- The QM's last action wins. A self check-in after the QM turned Present off is a new check-in with the mark. If the QM is offline, the player's page says “Checked in · the QM will see it when their device syncs” and the roster shows it after the next sync.
- **I'm leaving** turns Present off and tells the QM; the page then says “You've left · tap I'm here if you come back” and the roster shows “Left · TIME” until Present is set again. No separate break control.
- **I can't make it** (confirmed, before start) sends a **drop-out notice** the QM sees under Requests (Join tab, “Can't make it · N”: “Says they can't make it · TIME”). The QM taps **Remove from roster** (frees the slot, the existing removal) or **Keep** (closes the notice, the player stays). The slot never frees by itself; players never take or release slots themselves. One open drop-out notice per player.
- The server checks every Player-side write (check-in, I'm leaving, match request, drop-out notice): the signed-in Player must be linked to an unreleased roster slot in that session.
- Finishing a session closes every pending drop-out notice, match request and join request; they stay on the record, hidden.
- Guests get none of this: the request status card plus “Register to check in and see your matches.”


## Player access from the session link (#569)

Owner decision, November 8, 2026: **Queue for any signed-in Player; full roster only for confirmed
participants. Preserve individual level rings.** The ring decision supersedes #569's earlier request
to hide individual levels. All participant and waitlist names remain masked, including the full roster.
**Superseded in part on November 9, 2026** by [D-2026-11-09-02](../../../../../mvp/decisions.md#d-2026-11-09-02): names and the roster cap now follow [Public participant names](#public-participant-names); the Queue and login round-trip rules below stand. [D-2026-11-09-04](../../../../../mvp/decisions.md#d-2026-11-09-04) adds **Courts now** and the **My night** card (own standing only, refresh only, no live updates) to the signed-in page.

- Any enabled registered Player account can read this public session's **waiting queue**, in queue
  order: position, format and masked lineups with playing levels. This is a read-only copy of the last
  synced state, not the club console: no presence, games/results, operator notes, contacts or actions.
- Full roster means removing the participant tile cap. Eligibility requires an unreleased roster
  entry linked through the club player to the authenticated Player profile. A pending request,
  waitlist position, matching name, browser player ID or registration alone does not qualify.
- Anonymous and nonparticipant reads return at most 12 participant tiles, plus the total count. The
  phone layout still shows at most nine. Names stay masked; aggregate skill mix and rings stay visible.
  The waitlist remains the existing masked public projection and does not grant full-roster access.
- Signing in and registering never reserve a slot, confirm a request, link a guest, or grant club
  operating authority. The existing guest form and visitor receipt remain independent of Player access.
- Login and invitation registration/claim return to the same public session and tab. Unsent request
  fields and its retry ID stay temporarily in that Queue tab's sessionStorage (30 minutes); they are
  cleared after send/cancel. No password, auth token or admission evidence is stored in this context.
