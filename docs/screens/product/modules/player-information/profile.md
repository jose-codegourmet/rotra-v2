# Public and own player profile

**Surfaces:** `P-PUBLIC-PROFILE`, `P-OWN-PROFILE`, `P-EDIT-PROFILE`.

**Source:** [Player Information scope](../../../../business_logic/product/player-information/README.md), [identity](../../../../business_logic/product/player-information/modules/identity/README.md).

## P-PUBLIC-PROFILE — Public identity

Accessible without login, subject to the player's [profile visibility](#profile-states). The top of the profile card is a **banner** (see [Profile banner](#profile-banner)) with the circular picture overlapping its bottom edge and the name and nickname beside the picture; the same card is used for your own profile and for another player's. Show player full/display name, nickname, optional avatar, permanent RTR ID, skill label, and overall leaderboard position only when eligible. Provide readable rank-status explanation rather than a fake position of zero.

Supporting sections: permitted personal/playing-style information, optional experience, supported social links subject to the final visibility policy, and a read-only match-history entry point. Keep the product lean; do not add posts, followers, private messaging, equipment commerce, or club-discovery maps.

Never show phone/email, claim status secrets, reset links, pending contact-change evidence, or private club Off Day labels. Club-assigned local levels may differ from shared rank; do not suggest every club must pair the player at the public level.

RTR ID retains the original club founding-city/date context. Do not display it as proof of current residence or current club membership. No separate City/National/World ranking badge.

## Profile states

| State | Presentation |
|---|---|
| Newly created, sparse history | Real identity plus provisional/no-calculation explanation; no invented numeric rating |
| Below leaderboard threshold | Profile remains public; explain no overall position yet |
| Eligible | Show skill label and global position from a fresh accepted projection |
| Needs reassessment | Keep old label visible with that status; no active leaderboard position |
| Rank update processing | Distinguish last calculated data from pending session update |
| Not found | Neutral unavailable profile; never redirect to a same-name player automatically |
| Offline cached | Show cached age; no edits claimed saved to server |
| Private profile, viewer not signed in | The profile, its games and its comparison show only "Log in with ROTRA to see this profile." and a **Sign in** button (back to that page after signing in). Same gate for guests. Signed-in ROTRA players see the full profile. Private is the default ([D-2026-11-09-07](../../../../mvp/decisions.md#d-2026-11-09-07), default and levels changed by [D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)) |
| Always private profile | For everyone but the player themselves, signed in or not: the picture and banner, the masked name and the text **This player keeps their profile private.**, with no sign-in button. Name, level and games are not shown. The player sees their own profile in full ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)) |

Unclaimed profiles can exist without a login; the public view does not let any visitor claim one by clicking its public ID. Account-link delivery remains operator-issued.

## P-OWN-PROFILE — Signed-in owner view

Start from the same public identity with clearly separated private account controls: Edit profile, My player ID/QR, phone privacy, read-only phone/email, contact-change request, and sign out.

Explain which fields are public before saving personal edits. Do not show a player-facing edit control for rank, local assessment, match scores, wins/losses, or eligibility. A player can see their own contact values; that does not make those values public.

