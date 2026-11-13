# Product guidelines — backend

These point at the repo's rules rather than restating them.

## Words

[product-terms.md](../docs/product-terms.md) only: **Queue** (never "Que"), Queue Session, Queue
Master, **invalid** (never "void"), **ROTRA** in caps. Go identifiers follow
[product terms §12](../docs/product-terms.md#12-term--code-identifier).

## Principles

1. **The contract is the existing Route Handler.** A moved area returns the same JSON, status codes
   and error shapes as `@rotra/db/service/{errors,serialize}`. Screens and hooks don't change.
2. **Never invent behavior.** The business docs say what a rule is; open decisions are asked, not
   guessed ([ways-of-working §10](../docs/ways-of-working.md#10-stop-and-ask)).
3. **Money, ranking, permanent results, auth, contacts, migrations: ask first.**
4. **Server cost matters** (D-2026-11-09-09): cache the session snapshot, check sign-in without a
   network round trip, one API instance until measured otherwise.
5. **Privacy stays as decided**: masked names for visitors, own standing only, unpublished results
   out of page data, private contacts never in public reads.

## Errors

Same error contract as today: the error codes and messages the apps already map. Sign-in failures
return one generic credential error.
