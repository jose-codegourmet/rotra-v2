# Player oversight and contact-change requests

**Surfaces:** `A-PLAYERS`, `A-PLAYER-DETAIL`, `A-CONTACT-REQUESTS`, `A-CONTACT-REVIEW`.

**Source:** [player management rules](../../../../business_logic/product/admin/modules/player-management/README.md).

## A-PLAYERS — Identity directory

Show name/nickname, permanent RTR ID, claimed/unclaimed identity state, shared-rank status, and sufficient permitted internal identifiers to locate a request. Phone/email search is privileged internal functionality only if the identity-access design permits it; it must not leak into public search.

No fake row for every name-only guest is required: guests may exist only in club records. If an identity search has duplicates/conflicts, surface that explicitly rather than merging by display name.

Pagination/search errors retain context. An empty result offers a correction to the search, not automatic account creation.

## A-PLAYER-DETAIL — Internal identity view

Separate sections:

1. Permanent identity and public profile fields.
2. Private current phone/email and their relevant verification/application state.
3. Claimed account link/status and phone privacy preference.
4. Pending contact-change requests.
5. Read-only rank/history context needed for support.

Profile information oversight does not automatically authorize a rank editor, winner/score changes, hidden-contact sharing with clubs, account merging, or deleting retained game history. Broad non-contact personal-edit rights remain to be specified.

Current contacts should reflect actual usable account state, not a merely approved but unapplied request. Audit/support details must not contain passwords or reusable recovery/claim tokens.

## A-CONTACT-REQUESTS — Review list

Rows: player/ID, requested field, request time, review/application status, and next permitted action. Proposed filters mirror actual Pending, Approved/applying, Applied, and Failed/needs-attention states. Rejected/not-approved representation awaits final policy but must not appear Applied.

Open review against the correct permanent ID, not a name-only match. Repeated requests for the same field need defined conflict behavior; flag them instead of processing stale values blindly.

## A-CONTACT-REVIEW — Approve and apply

Show existing private contact, proposed contact, request source/time, current account identity, and available verification evidence. Required evidence and approval criteria are unresolved; do not invent a government-ID upload requirement.

Before approval, identify conflicts: proposed phone already linked, email-login collision, changed original contact revision, or account/provider operation already in progress. These are not permission to merge unrelated player histories.

Proposed review actions: Approve, decline/request clarification where policy allows, and return without decision. Approval confirmation states the field and player, and that RTR ID/history remain unchanged. Do not claim it is a match-history correction.

After approval distinguish **Approved**, **Applying**, **Applied**, and **Application failed**. Show Retry application only for an idempotent approved operation; retry must not create a new identity or apply a stale request over a newer contact.

The provider and profile store can partially succeed. In that case display a bounded operational failure and actual account status; do not show a green “Contact changed” solely because approval was saved. Implementation must settle recovery/notification behavior before this action is considered complete.

## Record of actions

Each completed Admin decision can show actor/time and a concise change summary from its actual audit record. This is contextual history, not a new full audit-product screen. Redact passwords, tokens, and unnecessary contacts from general logs/exports.

## Acceptance examples

- An approved request that fails at the identity provider is not labeled Applied.
- A phone collision is not resolved by overwriting the other player.
- Contact changes keep RTR ID and match history intact.
- Even the player detail has no Edit winner or Manually reconstruct session action.
