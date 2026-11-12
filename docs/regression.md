# Regression suite (apps/e2e)

A Playwright suite that runs whole club nights through the three apps in **real mode**, against a
throwaway **local** Supabase. It checks that every player gets their fair share of games when
real-life disruptions happen. Decision: [D-2026-11-12-05](mvp/decisions.md#d-2026-11-12-05).

- Apps run on ports 9100 (Queue), 9101 (Player) and 9102 (Admin).
- Database: `rotra_disposable_e2e` on `127.0.0.1:54322`. Supabase: `http://127.0.0.1:54321`. The
  guard (`apps/e2e/src/guard.ts`) refuses anything else. Never a hosted project.
- The server test clock loads only through the e2e runner, only with `ROTRA_E2E_CLOCK=1`, and never
  runs earlier than real time.
- Not part of `make check`. Run it on demand. Offline mode is not covered.

## Pass rules

- Every player reaches floor(minimum × minutes Present ÷ session minutes) counted games.
- Players Present for the whole session differ by at most 2 games.
- The below-minimum list in the Session done review matches the expected list.

## Commands

```bash
make e2e                                     # start or reuse local Supabase, reseed, run all
make e2e E2E_ARGS="--project sim -g REG-08"  # one project, one scenario
make e2e-ui                                  # Playwright UI mode
make e2e-down                                # stop the local stack
E2E_SEEDS=5 make e2e                         # number of random seeds for REG-09
E2E_SEED=2189437517 make e2e E2E_ARGS="-g REG-09"   # replay one seed
```

## Prerequisites

- Docker, running.
- Supabase CLI 2.34.x.
- `psql`.
- Chromium for Playwright: `nvm use && pnpm --filter @rotra/e2e exec playwright install chromium`.

## Running on GitHub

1. Actions › **Regression** › **Run workflow**.
2. Pick `suite` (all, sim or ui) and `seeds`. No secrets are needed.
3. When it ends, download the `playwright-report` artifact.
4. Open a trace with `npx playwright show-trace <trace.zip>`.

## Disruptions and the controls they use

| Disruption | Control |
|---|---|
| Late | Not Present until arrival |
| Injured | Substitution with credit Nobody, then Present off. About 10% return after 20–60 min |
| Subbed | Substitution, rotating the credit choice |
| Tired | Present off after Match done for 10–30 min. Only when the roster is below the slot budget |
| Eating | Present off for 10–90 min |
| Court change | Add or remove a court |

## Session shapes

| Shape | Players | Courts | Length | Formats |
|---|---|---|---|---|
| Standard | 24 | 4 | 3 h | doubles + singles |
| Small | 12 | 2 | 2 h | doubles |
| Big | 40 | 6 | 4 h | doubles + singles |
| Not full | 18 | 4 | 3 h | doubles |

## Strategies

Fewest Games is the default. Random mixes rotate Available Players, Longest Wait and Plan Ahead.

## Scenario index

Simulation (`tests/sim`):

- **REG-01** control, no disruptions: everyone reaches the full minimum.
- **REG-02a / 02b** late only, low end (10%, 1–10 min) and high end (30%, 60–90 min).
- **REG-03a / 03b** injuries only, early (first 30 min) and late (last 30 min).
- **REG-04** substitutions only, one per credit choice (Nobody, incoming, outgoing).
- **REG-05** tired only (Not full).
- **REG-06a / 06b** eating only, 10 min and 90 min.
- **REG-07** all disruptions, low end (Not full).
- **REG-08** all disruptions, high end, with match requests (Not full).
- **REG-09** random mixes of strategy and shape, with match requests, one per seed.
- **REG-10** stacked: one player 90 min late, then eats 90 min.
- **REG-11** short on players: Present count below court capacity.
- **REG-12** injury while On court: lineup change, not substitution; Start match refused until replaced.
- **REG-13** injured player in waiting matches: those need attention; Regenerate.
- **REG-14** overfilled roster 25/24 (Add anyway).
- **REG-15a / 15b / 15c** doubles only (Small), doubles + singles (Big), Bagging mode with one pair (Small).
- **REG-16a / 16b** calculated minimum, operator-set minimum (3).
- **REG-17** Add to queue: Anyone filled with fewest-games Present players, at the end of the Main Queue.
- **REG-18** Add to queue keeps named partners and opponents exactly.
- **REG-19** Decline: no match, the request closes, the Player sees none.
- **REG-20** a named partner Present off closes the request by itself.
- **REG-21** Session done closes every open request.
- **REG-23** court added mid-session, open now.
- **REG-24** court added with a later planned start: no match before it.
- **REG-25** court added with a later start, then Start anyway.
- **REG-26** Open until a set time: Booking ended, the court keeps working.
- **REG-27** free court closed mid-session.
- **REG-28** closing a busy court is refused (On court and Playing).
- **REG-29** closing the last court is refused.
- **REG-30** remove a court, then add one.
- **REG-DEF-01** Session done with a match left On court (never started).

Browser (`tests/ui`):

- **UI-01** a club night from Admin to Session done to the Player history.
- **UI-08** late player, injury and a meal break; Session done lists the shortfalls.
- **UI-12** injury On court: Start match waits for a replacement.
- **UI-17** Request a match: added to the queue, then a second one declined.
- **UI-17 "I'm here"** (`test.fixme`).

## Known app defects (marked test.fail)

Fixes are the owner's. Remove `test.fail` once a fix lands.

- **REG-DEF-01:** Session done returns 500 when a match is On court and never started.
  `finalization.ts` `dropUnstarted` sets `released_at` without `release_operation_id`, which breaks
  `match_court_usage_release_check`.
- **REG-09 #3:** Longest Wait breaks ties by roster order, not games played. Seed 2189437517, Small,
  spread 3.
- **UI-08 / UI-12:** Add to Main Queue returns 409 "This changed since you loaded it" with 9 rostered
  players. Trace: PATCH court-fill 200, then POST matches 409. Cause not confirmed.
- **UI-17:** Send request closes the sheet with no POST sent. Cause (app or test) not confirmed.
- **UI-17 "I'm here"** (`test.fixme`): self check-in has no real route.

### Match-request defects

No route defects (REG-17..21 pass). One open product question: adding match requests can push a
player below the pass rule. With the requests plugin on its own random stream, REG-08 left P14
(present all 180 min) at 7 games against a target of 8. REG-08 is green only on the shared stream.
Undecided: should the Queue Master's Add to queue guard players below the minimum?
