# Queue flexibility: mock implementation evidence

Verified on 2026-11-01 (Asia/Manila). Scope: #284–#291 and #293–#298, following the approved G1–G4 decisions in [owner review](05-owner-review.md). The owner requested one PR with one commit per ticket and explicitly included the admission/court prerequisites.

## Delivered contract

- Prepared sessions keep slot-budget waitlisting and the explicit override. Active sessions admit saved players, directory players, new players, confirmed join requests and any chosen waiter directly above the budget. Admission marks arrivals present and locks their level; starting a session leaves waiters outside the roster.
- Each court has a planned booking window within the session, including overnight labels. Dispatch waits for its start and ignores its advisory end. Used starts are fixed; occupied removal and last-court removal remain blocked. Session-following ends extend with the session while explicit ends remain fixed.
- Auto Queue retains five alternative draft batches separately from Main Queue. Generation requires an explicit 2/3/4/6 count; Catch Up also requires an explicit whole completed-game target. Counts distinguish played, queued, in play and current-batch suggestions. Main Queue changes mark retained drafts stale.
- Cross-tab selections retain selection order for review. Transfer validates the entire selection atomically and uses a confirmation receipt to prevent duplicate submission. Separate generated rematches remain valid. Plan Ahead dependencies enter Main Queue waiting; transfer never starts a match or claims a court.
- Loading, empty, pending, failed-save, conflict, stale and retry states preserve the relevant inputs, drafts and selection. Successful transfer restores focus even when the opening action disappears.

## Automated verification

Ran `nvm use && pnpm --filter @rotra/data exec vitest run src/match`: **3 files, 36 tests passed**. These are focused Queue-rule tests using the existing tooling, without new dependencies.

Coverage includes count transitions on deletion/start/completion; invalid/partial credit; alternative-batch isolation; strategy ordering, ties and repeated future appearances; Catch Up fillers and stopping reasons; selection preservation; atomic transfer, retry and intentional rematches; newly playing conflicts and Plan Ahead dependencies; failed regeneration; downloaded/missing-copy offline guards; completed/invalid read-only states; and active expired-license behavior.

Admission checks cover all five entry paths, prepared overflow, start leaving waiters untouched, 36-to-37 admission, unchanged no-shows/public counts and subsequent generation with the admitted player. Controlled-clock court checks cover future openings, Court 5 after its advisory 9:30 PM end, manual removal, used/occupied/last-court guards, 5v5 eligibility, extensions, overnight bounds and minute-field precision for timestamps containing seconds.

## Running app and Storybook checks

Used the Queue development app and shared Storybook against the in-memory store. No API or database was involved.

- Loaded the explicit development-only 36-to-37 example; admitted the second waiter and confirmed 37 roster entries, 36 present and the existing no-show unchanged. Generated alternative batches, selected across tabs in review order and transferred two matches. Started one on an ended booking, then deleted the other waiting match and checked derived counts/staleness.
- Forced the next transfer save to fail. Review stayed open with its lineup and error; retry added one match. Verified dependency text and focus recovery. Double-clicking a walk-in confirmation admitted exactly one player.
- Exercised all five strategies, rejected a fractional Catch Up target, preserved a selected draft during regeneration and checked that the session minimum remained separate.
- Edited an occupied, previously used court: start and removal were disabled; changing its end preserved the active match. Loaded the five-court example and confirmed all future courts were visible but unavailable for dispatch before their start.
- Checked Auto Queue, admission and five-court setup in dark/light at measured browser widths of **375 px and 1280 px**. Corrected the narrow waitlist action layout and rechecked both themes without horizontal overflow.
- Checked keyboard focus on sheet opening, field validation, sheet replacement and transfer success/failure. An out-of-session setup time displayed an inline error and focused the affected field.

Local screenshots were captured under `/tmp/rotra-queue-verification/` during this run; that temporary directory is not a repository artifact. The canonical editable Queue prototype and shared stories remain the review references.

## Limits and deferred verification

Lint, type-checks and production build were **not run**, following the owner's code-only instruction. Syntax parsing and formatting are not a substitute for those checks. Browser checks used development servers.

The shared Sheet retains its reduced-motion path (zero-duration motion), but the operating-system reduced-motion preference was not toggled in this browser session. Offline/conflict guards were exercised with supported mock controls/rule tests; a full browser network-disconnection journey was not run. Time boundaries were verified with controlled-clock rules rather than waiting until the evening.

This is mock behavior only. The development menu examples explicitly reset fictional in-memory data. Database services, real APIs/auth, durable storage, durable offline/sync and production readiness remain deferred. No permanent outcomes, pricing or ranking formulas were changed.
