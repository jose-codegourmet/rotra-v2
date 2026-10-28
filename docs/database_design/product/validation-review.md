# Database design validation

**Reviewed:** October 28, 2026. **Repository baseline:** `26ffacb`.
**Scope:** the proposed database, its business rules, the screens that depend on it, and representative mock fetchers. This is a design review, not a validation of a running Supabase database.

**Verdict: the foundation is sound, but the design is not ready for migrations.** Keep the main relationships. Resolve the concrete inconsistencies below and approve the remaining product rules before implementing the affected areas. The largest risks are offline reconciliation, identity claiming, payment-mark lifecycle, and enforcing permissions across Supabase Auth and application data.

The [implementation plan](implementation-plan.md) follows this review. It proposes work; it does not approve new fields, endpoints, dependencies, migrations, or product behavior.

## Reconciliation status — October 28, 2026

The findings below preserve the original review of `26ffacb`. [F07.1 #242](https://github.com/jose-codegourmet/rotra-v2/issues/242)
rechecked the current interfaces at `7d7029d` and corrected settled source drift; historical wording
below is not a claim that every cited mismatch still exists.

| Finding | Source correction / remaining decision |
|---|---|
| R1–R2 | Payment lifecycle, roster removal/demotion identity and assessment eligibility remain [#245](https://github.com/jose-codegourmet/rotra-v2/issues/245). Removed the unsupported claim that prepared roster rows are always safe to delete |
| R3 | Roster doc now requires displaced players ahead of existing waiters without claiming timestamp copying guarantees it. Durable ordering/ties/concurrency remain #245 |
| R4 | Guest invitation, claims and historical identity proof remain [#244](https://github.com/jose-codegourmet/rotra-v2/issues/244) |
| R5 | Visitor status ownership remains [#248](https://github.com/jose-codegourmet/rotra-v2/issues/248) |
| R6 | Added required unique club-name enforcement and distinguished a newly Free club from retained paid prices. Comparison/nullability/renewal remain #245 |
| R7 | Corrected court-cost centavo rounding and whole-peso break-even conversion; no-fee marks, bounds and price snapshots remain #245 |
| R8 | [Command contracts](command-contracts.md) map actors, current interfaces, errors and gaps. Actual access/transport design remains [#243](https://github.com/jose-codegourmet/rotra-v2/issues/243)/#244/#248 |
| R9 | [Schema dependencies](schema-dependencies.md) exposes provenance and insertion cycles. Offline authority, numbering and invalid-session release/recovery reconciliation remain [#246](https://github.com/jose-codegourmet/rotra-v2/issues/246) |
| R10 | Corrected partial-player zero credit and reference divisor 8 → 2. Production calculations, time windows and projection visibility remain [#247](https://github.com/jose-codegourmet/rotra-v2/issues/247) |

The inventory now includes venues, waitlist, join/name requests and manual payment marks; financial
and public-join screen statements match the settled flows; the saved-player table distinguishes
unclaimed identity checks from missing-level confirmation. Architecture/root guidance describes
observed mock code and the additional backend/offline work. Prepared-level nullability remains
explicitly unresolved. The invalid-session recovery discrepancy still needs the referenced owner
decision reconciled in #246; no revival workflow is introduced.

These are documentation changes. The callable catalog was checked against source symbols and
signatures; no database, auth, migration, privacy or offline-runtime guarantee follows from it.

## What is already solid

| Design choice | Why it should stay |
|---|---|
| Player identity independent of sign-in | Supports unclaimed profiles and keeps history stable when contacts or credentials change. |
| Club player separate from global player | Name-only guests can play and build local history without fake accounts. |
| Club/session-scoped relationships | Composite foreign keys prevent a valid identifier from another club or session being attached accidentally. |
| Session levels frozen separately from current rank | Future reassessments cannot change the strength context of past games. |
| Permanent match decisions and participation segments | Preserves winners, optional scores, and substitution evidence. |
| Player/court holds acquired together | A concurrent match start cannot partially occupy courts or players in the accepted server state. |
| Stable operation IDs and atomic receipts | Retrying an upload need not count the same action twice. |
| Finalization separate from publication | Private results can update player history without publishing slides. |
| Public-page deletion separate from permanent facts | License expiry cannot accidentally delete earned match history. |
| Versioned rank inputs and scheduled ageing | A rolling leaderboard can change when evidence expires, even without new games. |

Sources: [conventions](conventions.md), [matches](queue/modules/matches-queue.md), [sync](queue/modules/offline-sync.md), [transactions](transactions.md), [ranking](player-information/modules/ranking.md), and [access/retention](access-retention.md).

## Findings that affect correctness

### R1 Payment marks have no complete offline or post-session contract

**Priority: resolve before implementing payments or sealing session streams.**

[Financial business rules](../../business_logic/product/queue/modules/financials/README.md#payments-checklist) allow paid marks before, during, and after the session, including offline, and preserve the amount due when marked. But [downloads](transactions.md#1-createdownload-and-reserve-a-session) exclude estimates and inventory, while [sync sealing](queue/modules/offline-sync.md#finalization-barrier) closes the session's operation boundary. The design does not explain how an offline device obtains the correct fee or uploads an allowed payment change after Session done.

There is also no explicit representation for a paid tick when no fee was set. The conventions distinguish unset amounts from zero. The current [mock payment fetcher](../../../packages/data/src/session-payment/fetchers.ts) falls back to zero; that is mock behavior, not a settled rule for real financial evidence.

**Required specification:** define the permitted downloaded payment information, how its age is shown/handled, the treatment of no-fee marks, and a revisioned, idempotent payment write lifecycle that cannot reopen match results. Keep estimate editing online. Decide the behavior before choosing additional storage fields or command boundaries.

**Acceptance:** a player is marked paid offline, the response is lost during sync, and the same recorded amount appears once after reconnecting. A later allowed payment update succeeds after finalization without changing a winner, rank input, or result snapshot.

### R2 Roster deletion conflicts with payment and assessment references

**Priority: resolve before roster migrations.**

[Roster rules](queue/modules/sessions-roster.md#session_players) permit deleting prepared roster entries. Budget reductions move players from the roster to the waitlist, and Give slot inserts a roster row. [Payment marks](queue/modules/financials-inventory.md#session_payment_marks) reference that roster entry; [assessments](player-information/modules/ranking.md#club_assessments) also reference it.

A restrictive foreign key can block removal. A cascading delete can erase a paid mark or already-synced assessment. Recreating a roster row can disconnect the old payment from the returning player. The [decision register](open-decisions.md) already identifies paid-mark retention and assessment eligibility as open, but the proposed records must agree with the eventual answer.

**Required specification:** settle payment retention on demotion/removal and the eligibility of already-synced assessments. Then define whether the participation identity is preserved or how references survive transitions. Do not pick cascading deletion merely to make the command work.

**Acceptance:** mark paid, reduce capacity, restore capacity, and inspect the mark and assessment history; also remove a prepared player whose assessment already synced. Every outcome must match the approved rule.

### R3 Timestamp sorting does not guarantee the promised waitlist priority

**Priority: fix before roster implementation; the intended behavior is already documented.**

[Business rules](../../business_logic/product/queue/modules/players/README.md#slots-and-waitlist) put displaced roster players ahead of everyone already waiting. The [database proposal](queue/modules/sessions-roster.md#session_waitlist) copies `confirmed_at` into `added_at`, while confirmed join requests may enter the waitlist with their earlier `requested_at`.

Example: a request arrives at 18:00, another player gets a slot at 18:05, and the older request is confirmed onto the full waitlist at 18:10. Reducing capacity displaces the 18:05 player. Sorting only those timestamps puts the existing 18:00 waiter first, contrary to the promised front-of-waitlist behavior. Equal timestamps and repeated demotion/promotion also need deterministic ordering.

**Required specification:** define ordering separately from the historical arrival/confirmation times, including ties and concurrent updates. Select the physical representation during reviewed schema design. The mock's timestamp adjustment is not a substitute for a documented durable ordering contract.

### R4 Guest invitations are not covered by the claim-link relationship

**Priority: resolve before real registration.**

[Saved-player screens](../../screens/product/modules/queue/players-roster.md#q-saved-players--club-player-list) offer Invite for both guests and unclaimed profiles. A guest has no global `player_id`, but [claim links](player-information/modules/identity.md#registration-links) require a global player reference and claim an existing profile. The design only explains the second case.

**Required specification:** explain how a name-only guest invitation obtains a phone-linked identity, handles an already-existing phone, and becomes a one-time claim without creating duplicates. The owner has now approved including earlier valid guest games after identity confirmation; the invitation/proof mechanism still needs specification. Do not quietly turn a public RTR ID or a name match into a claim credential.

### R5 A visitor's own join-request status lacks an ownership contract

**Priority: resolve before exposing real public join requests.**

[Q-PUBLIC-JOIN](../../screens/product/modules/queue/public-session.md#q-public-join--guest-join-request) shows the same visitor their pending/confirmed/declined status without sign-in. [The database request](queue/modules/sessions-roster.md#session_join_requests) stores the request but does not specify how subsequent reads prove ownership. The mock uses an in-memory request map that resets on reload in [public-session/fetchers.ts](../../../packages/data/src/public-session/fetchers.ts).

**Required specification:** approve a private visitor receipt/session mechanism, its lifetime and lost-receipt behavior, retry deduplication, and server-side access checks. A session slug or caller-supplied request ID alone must not grant access to arbitrary requests. Public responses must never include request phones. Rate limiting is already proposed, but is not ownership verification.

### R6 Club creation constraints are incomplete for agreed screens

**Priority: fix before club/licensing migrations.**

[A-ADD-CLUB](../../screens/product/modules/admin/clubs-licenses.md#a-add-club--add-a-club) requires unique club names and permits creating a Free club without entering a paid price. [The database model](admin/modules/clubs-licenses.md) explicitly makes usernames unique, but does not specify the corresponding club-name uniqueness enforcement. It describes both saved paid prices as positive and does not explain a newly created free club that has never had a paid price.

**Required specification:** add the already-required club-name invariant to the constraint/command checklist, applying it to approved name changes too. Define price nullability and conditional validation for new free clubs versus previously paid clubs. Choose and document name comparison rules. Never invent a previous paid price or rewrite historical terms when prices change.

### R7 Money units and rounding are inconsistent across the docs

**Priority: fix before financial implementation.**

[Conventions](conventions.md#types-and-identifiers) use centavos. [The database calculation](queue/modules/financials-inventory.md#calculation) says `ceil(total / players)` without converting units. [The business rule](../../business_logic/product/queue/modules/financials/README.md#session-cost-estimate) rounds break-even up to a whole peso and, as of October 28, rounds court cost to the nearest centavo. [Existing pure rules](../../../packages/data/src/session-cost/sessionCost.rules.ts) make this distinction.

Example: 100 centavos shared by three players is a ₱1 charge per player under whole-peso rounding, not 34 centavos. Specify units at every calculation boundary, valid amount ranges, rounding order, and how collected totals use the amounts recorded at the time of each tick. Preserve the existing required money tests; do not create an alternative server formula.

### R8 Supabase permissions are principles, not yet an executable access design

**Priority: complete before real user data.**

[Access/retention](access-retention.md#server-and-supabase-boundary) correctly warns that an elevated Prisma connection can bypass RLS. However, physical schema exposure, database roles, per-command privileges, and authorization enforcement are still proposals. Browser-side gating and an application-only phone/email form restriction are insufficient by themselves.

**Required specification:** map every command/read to public visitor, player, club, platform owner, or worker. Resolve identities from verified sessions and server-owned account mappings; validate ownership on every request. Choose actual database privileges and exposed schemas. Prove that alternate Supabase Data API/Auth paths cannot bypass approved contact changes, claim another identity, expose private data, or edit terminal decisions. Provider contact changes need their own enforcement/reconciliation design, beyond RLS on application tables.

Supabase documents [RLS and privileged-role bypass](https://supabase.com/docs/guides/database/postgres/row-level-security); Next.js documents [authorization in Route Handlers](https://nextjs.org/docs/app/guides/authentication#route-handlers). These support the enforcement approach; they do not establish ROTRA's unresolved account policy.

### R9 Offline integrity is well reasoned but still blocks a live rollout

**Priority: mandatory before clubs rely on real results.**

[Offline-sync](queue/modules/offline-sync.md), [match numbering](queue/modules/matches-queue.md#matches), and [the decision register](open-decisions.md) explicitly leave enrollment, reservation lifecycle, concurrent match numbering, clock handling, and conflicting permanent results unresolved.

The protocol sensibly tracks contiguous operations and seals. That cannot decide which contradictory confirmed winner is true, or preserve one chronological Match 1, Match 2 sequence across disconnected writers by itself. Device-scoped number blocks avoid collisions but do not necessarily satisfy the agreed global creation order. An unused downloaded device also needs a defined closure rule so it does not block a whole night's finalization forever.

**Required specification:** work through two-device examples before building the engine. Define allowed recovery, authoritative conflict selection, numbering, expiry and reservation release, and how each enrolled stream finishes. Do not substitute last-write-wins, fabricate a missing device's seal, or reconstruct lost results.

### R10 Ranking and award storage is promising; the calculations cannot be validated yet

**Priority: mandatory before official ranks and awards.**

[Ranking](player-information/modules/ranking.md) correctly preserves evidence, distinguishes missing data from zero, and schedules expiry. But [business decisions](../../business_logic/product/open-decisions.md) still leave the formula, sparse data, three-month boundary, ties, assessment eligibility, and policy-change timing open.

[Results storage](queue/modules/results-publication.md) also contains two stale statements: partial-player local credit is called undecided even though the same file and business rules exclude it; the reference award divisor is 8, while the [nine-level business reference](../../business_logic/product/queue/modules/results/README.md#reference-award-formula) uses 2. Correcting this reference does **not** approve the prototype formula for production.

**Required specification:** approved worked examples and expected outcomes for ranking, local standings, and awards; versioned input/configuration contracts; a defined moment when a recalculation becomes visible. Do not label player records/ranks updated until the relevant work has succeeded.

## Documentation reconciliation

These are additional corrections to make in the source docs before implementation. This review records them without silently changing existing decisions.

| Source mismatch | Resolution needed |
|---|---|
| Database [inventory](README.md#proposed-entity-inventory) and [conventions](conventions.md#types-and-identifiers) say no payment records, while the financial module defines manual marks and licenses retain external payment history | Say precisely that ROTRA does not collect money; include manual payment marks in the inventory. Also reconcile omitted venues, waitlist, join requests, and name-change requests. |
| [Session record Financials](../../screens/product/modules/queue/results-sharing.md#q-history--session-record) says ROTRA does not track payments, then includes the payment checklist | Remove the obsolete exclusion; distinguish financial edits from immutable match results. |
| [Public-session acceptance](../../screens/product/modules/queue/public-session.md#acceptance-examples) says no join controls, although the same file specifies Request to join | Remove the stale acceptance example. Guests request; only the Queue Master grants a slot. |
| [Roster level field](queue/modules/sessions-roster.md#session_players) is called required and later nullable during preparation; business says a level is required to confirm, screens include missing-level prepared rows | Define which prepared states can actually persist with no level. A defensive Start check does not itself prove the column must be nullable. |
| [Business recovery](../../business_logic/product/queue/modules/offline/README.md) and database decisions leave revival of invalid sessions open, but [screen recovery](../../screens/product/modules/queue/offline-recovery.md#q-unrecoverable--original-records-unavailable) records an explicit decision that invalidity is permanent | Locate/confirm the referenced owner decision and propagate it to the other sources. Do not offer revival while reconciling the record. Active-slot release remains separately open. |
| [Saved-player source table](../../business_logic/product/queue/modules/players/README.md#entry-and-identity) says no extra check, while its following text and Q-IDENTIFY require one for every unclaimed profile | Make the table distinguish claimed, unclaimed, and missing-level cases. |
| [Architecture](../../architecture.md#5-data-flow) says only fetchers change for real data | Keep this as the UI compatibility goal. Document that auth, route handlers, server services, durable local storage, sync, and cache ownership must also be implemented. |
| [Root guidance](../../../AGENTS.md) describes almost only a Foundation scaffold | The inspected checkout contains substantial mock modules. Update implementation-status wording from a fresh inventory; file existence does not prove the flows work. |

## Product decisions to settle in manageable groups

The owner answered the first three questions on October 28, 2026:

- Create phone-linked profiles and permanent RTR IDs as soon as the entry successfully syncs; do not wait for Session done.
- Include earlier valid guest games in personal history and ranking after identity confirmation, under existing eligibility/window rules. Preserve original outcomes/dates and avoid duplicate contribution.
- Test online operation privately first; offline operation and recovery remain required before live club use.

These resolve product direction, not the remaining proof/linkage mechanism or ranking formulas. They are recorded in the source decision registers and the implementation plan.

| Before this work | Plain-language decisions still needed |
|---|---|
| Identity and registration | How does a name-only guest's invitation work? Who confirms historical guest identity, and with what evidence? How are wrong/duplicate identities and contacts resolved? How long do claim links last? |
| Roster and payments | What happens to paid marks and assessments when someone loses/removes a slot? What does paid mean when no fee was entered? Which saved fee applies while a device is offline? |
| Clubs and access | How do early renewals extend a license? How does the owner sign in and reset a club password? How are offline starts authorized and reservations released? |
| Offline completion | How does a second device take over? How are conflicting confirmed records selected? How are match numbers displayed consistently? What closes a device download that was never used? |
| Rankings and results | Approve worked ranking/award examples, tied standings, three-month/timezone boundaries, no-show assessments, and how setting changes take effect. |
| Public release and retention | Which social/history fields are public? What remains visible on an expired club's stale page? What can be restored after actual deletion? How long are private intake, device caches, diagnostic logs, and private exports kept? |

Existing [business](../../business_logic/product/open-decisions.md), [screen](../../screens/product/open-decisions.md), and [database](open-decisions.md) registers remain authoritative for unresolved questions. Resolve each before its dependent work, rather than reopening every decision at once.

## Verification and limits

- Reviewed all nine detailed database entity-group modules, conventions, transactions, access/retention, and database decisions against the relevant business modules and screen contracts.
- Inspected representative mock auth, public-session, payment, session, and cost-rule code for integration assumptions. No full code audit or running-flow claim is made.
- The inspected checkout has no `packages/db` directory or app Route Handler files in the searched app trees; all three apps declare Next.js `16.4.3`. No `.codegraph` index was present.
- Checked current Supabase documentation and its changelog on October 28, 2026. Pooling, SSR session verification, RLS, and account-provider setup must be rechecked against selected versions during implementation.
- No Supabase project was queried or changed. No SQL, Prisma schema, migration, dependency, or UI was modified. After the initial review, the owner's three answers were propagated into the relevant business, screen, database, and planning docs. No build or runtime test was needed for these documentation changes; database constraints, privacy enforcement, recovery, and performance remain untested until implemented.
