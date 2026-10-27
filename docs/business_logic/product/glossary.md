# V1 vocabulary

**Status:** Target product language. Updated October 26, 2026.

| Term | Meaning |
|---|---|
| Queue Session | Whole club event, such as 8–11 PM |
| Queue Master / QM / club operator | Person operating the club account; one authority in v1 |
| Prepared / Active / Finalized / Invalid | Session states: before start, running, validly finished, untrusted records |
| Slot | Operator-confirmed place in a session |
| Slot budget | Players per reserved court × courts; how many slots a session has |
| Session link | A session's public page URL, shared by the club; guests can request a slot from it |
| Join request | A guest's request for a slot sent from the session link; holds nothing until the Queue Master confirms or declines it |
| Waitlist | First-come list of players added after the slots filled; the operator gives them slots |
| Present | Operator switch making a roster player available to automatic generation |
| Available | Present and not on a court right now |
| Wait time | Minutes since a player's last game ended, or since they were marked present; derived, not a status |
| Saved club player | Remembered player, not necessarily a formal club member |
| Guest | Name-only entrant without a linked Player Information profile |
| Lookup pending | New player entered with a phone; profile is matched or created when the session syncs |
| Unclaimed profile | Phone-linked identity not yet claimed through registration |
| Registered player | Claimed profile with required phone/email and password |
| Player ID / RTR ID | Permanent RTR identifier assigned on first profile sync, e.g. `RTR-PH-CEB-031526-0001` |
| Shared rank | Cross-club rank shown in Player Information |
| Playing level | One of nine: Beginner, Intermediate or Advanced, each Low, Mid or High |
| Club assessment | Latest of the nine levels assigned by one club |
| Session playing level | Club-assigned level locked for the session |
| Calculated minimum | Minimum-games target estimated from courts, length, players, and formats; the low end of the estimate |
| Open until | A court's closing time: the session end, or an earlier set time; a reminder, never a hard stop |
| Booking ended | A court past its closing time |
| Manual | Operator builds lineup slot by slot |
| Make match | Operator selects players; ROTRA picks the format from the count and balances teams |
| Suggest | ROTRA proposes one lineup with a reason, for approval |
| Auto queue | Generates several waiting matches at once; starts still need operator confirmation |
| Session mode | Chill, Fair, or Hard pairing preset |
| Waiting queue | One ordered match list shared by all courts; order is a suggestion |
| Match number | Fixed number of a match in the order it was created (Match 1, 2, …) |
| Queue position | Current place in the waiting queue (#1, #2, …); changes as matches move |
| Ready to start | Waiting match whose players are present and free, with enough free courts |
| Next eligible | First ready match in queue order, proposed to a free court |
| Needs attention | Waiting match with a broken lineup (incomplete or a player not present) |
| Blocked | Waiting match held only because a player is still playing or courts are busy |
| Protected manual match | Created or edited by the operator; regeneration keeps it unless it needs attention |
| Standard match | Singles/doubles, potentially eligible for long-term performance |
| Fun match | 1v2, 3v3, 4v4, or 5v5; counted locally, not in long-term performance |
| Match done | Confirmed winner and optional score; court(s) freed |
| Invalid match | No game, win, loss, or minimum-game credit; court(s) freed |
| Live leaderboard | Operator's running standings during the session; not official history |
| Session done | Online finalization after sync/reconciliation, with no game in play |
| Invalid session | Unrecoverable/untrusted records; no performance contribution or slides |
| Session record | Read-only view of a completed or invalid session |
| Publish | Optional result sharing on the public page, separate from player/rank sync |
| Off Day | Below-baseline session performance; private unless explicitly shared |
| Cost estimate | Optional court + shuttle + entrance-fee cost for a session, with the payment per player and the resulting profit or loss |
| Break-even | Total estimated cost ÷ players, rounded up; the default payment per player |
| Payment per player | The full amount each player pays: break-even (automatic) or a custom amount per head; the estimate shows the profit or loss |
| Entrance fee | Misc per-head cost some venues charge; listed in the costs for transparency, covered by the payment per player |
| Inventory | Club's list of shuttlecocks, equipment, and other items with stock and cost per unit |
| Running low | Inventory item with 2 or fewer left |
| Needs reassessment | Old rank remains visible after three months without play; leaderboard return requires reassessment and eligibility |

Use **Queue**, not legacy **Que**, in new business copy. Product name is **ROTRA**; the requested slide footer is exactly **“powered by rotra”**.
