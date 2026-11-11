# Player: Profile visibility has three levels, plus Hide me from Player Information (#715, proposed)

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Privacy and contact › Profile visibility and Player Information; leaderboard, podium and public profile views for an always-private player
Route: /player/profile/privacy-and-contact (also /player, /player/players/b11 for the always-private sample)
Screen ID: P-PROFILE-PRIVACY
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-visibility choice (radio group), settings switch, avatar
Supersedes: none
Superseded by: none

## What changed
- Before: **Profile visibility** was one **Private profile** switch (private: visitors masked, signed-in players see the profile).
- After: **Profile visibility** is a three-choice radio group, default **Private**: **Public**, **Private**, **Always private**. A separate **Player Information** card holds the switch **Hide me from Player Information** (default off).
- Always private in the mock: the leaderboard row and podium slot show the masked name (for example N*** L***) and initials instead of the photo for everyone, signed in or not, except the player themselves; opening that profile shows **This player keeps their profile private.** with no sign-in button. Private keeps today's behaviour (visitors masked and sent to sign in; signed-in players see the profile). The Queue Master exception is described in the choice text; this screen cannot show a Queue session.
- Fixtures: leaderboard position 12 is always private; three registered players are hidden from Player Information (they are left out of the public club page member list, see the public club page log). New registrations default to Private. The seeded Migs account stays Public, as he chose before.
- Proposed, built to the recommended option of the owner decision pack; the owner has not approved it yet.

## Why
- Ticket #715, Jose on 11 Nov 2026: “whenever a user is signed in they can see the names, but if they set it in their rotra profile to make them always be private … and also in privacy settings they can set that they can be hidden in the player information. this makes them only join the queue when they really intend on joining.”
- Recommended answers built: Q1 A three levels; Q2 A the Queue Master of their session and the player themselves see an always-private name; Q3 A name and photo masked; Q4 A hides Add player › Player Information and RTR ID search only (not Saved players, Admin or the public session page); Q5 A defaults Private and hidden off; Q6 A a club's saved player can still be added from Saved players.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: each of the three choices selected; Saving… (choices disabled); Saved line; offline error; switch on, off, saving, offline error; always-private row and podium for a visitor and for a signed-in player; always-private profile page; the player viewing their own always-private profile (sees everything).
- Copy: **Profile visibility**; **Public** (“Visitors and signed-in ROTRA players see your profile.” — wording for Public is not in the ticket; added for completeness); **Private** (“Visitors see your name masked. Signed-in ROTRA players see your profile.”); **Always private** (“Everyone sees your name masked and your initials instead of your photo, except the Queue Master of a session you join.”); **Saved: your profile is public.** / **private.** / **always private.**; toasts **Your profile is now public** / **private** / **always private**; offline error “Couldn't save because you're offline. Your profile is still …”; **Player Information**; **Hide me from Player Information**; helper “Clubs can't find you in the Player Information search or by RTR ID. Clubs that already saved you can still add you. You join sessions yourself.”; **Saved: you are hidden from Player Information.** / **Saved: clubs can find you in Player Information.**; toasts **You are now hidden from Player Information** / **Clubs can now find you in Player Information**; **This player keeps their profile private.**
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: settings switch, saved-state line, notice, avatar masked view, private gate page.
- Extends: profile-visibility control from one switch to a three-choice radio group; masking rule gains an always-private case.
- New: radio-choice list (no existing component fits three choices with helper text).
- Shares work with: the Queue log for Add player › Player Information search (hidden players), the public club page log, and the avatar photo viewer logs (no photo to enlarge when masked).

## Docs updated
- Business logic: none yet — proposal pending owner approval; business/screen docs follow when approved
- Database design: none yet — proposal pending owner approval; business/screen docs follow when approved
- Screen docs: none yet — proposal pending owner approval; business/screen docs follow when approved

## Real app work
- Player: replace the Private profile switch with the three-choice control and add the Hide me switch (new profile fields, for example visibility enum and hidden-from-directory flag; schema and migration need owner sign-off); apply always-private masking (name masked, initials, no photo) on leaderboard, podium, public profile and session participants for everyone but the player and the Queue Master of their session; default Private.
- Queue: leave hidden players out of Add player › Player Information and RTR ID search; keep them in Saved players.
