# Queue club settings and saved players: invite link, previous logo, self check-in, guest linking, club-set pictures

## Implemented

- [x] #619: Use previous logo on Club identity; self check-in switch in Session defaults.
- [x] #620: ClubInvitePanel, the Club invite link menu item and Share club invite on the dashboard header.
- [x] #621: ClubInviteCard, the club share card.
- [x] #622: Joined via marks and LinkSavedPlayerSheet.
- [x] #623: Profile picture field in Edit details (club-set pictures).
- [x] #624: mock data for club invite code, previous logo and self check-in setting.
- [x] #625: mock data for Joined via, guest linking and club-set pictures.
- [x] #626: Club settings (invite, previous logo, self check-in) and Share club invite on Home.
- [x] #627: Saved players Joined via and Link to saved player…
- [x] #628: Club-set pictures in Edit details.
- [x] #629: states for Club settings and Saved players.
- [x] Mockup change log 2026-11-09-queue-club-set-player-pictures (IN MOCK APP), decision D-2026-11-09-12 and the MVP status pages.

## Verification

- [x] `make check` passes on the last commit (2026-11-10).
- [x] Mockup comparison for #623 and #628 (2026-11-10): the Profile picture field matches the mockup at 1280 px dark; set character, upload photo, Remove, Use previous picture, the three toasts and the two file errors ran in the Queue app; 375 px checked in dark and light. Not compared: 1280 px light. The character faces come from the shared P06 helper, so they differ from the mockup drawings.
- [ ] Storybook stories for the changed components in both themes (not run).

## Not done

- Real mode: no Prisma columns (`club_players.avatar_ref`, `avatar_previous_ref`, invite code,
  previous logo, self check-in setting), no server paths, no upload storage or cleanup.
- The merge operation for guest linking and the public `/register/[clubId]` route.
