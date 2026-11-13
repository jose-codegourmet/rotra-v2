# Share leaderboard: several images, pick which

Status: IN MOCK APP — #842
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.shareBoard, LB_SHARE_ROWS; entry points histResultsPane (session record › Results › Standings) and pubLeaderboard (finished session page › Leaderboard)
Route: /queue/sessions/<id> (Results tab); /queue/s/<session> (Leaderboard tab)
Screen ID: Q-RESULTS, Q-PUBLIC-RESULTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: share-dialog, leaderboard-share-card
Supersedes: none
Superseded by: none

## What changed
- Before: no way to share the session leaderboard as images (only Download images of the result slides, and Share your finish for one player).
- After: a **Share leaderboard** button on the session record's Standings header and above the public Leaderboard table. It opens a wide dialog: size switch (Story, Facebook post, Square); the standings split into images of 10 / 8 / 6 places; each image has "Leaderboard", session title, date · club, then rank (top three in the accent), picture, name and W/L per row, and "#a–b of N" next to the ROTRA mark. All images start picked; tapping one picks or unpicks it (unpicked ones dim; a check badge shows picked); "N of M images picked · Pick all / Clear"; **Download N images** and **Share** (disabled when none is picked); OR; Session link with the copy icon. Changing size re-splits and picks all. On phones the images show two per row.
- Unchanged: Result slides, Download images, Share your finish.

## Why
- Owner, November 13, 2026: "In every leaderboard … there should be a share leaderboard · but since it is long, break it into multiple images and let them pick which images to get · in the leaderboard share images there should be avatars too".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: 18 and 24 players in each size; last image partly filled; none picked (buttons disabled); masked names (private, guest) and initials avatars.
- Copy: "Share leaderboard", "N of M images picked", "Pick all", "Clear", "Download N images", "Image N", "#a–b".
- Tokens: share-card colours are fixed brand colours, like the other share cards.
- Known differences: none

## Reuse plan
- Reuses as is: share-dialog pieces (size labels, OR divider, copy field), avatar.
- New: leaderboard-share-card, image picker tile.

## Pass 2 (artifact comment, November 13, 2026: “in share it should highlight where you are”)
- On the session page, for a signed-in player, their own row in the leaderboard images is highlighted (accent-tinted row with an accent outline, rank and name in the accent, a small “YOU” tag after the name); the caption of the image they're on reads “#a–b · You're here”, and the carousel opens centred on that image. The Queue Master's Share leaderboard (session record) has no viewer row, so nothing is highlighted there.

## Pass 3 (owner, November 13, 2026: “ellipsis long names · compact the standing per row: # (green) W, # (red) L, # (text colour) G”)
- In the leaderboard images a long name ends in an ellipsis (the YOU tag stays visible after it). Each row's record is three compact, right-aligned columns: wins in green (“6W”), losses in red (“0L”), games in the text colour (“6G”), numbers bold and tabular.
