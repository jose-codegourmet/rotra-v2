# Queue live console: Requests, self check-in mark, request formats

## Implemented

- [x] #616: Requests · N with Join and Match tabs, drop-out notices, Link / Not them,
  Add to queue and Decline (mock data and `matchRequestDecisions`).
- [x] #617: Checked in themselves / Left mark on roster rows, cards and live Players cards.
- [x] #618: request formats per session (`requestFormats`), setup toggles and Setup card
  summary; defaults option A (owner, 2026-11-10).
- [x] Close out the Q18 mockup-change logs, decision D-2026-11-09-11 and the MVP status pages.

## Verification

- [ ] `make check` passes on the last commit (not run).
- [ ] Mockup comparison for #616, #617 and #618 at 375 px and 1280 px in dark and light
  (not run).
- [ ] Storybook stories for the changed components in both themes (not run).

## Not done

- Real mode: no server read or decision paths for requests, and no Prisma column for
  `requestFormats`.
- The club setting Players can check themselves in belongs to epic Q19 (#587).
