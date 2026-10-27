# Design decisions before migrations

**Status:** Review register, not a questionnaire or approval request for writing these docs.

This design is concrete enough to review but not safe to translate mechanically into migrations. The [business open decisions](../../business_logic/product/open-decisions.md) still apply.

## Technical proposals introduced here

| Proposal | Why | Unresolved consequence |
|---|---|---|
| One PostgreSQL database, logical product ownership | Shared identity and atomic finalization | Physical schemas/worker boundaries |
| Player UUID independent from auth UUID | Unclaimed profiles and permanent history | Migration and account-provider mapping |
| Club-local player with optional global link | Guest participation and offline identity | Guest-history backfill and duplicate resolution |
| Session reservation before offline start authorization | Prevent a second distinct offline active session | When reservation is acquired/released; no new requirement that all downloads reserve a slot |
| Enrolled device streams with contiguous sequence and final seals | Detect missing original records before Session done | Device 2 provisioning; conflicting terminal decisions; unknown/unregistered device prevention |
| Immutable decisions plus conflict quarantine | Preserve touch-move while reconciling | Who selects among conflicting confirmed facts and what selection means |
| Versioned finalization facts and rank jobs | Retry safely without double contribution | Projection delay UX and exact atomic visibility across products |
| Separate publication data and expiry-cycle IDs | Safe deletion without losing histories | Internal-data retention and restoration after actual deletion |

## Blocking unresolved details

- Exact numerical ranking/performance model, label thresholds, global tie behavior, and policy-change retroactivity.
- Three calendar months versus a day count, and canonical timezone for ID dates/window cutoffs.
- Authentication provider support/configuration for club username login and player phone-or-email password login; email claim/recovery verification.
- Whether new profiles/IDs are created on intermediate sync or only valid finalization. Private intake can be staged either way.
- Whether assessments for no-shows, roster entries removed during preparation, or invalid sessions remain eligible; assessment changes already sync immediately, independently of match performance.
- Exact award evidence calculations (partial substitutes are now excluded from local standings and awards).
- Interrupted-device conflict resolution versus irreversible winners. Never implement last-write-wins as an accidental answer.
- Long-term policy for finalization with active games (v1 refuses it); whether unused waiting matches are kept frozen or marked removed; recovery of a session already marked invalid.
- Collision-free `match_no` allocation across offline devices.
- Whether shuttle plan lines snapshot the inventory unit cost at save time (the prototype uses the live price).
- What happens to a paid mark when a budget reduction moves that player to the waitlist (the prototype keeps it and shows it again if they regain a slot; `session_payment_marks` keys on the roster entry).
- Offline inventory edits, automatic stock deduction, and non-peso currencies.
- Phone/contact conflict handling and aliasing duplicate offline club-player IDs without rewriting confirmed history.
- City/country code registry, sequence formatting above 9999, and founding-location corrections.
- Renewal dates and overlapping terms, refunds, offline expiry enforcement, flag targeting, and when offline devices pick up flag changes. (Per-club prices, free tester clubs, owner-added clubs and owner-created flags were settled October 27, 2026.)

## Design limits

A database can enforce uniqueness and atomicity for records it has received. It cannot know about arbitrary never-enrolled offline devices, prove a device's unsent work is absent, remotely revoke already-cached data, or infer the true winner from contradictory signed/confirmed inputs. Enrollment, seals, review, and explicit unresolved states are necessary rather than claims of perfect automatic merging.

No production tables were queried, and no SQL/schema/migrations were applied. The existing-schema comparison is repository evidence only.
