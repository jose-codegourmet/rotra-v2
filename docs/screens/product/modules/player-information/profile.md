# Public and own player profile

**Surfaces:** `P-PUBLIC-PROFILE`, `P-OWN-PROFILE`, `P-EDIT-PROFILE`.

**Source:** [Player Information scope](../../../../business_logic/product/player-information/README.md), [identity](../../../../business_logic/product/player-information/modules/identity/README.md).

## P-PUBLIC-PROFILE — Public identity

Accessible without login. Show player full/display name, nickname, optional avatar, permanent RTR ID, skill label, and overall leaderboard position only when eligible. Provide readable rank-status explanation rather than a fake position of zero.

Supporting sections: permitted personal/playing-style information, optional experience, supported social links subject to the final visibility policy, and a read-only match-history entry point. Keep the product lean; do not add posts, followers, private messaging, equipment commerce, or club-discovery maps.

Never show phone/email, claim status secrets, reset links, pending contact-change evidence, or private club Off Day labels. Club-assigned local levels may differ from shared rank; do not suggest every club must pair the player at the public level.

RTR ID retains the original club founding-city/date context. Do not display it as proof of current residence or current club membership. No separate City/National/World ranking badge.

## Profile states

| State | Presentation |
|---|---|
| Newly created, sparse history | Real identity plus provisional/no-calculation explanation; no invented numeric rating |
| Below leaderboard threshold | Profile remains public; explain no overall position yet |
| Eligible | Show skill label and global position from a fresh accepted projection |
| Needs reassessment | Keep old label visible with that status; no active leaderboard position |
| Rank update processing | Distinguish last calculated data from pending session update |
| Not found | Neutral unavailable profile; never redirect to a same-name player automatically |
| Offline cached | Show cached age; no edits claimed saved to server |

Unclaimed profiles can exist without a login; the public view does not let any visitor claim one by clicking its public ID. Account-link delivery remains operator-issued.

## P-OWN-PROFILE — Signed-in owner view

Start from the same public identity with clearly separated private account controls: Edit profile, My player ID/QR, phone privacy, read-only phone/email, contact-change request, and sign out.

Explain which fields are public before saving personal edits. Do not show a player-facing edit control for rank, local assessment, match scores, wins/losses, or eligibility. A player can see their own contact values; that does not make those values public.

A prompt to finish optional profile details is not a blocking onboarding gate or EXP reward system. Required contact completeness was handled at registration.

## P-EDIT-PROFILE — Personal information only

Editable: agreed personal name/nickname and supported optional social/playing-style/experience fields. Avatar editing is a composition proposal dependent on the existing file/identity design, not a promised external avatar provider.

Phone and email are read-only with **Request a change**. Their fields must not become editable through a generic form payload or hidden input. Permanent RTR ID is read-only.

Save validates actual supported fields, preserves values on error, and shows success only after server persistence. Cancel returns without changing stored details. If navigating away with unsaved edits, a proposed discard prompt may protect the draft; it does not finalize any session.

Offline personal editing is not an agreed offline product feature. Keep a visible unsaved local draft if desired, but require internet to save and do not queue identity changes as if automatically approved.

Invalid links/experience values: actionable inline errors. Social links must be treated as links, not authentication tokens or verified achievement claims. Personal experience does not directly award rank points.

## Acceptance examples

- A player's new name does not create another RTR ID.
- Needs reassessment preserves the old label without retaining leaderboard placement.
- Editing a profile cannot change phone/email or any game result.
- Private Off Day results never become a permanent public badge.
