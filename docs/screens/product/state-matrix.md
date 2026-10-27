# Cross-product states and permissions

**Status:** Screen behavior contract. A proposed screen cannot weaken these agreed access/result boundaries.

## Connectivity and persistence

| Action | Online | Downloaded Queue session offline | Reconnected with missing original records |
|---|---|---|---|
| Club sign-in | Allowed | Unavailable (“Signing in needs an internet connection.”) | — |
| Create new session / save setup edits | Allowed with license | Form can be filled; Save disabled; draft cannot run | Requires online creation, not a reconstructed local event |
| Start session | Allowed with levels set, license, no other active session | Allowed only with a downloaded copy | Sync start as a pending change |
| Add/remove free court, extend time | Allowed | Allowed locally | Sync; public end time changes after sync |
| Download session to this device | Allowed | Unavailable | Refresh from server while preserving local pending work |
| Search club saved players | Server/current data | Downloaded subset | Reconcile local additions/links |
| Search uncached global profile | Allowed | Unavailable; pending local entry permitted | Resolve without duplicate creation |
| Add player/assign late-entry level | Allowed | Allowed locally in downloaded session | Sync/reconcile; no mid-session reassessment |
| Toggle presence | Allowed | Allowed locally | Flag conflicts/affected waiting lineups |
| Manual/Suggest/Auto generation | Allowed | Supported using available downloaded inputs | Revalidate before accepting conflicting work |
| Edit/reorder/regenerate waiting queue | Allowed | Allowed locally | Preserve healthy protected manual edits; no silent overwrite |
| Start match | Operator confirmation plus eligibility | Local confirmation plus downloaded authorization; cannot prove unseen remote state | Conflicting occupancy requires review |
| Substitute | Allowed with available replacement | Allowed and durable locally | Retain outgoing/incoming evidence |
| Confirm winner/invalid match | Permanent after confirmation | Permanent locally, pending sync | No ordinary edit/undo path |
| Session done | Only after complete reconciliation, no pending changes, and no game in play | Unavailable | Blocked until required originals and conflicts are resolved |
| Cost estimate (setup step) | Saved with the session | Editable in the unsaved draft only | — |
| Inventory edits | Allowed | Not specified (open decision) | — |
| Payments checklist (tick paid / not paid) | Allowed | Allowed locally | Sync as pending changes |
| Guest sends a join request (public page) | Allowed while requests are on and the session is prepared or live | Not possible offline for the guest; the request goes straight to the server | — |
| Confirm or decline a join request | Allowed | Allowed locally on a downloaded session (requests received before going offline) | Sync as pending roster changes |
| Club settings (club details, name-change request, password, license page) | Allowed | Unavailable (“Club settings need an internet connection.”) | — |
| Reduce or add courts / players per court in a prepared session | Saved with setup; roster over budget moves to the front of the waitlist, new slots fill from it | Save disabled | — |
| Generate final result slides | After valid finalization | Unavailable for an unfinished session | Wait for valid finalization |
| Publish/download new results | From available valid finalized output and allowed access | No offline finalization workaround | Do not publish unverified provisional results |
| Claim player/login/reset | Requires server-backed flow | Not a Queue offline feature | Resume the same account flow safely |
| Change player personal fields | Requires accepted server save | Do not claim a local draft is saved remotely | Validate current account revision |
| Admin activation/approval/configuration | Online | Unavailable | Recover request status before retrying |

## Club entitlement

| License/session condition | Allowed screen access |
|---|---|
| Active license, no active session | Normal permitted club preparation/history/player access |
| Active license, one active session | Normal access; continue that session; another session cannot start |
| Expired license, no active exception | Access gate; no saved-player list, inventory, club settings, or past reports |
| Expired license, already-active authorized session | Bounded continuation, finishing and sync of that session only |
| Status cannot be verified offline | Apply approved cached-authorization policy; do not call it definitively expired or unrestricted |
| Expired public pages before deletion | Stale state; precise remaining visibility awaits policy |
| Renewed before deletion | Restore retained pages/cancel cycle; club access follows accepted renewal |
| Public pages deleted after continuous expiry | Unavailable page; retained player history/rank still separate |

## Player identity

| State | Session participation | Global profile/account | Allowed identification |
|---|---|---|---|
| Name-only guest | Operator confirms slot and full level | No automatic profile/account | Saved club entry; no invented RTR ID |
| Phone supplied, pending resolution | Can participate; link pending when offline | Eligible creation/linking on allowed sync | Confirm phone in person; resolve conflicts online |
| Unclaimed linked profile | Can participate | Public identity may exist; login not yet established | Phone when permitted, existing RTR ID |
| Registered, phone visible to club | Can participate | Phone/email + password login | Confirm phone or ID/QR |
| Registered, phone hidden | Can participate | Same account; contacts absent publicly | ID/QR, no forced reveal |
| Contact-change requested | Participation unchanged | Existing contact remains until applied | Same permanent RTR ID |

## Match and participant counting

| Situation | Court release | Paid minimum | Session W/L/awards | Long-term performance/eligibility |
|---|---|---|---|---|
| Waiting lineup removed | No court was occupied | None | None | None |
| Completed standard match, full participant | On permanent result | Counts | Counts, subject to award rules | Eligible after valid Session done |
| Completed fun match, full participant | On permanent result; one court, two for 5v5 | Counts | W/L count; may contribute to local MVP | Excluded |
| Pre-start replacement, completes full match | Normal completion | Counts | Normal full-participant rules | Standard game can qualify |
| Mid-game outgoing/incoming substitute | Only game completion/invalidation releases court | Does not count for either partial player | No W/L, game, or award credit for either | Excluded for both partial players |
| Invalid match | On confirmed invalidation | None | No recorded game/win/loss | None |
| Invalid session | Session-slot release policy unresolved | No official finalized credit | No official results/slides | None |

## Rank and award gates

- Overall leaderboard: configured number of completed full standard games in the last three months, initially ten.
- Needs reassessment after three months without play: old label visible, no overall position. Return requires a fresh assessment/new completed session and the rolling count.
- Most Improved/Off Day: five **previous sessions at the same club** within three months, current session excluded. Returning guests can qualify.
- MVP: no five-session history requirement; relative performance rather than just wins. Exact formula still pending.
- No history or missing formula output is not zero performance; render an honest pending/insufficient-evidence state.

## Save failures and finality

Local durability failure is different from network failure. If the local confirmation was saved, show its permanent result with pending sync. If not saved, keep the original unresolved state. Repeated taps/retries recover the same action result.

A conflict is not permission to open a generic winner editor. Accepted unchanged records stay locked. Missing original-device records cannot be reconstructed through Admin or another device.
