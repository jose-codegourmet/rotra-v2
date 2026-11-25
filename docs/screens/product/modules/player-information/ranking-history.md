# Leaderboards, rank explanation, and game history

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Surfaces:** `P-LEADERBOARD`, `P-RANK-DETAIL`, `P-ELIGIBILITY`, `P-MATCH-HISTORY`.

**Source:** [ranking rules](../../../../business_logic/product/player-information/modules/ranking/README.md).

## P-LEADERBOARD — ROTRA leaderboards

Public without sign-in. **Top annual** is the default. The **Top annual · Top monthly · Top weekly**
switch sits below the page title with the period and comparison, e.g. “2026 · compared with last
year”, “November 2026 · compared with last month” or “Nov 16 to Nov 22 · compared with last week”.
Labels use the calendar in Asia/Manila. [Decision](../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-05) ·
[Prototype change](../../../../mockup-changes/2026-11-16-player-leaderboard-periods.md).

The selected period drives the podium, **Your position** card, search and list. Each row shows the
place, movement mark, picture, name and “N wins”. On a phone, wins sit under the name. The heading
reads # · Player · Wins. The podium replaces rows 1–3 when there are at least three players and no
name search. When all 50 places are filled, the footer starts at “Showing 1–25 of the top 50” with
**Show 25 more**. A shorter list gives its actual number of places. Name search covers all publicly
readable names and nicknames in the selected top 50 and retains each hit's place. No hits reads `No one
in the top 50 matches “name”.` Entering a full RTR ID can open a profile outside the top 50.

Movement compares places with the previous calendar period. The mark is an up arrow with the number
of places, a down arrow with the number, a dash for no move or **New** for a player with no place in
the prior top 50. Pointing at the mark or focusing the row shows the earlier place where available.
The same words are included in the row's accessible name.

A signed-in player in the selected top 50 sees “Your position this month”, their place and wins,
the movement sentence, and **Show my row**. A player with qualifying matches below place 50 sees
“You're not in the top 50 this year” with their wins and place 50's wins. The card mentions a better
win rate only if it decided the tie. A player with no qualifying matches sees “You haven't played a
standard match this week yet” (with the selected period) and **Open my profile**. A profile link can
select the period and focus and flash the player's row using `/?period=month&player=<id>`, loading
the second page when needed.

A row or podium place opens the profile dialog. For visitors, a **Private** player's name is masked
(“Jose Adrian” → “J*** A***”), their picture shows the mask's initials, the place is unavailable as
a button and the name cannot be found by search. A private RTR ID shows the same “Profile not found”
as an unknown ID. **Always private** players keep their public picture and banner, with a masked
name and only the private dialog available to other viewers. Their own row is shown in full.
[Private visibility](../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-07) ·
[Always private](../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11).

An unclaimed player saved by one club is public and has a **Not registered yet** chip on their
leaderboard row. Their row opens the profile dialog. A person saved by more than one club joins the
list after registering. [Unclaimed players](../../../../mvp/decisions/2026-11-16.md#d-2026-11-16-04).

**Who appears here** explains standard matches, the calendar resets, tie-breaking by win rate,
excluded matches and sessions, movement marks and unclaimed players. **How ranks work** opens the
separate skill rank explanation.

States include loading, an empty period (“No one on the leaderboard has played a standard match
this week yet.”), fetch failure with **Try again**, refresh in progress and a cached copy while
offline. Pull down from the top or return to the tab to refresh the selected list, active search and
signed-in place at most once every 10 seconds. The refresh pill reports the live state.
[Pull-to-refresh change](../../../../mockup-changes/2026-11-12-player-pull-to-refresh.md).

## P-RANK-DETAIL — Explain the shared rank

Explain the two inputs in plain language:

- Current default 70%: each club's latest assessment within the last three months, with equal weight per club.
- Current default 30%: eligible match performance in the same window, accounting for assigned levels and partner/opposition context; optional scores add evidence.

Use configured weights if changed. Do not publish raw invented numerical components when the underlying formula is unresolved. Global rank is not simply total wins or average category ordinal.

Explain that each club can assign its own local level and that the operator's local judgment controls pairings. Their roster assessment can update shared rank on acceptance/sync; game-performance updates follow valid Session done. Neither is dependent on public slide sharing.

Whether individual clubs' assessments are publicly itemized is undecided. The explanation can describe the method without exposing unapproved club-by-club details or private operator notes.

## P-ELIGIBILITY — Shared rank progress and leaderboard places

The own profile and readable public profiles show **Shared rank**, the skill label and its status,
**How this rank works**, and **Share** on the own profile when ranked. While a rank is Provisional,
the explanation shows the number of standard matches toward the skill rank threshold in the last
three months. After three months without play the old label remains visible with **Needs
reassessment** and the profile explains the fresh club assessment. See [profile states](profile.md#profile-states).

**Leaderboards** appears above the shared rank only when the player places in at least one of the
three top 50 lists. Each box shows the list name, place and period wins. Opening it selects that
period and scrolls to and highlights the player's row. Places follow the calendar leaderboard rules
independently of the skill rank or its progress.

## P-SESSIONS — Every session a player joined

Route `/player/players/<id>/sessions` (owner artifact comment, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-player-recent-sessions-games.md)). Reached from **All sessions (N)** on the profile's Recent sessions card. Back link to the profile, the player's name as a label, **Sessions**, “Every club session NAME played in, newest first. Tap one to see the matches.” (“you” on your own), then one card listing every session the player played in: date block, title, “date · club”, counted record (W in the accent, L in the error colour) and “N matches”, a chevron; a row opens the session's matches dialog. Empty: “No sessions joined yet.” A private profile shows the private gate, like Games.

## P-MATCH-HISTORY — Read-only recorded games

**Weekly performance** (owner artifact comment, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-player-weekly-performance.md)): on the Games page, between the page head and the tabs (so on both tabs), a card titled with the year, **2026 Weekly Performance**, four tiles (Games, Record, Win rate, Best day), then seven columns, Sunday to Saturday (SUN … SAT): the win-rate pill (“—” with no games), two bars side by side, wins in the accent and losses in the error colour, each with its count above, and the day. Tapping a bar filters the games below to that weekday's wins or losses (“Showing Saturday wins” with **Clear**; tap again to clear). The best weekday (highest win rate with at least 3 games) is in the accent. Legend: Won, Lost, “Tap a bar to see those games · counted games this year” (on the profile’s read-only copy: “Singles and doubles this year”); each bar’s height is its count against the largest single count. Counted games this calendar year only; hidden when there are none.

**Three sessions per page** (owner artifact comment, November 13, 2026): the Games page lists three sessions per page with **Newer** · “Page N of M · K sessions” · **Older** under the list.

**Game row as a court** (owner, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-player-game-row-court.md)): every game row in ROTRA Player (Games page, Recent games, the session matches dialog) is a small badminton court drawn like the Queue app's courts (court green, white lines, dashed net; names on dark pills): the player's side on the left (the player — “You” on your own — and their partner), the opponents on the right, each a 44 px face (36 px on phones) with the first name under it, on a court about 112 px tall; the winning side is lit (accent rings and a soft accent tint); in the middle, on the net between the pairs, a dark box with only the score (or “No score”, tooltip “Winner recorded; score not entered”) and a **Won** / **Lost** chip (**Not counted** for partial games); the format (DOUBLES, SINGLES, …) is a small pill in the court's top-left corner and, on your own games, a share icon sits in the top-right corner. Every face opens the profile card (a limited “Not on ROTRA yet” card for a guest). Fun or partial notes show under the row. Opponents' faces and first names are shown; which opponent details are public otherwise stays open below. **Games badge** (owner, November 14, 2026; [log](../../../../mockup-changes/2026-11-14-player-game-row-games-badge.md)): every face carries a small round badge on its top-right corner with how many games that person had played in that session, this game included (white with dark digits; accent on the winning side; accessible name “NAME, game 3 of that session”). **Court tap** (owner, November 25, 2026; [log](../../../../mockup-changes/2026-11-25-player-match-page.md)): tapping the court box (not a face or the share icon) opens that game's public match page, [P-MATCH-PAGE](match-page.md).

Show only official records from valid finalized sessions for a linked player. Each supported row can show date, club/session, format, teams/opponents permitted by visibility policy, result, and final score **if supplied**. A missing score is displayed as “Winner recorded; score not entered,” not 0–0.

No Edit result, dispute/void, add score later, or reconstruct-game action. Those old workflows are outside v1's immutable result rule.

Separate club-local fun-game history from long-term performance counting. Whether fun/partial games appear in the public history list and exactly which opponent details are public remain open. Do not hide them from the club's retained operational record or silently claim they contributed to rank.

After a guest's identity is confirmed and linked, include their earlier valid games in personal history and ranking under the existing eligibility/window rules (owner decision, October 28, 2026). A name match alone is insufficient. Show processing truthfully until attribution/recalculation completes; use original game dates and count each game once. Confirmation evidence and mistaken-link handling remain open. Invalid sessions/games do not appear as official wins, losses, or played games; fun/partial-game public visibility remains a separate open detail.

If a public session page expires/deletes, preserve player history with a truthful unavailable-link state. Do not render broken link navigation as if history vanished.

### Share cards

Own profile only ([D-2026-11-09-08](../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-08)). One sheet, **Share rank**, **Share result** or **Share games**, with a **Post | Story** switch (4:5, 1080 × 1350; 9:16, 1080 × 1920) above the fixed dark brand card. The card is drawn on the device and looks the same in both themes. Its footer carries “ROTRA · Run the game.” and a small corner QR that opens the player's profile (`/player/players/<id>`). Hint: “The QR opens your profile. Private profiles ask visitors to log in.” (the same sheet also carries **Share profile**, whose card and link field are in [profile.md](profile.md#p-own-profile--signed-in-owner-view)) Buttons: **Copy link**, then **Share** when the browser supports Web Share (the phone's share sheet with the image), otherwise **Download image** (PNG).

**Share dialog layout (owner, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-share-dialog.md)).** Every Share button (profile, rank, result, games) opens one dialog: **three size tiles** side by side, each a live scaled preview — **Story** (9:16, “Facebook and Instagram stories”), **Facebook post** (4:5, “Facebook feed”, selected first) and **Square** (1:1, “Instagram feed”); tapping a tile selects it (accent border); **Download <size>** saves the selected size (Story 1080 × 1920, Facebook post 1080 × 1350, Square 1080 × 1080) and **Share** opens the system share sheet where there is one. Then a big **OR** divider, then the link as one read-only field with the **copy icon inside it** on the right (no separate Copy button; toast “Link copied”). Footer: **Close**. Square shows 2 game rows (Story 4, Facebook post 3).

**Big share dialogs (owner artifact comment, November 13, 2026; [log](../../../../mockup-changes/2026-11-13-share-dialog-big.md)).** Since the same day, share images have **no QR** and **no grid background** (the corner QR and the “The QR opens …” hint above no longer apply; only the Session QR and club invite keep a QR; [log](../../../../mockup-changes/2026-11-13-share-images-no-grid-no-qr.md)). Supersedes the size tiles above in every app (Player Share; Queue Share your finish, Share profile and Share leaderboard; Admin Share profile). The dialog is up to 1180 px wide (full width on phones). The images show at **full size**, not scaled down: Story 270 × 480, Facebook post 320 × 400, Square 320 × 320, wrapping to new rows. Tapping an image **picks** it (accent border and a check badge on its top-left corner); several can be picked and all start picked; “Tap an image to pick it; the eye shows it full screen. N of M picked · Pick all / Clear”. Hovering an image (always on touch screens) shows an **eye** button on its top-right that opens the image **full screen** on a black backdrop, scaled to fit, with its name and **Download**; Esc, the × or a tap on the backdrop closes it. **Download N images** (and **Share**) act on the picked images and are disabled when none is picked. Share leaderboard keeps its size switch; its images are the leaderboard pages. **Carousel** (artifact comment, same day; [log](../../../../mockup-changes/2026-11-13-share-dialog-carousel.md)): the dialog is compact, at most 680 px wide (full width on phones); the full-size images sit in one horizontal strip that drags with the mouse or swipes on touch and snaps each image to the centre; a drag never picks an image; the strip keeps its position when an image is picked; a fade mask shows on the left and/or right edge only when more images are hidden that way; dots under the strip show which image is centred.

**Save to Photos on iPhone and iPad (owner, November 15, 2026; [log](../../../../mockup-changes/2026-11-15-share-save-to-photos.md)).** Safari on iPhone and iPad saves downloads to the Files app. There, where the system share sheet takes files, every share dialog shows **Save to Photos** in place of **Download N images**, next to **Share**, with the hint “Save to Photos opens the share menu. Tap **Save Image** there.” (**Save N Images** when several are picked). It opens the system share sheet with the picked PNGs; its **Save Image** puts them in Photos. The full-screen view's button reads **Save to Photos** too. Android and computers keep **Download**. A web page can't write to Photos directly, and can't open the Instagram or Facebook story editor.

- **Share profile** ([D-2026-11-11-11](../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-11)): on a readable profile or its dialog. The card shows the level (or **Not ranked yet**), the **Top annual** place if present, and this calendar year's wins. The **Profile link** field and copy icon sit below the images.
- **Share rank:** on the own profile when ranked. The card shows the level, the **Top annual** place if present, and the skill ladder.
- **Share result:** in Home's Upcoming sessions card (Finished) and on each session group in Match history. Card: session title, date and club, “#N in Standings”, “G games · W–L”.
- **Share games:** on each session group in Match history. Card: date and club, avatar groups for each team with a prominent score between them, and “Total W–L”. Post shows 3 games, Story 4, then “+N more games”. A missing score shows an em dash and “Winner recorded”.
- **Your own games, any time** (since November 13, 2026, [D-2026-11-13-06](../../../../mvp/decisions/2026-11-13.md#d-2026-11-13-06)): **Share performance** (one card: session title, date · club, your counted record big as “W–L” with “N% won”, then Games, Won, Lost and, once published, Standing “#N”; also in the session matches dialog footer on your own profile) and **Share games** show on every session of your own history, and each counted game has a share icon (**Share game**, one game). Since November 25, 2026, the **Share game** dialog's **Link** field and copy icon hold the game's match page (`/matches/<matchId>`, [P-MATCH-PAGE](match-page.md)) instead of the profile link; the other share kinds keep theirs. **Share result** still appears only after the Queue Master publishes; before that the row says “Share result opens once the club shares the Standings.”
- **Names on images:** other players show as a visitor would see them. Private and Always private players and guests are masked (first letter plus `***` per word), public registered players in full, whoever is signed in.
- **Story** shows 4 avatar rows; **Post** shows 3. Both keep scores prominent and names secondary.

## Acceptance examples

- Nine recent standard games plus twenty fun games still fails a threshold of ten.
- Old lifetime games outside the window do not count toward current eligibility.
- Updating weights changes explanatory copy only when the corresponding configured calculation is in effect.
- Deleting a club's public page leaves the player's retained official record intact.

**Owner revision, November 10, 2026:** Share games uses paired avatar groups with a large score between them. The owner and partners appear on the left, opponents on the right, with short labels below. Public players may show pictures; private players show masked initials only; guests show a masked name with the picture the club set ([D-2026-11-09-12](../../../../mvp/decisions/2026-11-09.md#d-2026-11-09-12)), else initials (owner, November 25, 2026). A missing score shows an em dash and “Winner recorded”. Post shows 3 games, Story 4, with “+N more games” and the full session W–L total.

**Owner follow-up, November 10:** Games share cards use player names rather than “You”. The winning player or pair has green avatar borders; the same borders appear in the PNG export. Masked names remain masked.
