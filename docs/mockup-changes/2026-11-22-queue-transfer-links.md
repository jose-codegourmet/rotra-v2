# Queue: transfer links for a recipient with no ROTRA account, first claimant and invalidation

Status: IN MOCK APP — #1012
Date: 2026-11-22
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › public session page › My night (`myNight`) › Transfer my slot (sheet `slotTransfer`, new "No ROTRA account yet?" section); new sheet `transferLink`; new card `transferLinkCard` on the session page; Requests (`requestsPanel`) › Slot transfers (`transferRow`)
Route: /s/<slug> (My night, signed-in confirmed player), /s/<slug>?transfer=<token> (the claimant), /queue/sessions/<id>/preparation (Requests card). Prototype demo: /queue/s/s-tonight?transfer=Rotra-demo-transfer-link-for-tonight-0001xy
Screen ID: Q-PUBLIC-JOIN (My night, transfer link card), Q-PREPARE (Requests)
Artifact: none
Components: transfer-link-sheet (new), transfer-link-card (new), forms/slot-transfer-form (extended with `onCreateLink`, `isCreatingLink`), my-night-card (extended with `transferLinkOpen`), slot-transfer-row (extended with `viaLink`)
Supersedes: none
Superseded by: none

## What changed
- **Transfer my slot** gains a section under Find: **No ROTRA account yet?** "Make a transfer link instead. They sign up or log in with it, and the first person to claim it gets your slot once the Queue Master approves. It stops working at the start." with **Create a transfer link**.
- Creating it closes the sheet, toasts "Transfer link ready · share it with the new player" and opens **Transfer link**: intro "Send this link to the player who'll take your slot. They sign up or log in to ROTRA, then claim it. Only the first person to claim it can; the Queue Master still approves, and you keep your slot until then.", a QR of the link, the **Transfer link** copy field (toast "Transfer link copied"), "It stops working at the start (DATE, TIME), or if the Queue Master rejects the claim or it is withdrawn; then make a new one. ROTRA shows this link only once: if you lose it, cancel it on My night and make a new one.", and **Close** / **Share** (or **Copy link** where the device has no share sheet).
- My night while nobody has claimed it: "Transfer link shared · waiting for someone to claim it" with **Cancel link** (toast "Transfer link cancelled"). Once claimed it reads like a request: "Transfer to NAME requested · the QM decides" with **Withdraw request**. One pending transfer per slot, link or RTR ID.
- The session page opened from the link shows a **transfer link card** first in the side column:
  - Not signed in: "S*** wants to give you their slot", "Sign up or log in to ROTRA to claim it. The first person to claim it gets the slot once the Queue Master approves.", **Sign up to claim** (the session link's registration, back to this link) and **Log in**.
  - Signed in: "Claim it and the Queue Master decides before the session starts. Only the first person to claim this link can." and **Claim this slot** (toast "Slot claimed · the QM decides"). Already confirmed here: "You already have a slot in this session, so you can't claim this one."
  - Claimed by the viewer: "You claimed S***'s slot · the Queue Master decides before the session starts." and **Withdraw claim** ("Withdrawing gives the slot back to S***, and this link stops working."; toast "Claim withdrawn · this link no longer works"). Approved: "The slot is yours."
  - Closed states (warn notice): "Someone else already claimed this transfer link." / "This is your own transfer link." / "This transfer link no longer works. … Ask the sender for a new link." (rejected, withdrawn, cancelled link, unknown token) / "This transfer link has expired. Transfer links stop working when the session starts." / "This session was cancelled."
- Requests › Slot transfers lists a link only once claimed: "Shared a transfer link · TIME" and "Claimed by NAME · RTR ID"; Approve and Reject work as for a request by RTR ID. Rejecting ends the link.
- The sender's name on the card is masked like every name on the public page.

## Why
- Epic #1009 / ticket #1012; owner decisions on #1015, November 22, 2026 (confirmed decisions: a single-claim transfer link for a recipient without an account; the claimant signs up or logs in; the first to accept reserves the claim; club approval still required; rejected or withdrawn claim invalidates the link and a new one is needed; the recipient may withdraw a pending claim; pending transfers end at the start; cancelling the session invalidates open links).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: the Transfer my slot sheet with the link section; Transfer link sheet with and without Share; My night with an unclaimed link and with a claimed one; the card for each state (sign up, ready to claim, already has a slot, claimed by you, approved, claimed by someone else, own link, no longer works, expired, session cancelled, offline); a claimed link in Requests.
- Copy: every string listed above.
- Tokens: none new (the QR uses the existing `qr-bg` / `qr-fg` tokens in the app; the mockup's white QR panel matches the Session QR).
- Known differences: the mockup's QR is a static placeholder like its Session QR; the real app encodes the link. The mockup keeps the token on the transfer (it has no server); the real app stores only its SHA-256 digest. The prototype's Sign up / Log in signs in as a registered player who is not in the session; the real app goes through the Player app's session-link registration or login and back to the link.

## Reuse plan
- Reuses as is: Sheet, CopyField, Card, Notice, Button, the Player ID QR encoder (`drawQr`, now exported as `@rotra/ui/player-id-qr/helpers`)
- Extends: SlotTransferForm (`onCreateLink`, `isCreatingLink`), MyNightCard (`transferLinkOpen`), SlotTransferRow (`viaLink`)
- New: TransferLinkSheet, TransferLinkCard

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md (Slot transfers › Transfer links)
- Database design: docs/database_design/product/queue/modules/sessions-roster.md (`session_slot_transfers.link_token_digest`, `claimed_at`, new CHECKs and trigger)
- Screen docs: docs/screens/product/modules/queue/public-session.md, docs/screens/product/modules/queue/session-setup.md
- Product terms: Transfer link
- Decision: D-2026-11-22-04

## Real app work
- Done in the same commit: `@rotra/data/slot-transfer` (link rules `transferLinkState`, mock create/read/claim/withdraw, hooks `useCreateTransferLink`, `useTransferLink`, `useClaimTransferLink`, `useWithdrawTransferClaim`), `TransferLinkSheet`, `TransferLinkCard`, the `MyNight`, `PublicSession` and `JoinRequests` wiring, `?transfer=` on `/s/[slug]` (kept through the Player login and registration round trip), real mode through `packages/db/src/queue/slot-transfers.ts` and the Player app routes `POST /api/public-sessions/[slug]/slot-transfer/link`, `…/link/read`, `…/link/claim`, `…/link/withdraw`; migration `20261122000500_slot_transfer_links` (applied to a local disposable database only).
- Not built here: club membership on signing up through the link (#1018; the claim service marks the hook), waiver and accounting (#1013), refunds (#1014).