**My sessions** (right column, above Recent games): the player's upcoming and live sessions they requested, are confirmed in or are waitlisted in. Each row shows the session title, “Date · start–end · Club”, a chip (Requested, Confirmed, Waitlist #N, Happening now) and links to the Queue session page `/s/<slug>`. Empty: “No upcoming sessions. Sessions you join from a club's session link show here.” Loads when the profile opens, then only on a pull down from the top of the page or when the tab comes back, once every 10 seconds; no live updates ([D-2026-11-09-04](../../../../mvp/decisions.md#d-2026-11-09-04); pull added by the [November 12, 2026 mockup change](../../../../mockup-changes/2026-11-12-player-pull-to-refresh.md), own profile only, same pill and copy as the session page's `pull-to-refresh`).

**Share rank** (own profile; hidden while there is no rank): a **Share** button in the “Shared rank” card header opens the share sheet for the rank card: picture, name and nickname, level, “Overall #N” (or “No position”) and the skill ladder, with no club. The sheet, its Post | Story switch, buttons and states are in [ranking-history.md](ranking-history.md#share-cards) ([D-2026-11-09-08](../../../../mvp/decisions.md#d-2026-11-09-08)).

**Share profile** (own profile only, beside **Edit profile** and **My player ID**; no button on other people's profiles or for signed-out visitors; [D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11), #738): opens the same share sheet as Share rank with a **Post | Story** switch and a profile card: picture (photo, chosen character or initials), name and nickname, level or **Not ranked yet**, **OVERALL** position whenever the player has one, then **LAST 90 DAYS** with **Wins** (the number of counted wins) or **No games yet**, and the small corner QR that opens the public profile. Below the card a read-only **Profile link** field (focusing it selects the link) with a **Copy** button beside it (toast **Link copied**, or a failure toast). Footer: **Download image** (draws the same card on a canvas; toasts **Post image downloaded** / **Story image downloaded**) and **Share** (system Share sheet). Always available, even without a photo, level or games. The sheet's caption is “The QR opens your profile. Private profiles ask visitors to log in.” plus the size sentence. Sizes and buttons in [ranking-history.md](ranking-history.md#share-cards).

**Your clubs** (left column, under Your account; own profile only): one row per club with its initials or logo, name, a muted “Joined via club link” / “Joined via session link” / “Added by the club” line, and **Club page** (opens the [public club page](club-page.md)), **Leave club** and **Report a problem**. Leave club opens a confirm sheet “Leave <club>?” (“You're removed from the club's saved players. Your past games stay.”, Cancel / **Leave club**). Report a problem opens an email to ROTRA support with the subject “Problem with <club>” and the club name and player ID in the body; hint “Opens your email app.” The support address is a placeholder until the owner supplies it ([D-2026-11-09-06](../../../../mvp/decisions.md#d-2026-11-09-06)).

**Email banner:** until the account's email is confirmed, every page shows the “Confirm your email” banner (see [access-registration.md](access-registration.md)).

A prompt to finish optional profile details is not a blocking onboarding gate or EXP reward system. Required contact completeness was handled at registration.

## P-EDIT-PROFILE — Personal information only

Editable: agreed personal name/nickname and supported optional social/playing-style/experience fields. **Profile picture** (owner request, November 8, 2026): on your own profile the picture has a small edit button on its corner (“Change profile picture”), and Edit profile › Name starts with a live preview of the profile card (see below), whose pencil button opens the same **Profile picture** dialog (the earlier separate “Profile picture” row with **Change picture** is gone, November 11, 2026). Both open the dialog: the current picture and what it is (“Your photo”, “A character” or “Your initials”), **Upload a photo** (WebP, GIF, PNG, HEIC/HEIF or JPEG), **Use my initials**, and “Or pick a character”: the characters the platform owner shows in Admin › Profile characters ([A-CHARACTERS](../admin/configuration.md#a-characters--profile-characters), [D-2026-11-09-13](../../../../mvp/decisions.md#d-2026-11-09-13)), **15 per page** (five round characters per row, three rows; each fills its column, about 56 px at 375 px and 90 px on wide screens, the chosen one in a 3 px accent ring; changed from 8 per page by [D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)) with a pager under the grid (“Previous · Page N of M · Next”, Previous disabled on the first page and Next on the last; the page label is announced). The dialog opens on the page that holds the player's current character, otherwise page 1; the chosen one is outlined. A character the player already uses stays theirs if Admin later hides or deletes it. Admin keeps at least 15 shown so the first page is full. The prototype seeds sample characters over more than one page (owner comment, November 9, 2026: “can this be paginated. the images here will be controlled in the admin app”). **Previous picture** (D-2026-11-09-10): when a previous photo exists, a row under the current picture shows its thumbnail and a **Use previous picture** button that swaps current and previous. Choosing a character, **Use my initials** or **Remove** (shown next to Use my initials while a photo is set) makes the last photo the previous one; characters and initials store no file. Hint: "Only your current and previous photo are kept." ([D-2026-11-09-10](../../../../mvp/decisions.md#d-2026-11-09-10)). All choices stay local until **Done**, independently of Edit profile's Save. Photo drafts show a square crop preview, a draggable picture and one **Zoom** slider; the picture is never stretched. Done persists once, shows **Saving…**, disables dismissal while pending, and closes with “Profile picture updated” (or “Using your initials”) only on success. Errors keep the draft for retry. X, Escape and outside dismissal discard the draft and release preview resources. The picture editor does not mark Edit profile's form as unsaved. HEIC/HEIF previews are decoded locally to browser-compatible WebP; GIF and WebP animations survive cropping and saving. Reduced motion freezes their displayed preview/avatar without changing the saved animation. Updated owner decision: #567; the implementation-chat follow-up simplifies framing to drag plus zoom, without position sliders or a rotation control. Other players' profiles have no edit control. The picture is stored through the existing `avatar_ref` (a character id or an uploaded file); this is not an external avatar provider.

**Name preview and banner** ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)). The top of Edit profile › Name mimics the profile card: the chosen banner runs edge to edge across the panel top, the circular picture overlaps it with the pencil on it, and the name and nickname beside it update as you type. Under it: “This is how the top of your profile card looks. Tap the pencil to change your picture; pick a banner below.” then the **Banner** swatches (a radio group of the predefined banners; prototype samples **Court**, **Night**, **Dusk**, **Ember**, **Sun**, **Stripe**), the current one outlined, with **Selected: NAME · Public. Pick one of ROTRA's banners; your own images can't be uploaded.** Tapping a swatch applies it at once with the toast **Banner updated**; there is no upload and no remove, and Court is the default. The banner is public, like the picture. The set comes from Admin › Settings › Profile banners.

**Links** (Facebook, Instagram, TikTok, YouTube) stack one per row at every width, like the rest of the form (November 11, 2026).

Phone and email are read-only with **Request a change**. Their fields must not become editable through a generic form payload or hidden input. Permanent RTR ID is read-only.

Save validates actual supported fields, preserves values on error, and shows success only after server persistence. Cancel returns without changing stored details. If navigating away with unsaved edits, a proposed discard prompt may protect the draft; it does not finalize any session.

Offline personal editing is not an agreed offline product feature. Keep a visible unsaved local draft if desired, but require internet to save and do not queue identity changes as if automatically approved.

Invalid links/experience values: actionable inline errors. Social links must be treated as links, not authentication tokens or verified achievement claims. Personal experience does not directly award rank points.

## Profile banner

Shown on the profile card of every player, public like the picture ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)). A banner strip (the player's chosen predefined banner) runs edge to edge across the top of the card; the 88 px circular picture overlaps its bottom edge with a surface-coloured ring; the name and nickname sit beside the picture below the banner; the rest of the card (Player ID, **Edit profile** / **My player ID** / **Share profile**, **Compare**) is unchanged. Own profile shows the camera button on the picture and the **This is you** chip. A long name wraps under the banner. Banners come from the platform owner's library (A-BANNERS in Admin); a player cannot upload one. An Always private player's card still shows the banner.

## Full photo

Any avatar with a real picture (photo or character, never initials) opens the full photo: a black overlay (`--photo-scrim` rgba(0, 0, 0, 0.94), `--photo-fg` #fff in both themes, shared with Queue and Admin; [D-PHOTO-VIEWER](../../dialogs.md#d-photo-viewer--full-photo)), the photo centred, **×** at the top right. It closes on an overlay tap, **×** or Esc; focus moves to the dialog title and the page is locked while it is open; reduced motion drops the fade. Accessible names: **View full photo of NAME** (the avatar button), **Photo of NAME** (dialog title and image), **Close** (the ×, owner decision November 12, 2026). It applies to the big profile photo (own and other), the Your position card, Compare and the Edit profile picture preview. Where a tap already opens a profile (leaderboard rows, the Top three podium, club member rows), that stays and the photo opens from the big photo inside the profile. A masked picture has nothing to enlarge. Always-private players keep their picture public, so it can be enlarged ([D-2026-11-11-11](../../../../mvp/decisions.md#d-2026-11-11-11)).

## Profile dialog

Opened from a club member (the [public club page](club-page.md) grid and Members page); Queue's participant tiles use the same card (see the Queue docs). A banner card: banner, circular picture (opens the full photo), name and nickname, level chip, **#N overall** when on the leaderboard, **You** on your own entry; then **About** (Registered in, RTR ID) and **Stats · last 90 days** (Games, Wins, Losses, Win rate, or “No games yet”); buttons **Close** and **Open full profile**. A private player's card shows picture and banner, the masked name, a **Private profile** chip and “This player has chosen to keep their ROTRA profile private. You can see their picture and banner; their name, level and games stay between them and their clubs.” A guest's card says there is no profile yet.

## P-COMPARE — You and another player

Owner request, November 8, 2026. Route `/players/[playerId]/compare`; data, rules and route are settled in [D-2026-11-08-02](../../../../mvp/decisions.md#d-2026-11-08-02). Another player's profile (signed in, not your own) has a **Compare with me** button (signed out: it asks you to sign in, then returns to the comparison). It opens a page “You and NAME” with a back link to that profile:

- **Filter switch** at the top (owner comment, November 8, 2026): **All · 8** (default), **Head to head · 6** (games against each other) and **Together · 2** (games on the same team), each with its count. The numbers below and the list follow it; changing it goes back to the first page of games; opening the comparison always starts on All.
- **Side by side** (All and Head to head; owner comment, November 8, 2026: head to head should show a comparison, together should have a different layout): both pictures with “You” and the other player's first name, then rows with your value on the left and theirs on the right, the better value in the accent color: **Level** and **Overall position** (lower is better), which do not change with the filter; on **Head to head** also **Games counted (3 months)** and **Win rate overall**; then, for the games the filter shows, **Shared games** (or “Games against each other”), **Wins in these games** and **Win rate in these games**. Against each other only one side wins a game.
- **Together** replaces the side-by-side with a **team card**: your two overlapped pictures, “You and NAME · As a team”, three tiles **Games**, **Won** (accent) and **Lost**, “Win rate as a team” with the percentage and one bar, and a line “Your level together: LEVEL and LEVEL”. As partners you share every result, so there is nothing to compare between you.
- **Record bar** under the rows: a count at each end and one bar. All: “You won” / “You lost”; Head to head: “You won” / “NAME won”; Together: “Won” / “Lost”. With no games in the filter it reads “You haven't played against NAME yet.”, “You haven't played on the same team as NAME yet.” or “No shared games yet.”
- **Games you played together or against** (owner request, November 8, 2026): newest first, three per page. Each game is one row of three columns: **Court** (40% of the width), **Session** (30%) and **Result** (30%).
  - **Court**: a top-down badminton court (net dashed in the middle) with no fill: only the lines and the outline, in the green accent at 10% opacity, so names and levels stay readable in both themes (owner comments, same day), your side on the left half and the other side on the right, one or two players stacked on each half. Each player is a 38 px picture (initials when none) with a small round badge on its top right corner holding how many games they played in that session, a green ring on the winning side, and under it their first name (“You” for you) and skill level in small text, over the court.
  - **Session**: the date in bold, the session title and the club.
  - **Result**: the label chip (“You won”, “NAME won”, “Together · won/lost”) with the score in large type under it (“21–9”), right-aligned.
  A short line above the list explains the ring, the badge and the columns.
- Only counted singles and doubles are included; fun and partial games are left out, like the rest of rank. Results are the same final results already on each profile.

Backend note (owner comment, November 8, 2026): this should not need a background cron job. Once a session is submitted its results are final, so the shared games can be read from those final match rows when the page opens (or a per-pair summary can be updated in the same step that finalizes the session); nothing has to run afterwards. A Supabase Edge Function on a schedule is a new piece of infrastructure and needs an owner decision first; see the [database open decisions](../../../../database_design/product/open-decisions.md).

Prototype data: the shared games are drawn from the two player ids, so the same pair always shows the same record. Not decided yet, to confirm with the owner: whether comparing is only for signed-in players (assumed), whether the other player can switch it off, and whether fun games should show as a separate line.

## Acceptance examples

- A player's new name does not create another RTR ID.
- Needs reassessment preserves the old label without retaining leaderboard placement.
- Editing a profile cannot change phone/email or any game result.
- Private Off Day results never become a permanent public badge.
