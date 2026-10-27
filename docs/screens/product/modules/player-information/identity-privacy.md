# Player ID, phone privacy, and contact-change request

**Surfaces:** `P-ID-QR`, `P-PHONE-PRIVACY`, `P-CONTACT-REQUEST`.

**Sources:** [identity](../../../../business_logic/product/player-information/modules/identity/README.md), [Admin contact approvals](../../../../business_logic/product/admin/modules/player-management/README.md).

## P-ID-QR — Identify yourself to a club

Display the permanent ID in readable text with a QR representation. Example format: `RTR-PH-CEB-102926-0001`. Offer Copy ID and an accessible full-text value; the QR must have a textual alternative.

This identity can be shown to an operator without exposing phone number. Do not encode hidden contacts, a reusable registration token, or login credentials in the public QR. Scanning identifies the player; it does not claim/edit the account or reserve a slot.

Explain permanence only where useful: assigned at first sync using creating club's founding city and sync day; city/day sequence resets but the assigned ID never changes. Do not generate a placeholder permanent-looking RTR code for a pending offline entry.

Loading/no ID yet: show pending allocation honestly. If the player has a stable cached ID, displaying it offline can be allowed as a read behavior; verification by a new club may still need internet.

## P-PHONE-PRIVACY — Hide from club operators

A clearly labeled switch: **Hide my phone number from clubs**. Explain that the player can use RTR ID or QR for identification instead. Email/phone remain absent from public profile views regardless of this setting.

Save requires server confirmation; pending/error states must not falsely claim a privacy change is already applied. Describe current saved state separately from a failed attempted toggle.

A change cannot erase information a human already saw or instantly revoke a disconnected cached value. The implementation should minimize cached private contacts and refresh/redact them on reconnection; avoid promising retroactive forgetting.

This switch does not change the login phone or invalidate the permanent ID. It is not a setting to hide the player from the public leaderboard.

## P-CONTACT-REQUEST — Ask to change phone or email

Show current private contact, selected field to change, proposed new value, and submission/status area. Both the ability to contact the platform owner and a request flow were agreed; exact evidence/verification requirements remain undecided.

The prototype puts this on one **Privacy and contact** page with the phone switch, opens the request as a sheet, and groups a new phone number's digits as they're typed (see the [module README](README.md#reference-prototype)).

Do not require an invented document upload or unsupported identity proof. Make clear: **“Changes take effect only after Admin approval.”** The current login remains effective until the change is actually applied; approval and application can be separate states.

Proposed status presentation:

- Submitted / waiting for review.
- Approved / being applied.
- Applied: show updated contact; same RTR ID and history.
- Needs attention or failed application: existing usable identity status shown accurately; request not falsely marked complete.
- Not approved: safe explanation and permitted next step; rejection policy still requires definition.

Validate contact format through the approved account rules. A conflict with another profile does not authorize merging accounts. Repeat submissions should resume/show the existing pending request or follow a defined resubmission rule, not create an invisible cascade of changes.

Lost access to both phone and email requires a separate owner-assisted verification policy. Do not invent recovery access via a public QR code.

## Acceptance examples

- A hidden-phone player can be identified by ID without revealing the phone.
- Submitting a change request does not immediately alter login credentials.
- Approval alone is not shown as Applied if provider synchronization failed.
- Contact changes preserve the player's permanent RTR ID/history.
