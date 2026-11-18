# Epic #891 — Player period leaderboards

Actual implemented UI captured locally on November 18, 2026. All names and account details are fictional fixtures. Mock screens use the October 27 fixture clock; calendar rules use Asia/Manila. The canonical HTML prototype was inspected alongside the implementation. The documented fixture-date and private-profile dialog differences remain intentional.

| Ticket | Implementation commit | Follow-up | Evidence |
| --- | --- | --- | --- |
| #897 — Shared period components | 15b2e77944c7c6c5d5422265831e889279b43d1e | 4b9e6e0f | `897-*.png`: list, movement tooltip, profile boxes, cutoff card; both themes at 375/1280 |
| #902 — Period data and standings | 265d53a08f3576f05bf0f8280007791611b3b472 | None | No standalone UI: shared calendar, ordering, movement, fixtures and hooks; exercised by all screen captures |
| #906 — Leaderboard screen | 8994e59bf16c9d42f185605d5d2935b849c0cedb | aaba2414 | `906-*.png`: all three periods, both themes/widths, own place, loading, error and empty week |
| #913 — Profiles, Compare and shares | 14a235905237f6fb3f5c90529eb3ac9e3806a436 | None | `913-*.png`: zero/one/two/three lists, unclaimed, own profile, Compare, profile jump and annual share |
| #918 — Real-mode reads | c7a252f0f1de09ff97d8d5952ec7181dc2be9b4b | None | Recorded-match aggregation and existing API contracts; `918-real-local-annual.png` shows the isolated real-mode fixture read |

All five tickets were closed after their implementation commits, as requested by the batch workflow.

## Verification

- Full `pnpm test`: PASS, four workspace tasks successful.
- `make check`: PASS (lint, type-check, production builds, decided math, generated-artifact checks).
- Local database integration: PASS, two rollback-only cases against an isolated disposable database using the existing migrations. Covers all periods, prior periods/late results, top-50 cutoff and own place, duplicate attribution, privacy, unclaimed ownership and exclusions.
- Real HTTP reads: PASS. All periods returned 200; invalid period/limit returned 422; anonymous own-place returned 401. Every response carried `private, no-store`. See `http-evidence.json`.
- Browser interaction: PASS. Three periods, pagination to 50, search miss, loading/error/empty week, own top-50/below-50, profile boxes navigating to the correct period/player, Compare and annual profile share. `browser-evidence.json` reports no page errors.
- Storybook: 216 rendered combinations, zero horizontal overflows. See `storybook-evidence.json`.
- Profile/Compare: both themes at 375/1280, zero horizontal overflows. See `profile-evidence.json`.
- Playwright test suite: SKIPPED as requested. Installed browser automation was used only for the click-throughs and screenshots above.
- Four unrelated stale test expectations also failed on the original base. `085f74a0` updates those expectations to the existing authenticated profile/reset and queue-review/preview contracts; application behavior was not changed for those failures.

## Scope and remaining work

No dependencies, schema changes or migrations were added. Legacy unclaimed records without a global player/RTR identity cannot join a global leaderboard until #900 supplies that identity; existing valid identities are covered. Skill rating and its ten-match progress remain separate. Future Go API parity and broader public-read privacy work remain in their existing tracks (including B-53/B-54/B-60); this batch implements the Player TypeScript routes.

Development overlays may appear at the viewport edge; they are not product UI. Console duplicate-key warnings in existing fixture game-history lists were observed; no browser runtime errors occurred.
