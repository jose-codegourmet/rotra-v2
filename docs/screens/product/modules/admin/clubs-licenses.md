# Club directory, account detail, and manual licensing

**Surfaces:** `A-CLUBS`, `A-ADD-CLUB`, `A-CLUB-DETAIL`, `A-CLUB-PRICE`, `A-LICENSE`, `A-RETENTION`.

**Source:** [club/license rules](../../../../business_logic/product/admin/modules/clubs-licenses/README.md). **Reference:** [ROTRA Admin prototype](../../../../../app/mocksups-app/admin-app/rotra-admin.html) (updated October 27, 2026).

## A-CLUBS — Directory

Rows: club name/logo, fixed founding location, price (**₱x/mo**, or a **Free · tester** chip), license plan, access state, effective expiry, and active-session reference when one exists (under the club name). Search by supported club identity; filters for licensed/expired/pending are a proposed organization of actual access states, not a new approval workflow.

Primary row action opens the club detail. **Add club** in the page header opens `A-ADD-CLUB`. No payment checkout, revenue chart, manager seat count, or transfer-owner control. There is no club application flow.

Empty state explains that no clubs are available and offers **Add club**.

## A-ADD-CLUB — Add a club

Entry: **Add club** on `A-CLUBS`. A sheet with a form step and a review step.

| Field/control | Behavior |
|---|---|
| Club name | Required, unique among clubs |
| Founding address | Required; fixed once the club is created |
| City | Required choice; shows the RTR city code it sets (for example `PH-CEB`). Fixed once created |
| Username | Required; suggested from the club name until edited. Lowercase letters and numbers, optionally separated by dots, 3–30 characters, unique, and not already used by another account |
| Initial password | Required, at least 8 characters, with show/hide and **Generate a password**. The platform owner gives it to the club outside ROTRA |
| Price | **Paid** with monthly and yearly amounts (yearly less than twelve months at the monthly price; the saving is shown), or **Free** for a tester club |

**Review** shows every value except the password (only that it is set and its length), what happens next, and **Create club**. Back returns to the form with values kept. Closing with unsaved input asks before discarding. On success the new club opens on its License tab with no license yet; a toast confirms it. A failed save keeps the form and creates nothing.

The password is visible only on the form, while the platform owner copies it for the club; after that ROTRA never shows it.

## A-CLUB-DETAIL — Club context

Show name/logo, founding address and city/country identity code, dedicated username/account provisioning status, price, license term history, current access state, and active session if any. Password is never shown as a readable stored value.

Organized in tabs (proposed by the prototype): **Overview** (pending name change, account, identity, active session), **License** (license status with Activate or Renew, the club's price with **Change price**, and payment history), **Public pages** (`A-RETENTION`), and **Activity** (actions taken on this club). Tabs with something waiting carry a badge. Opening a club starts on Overview.

Separate founding address from recent session venues. Editing/correcting founding location and branding authority need a policy; no such edit should rewrite permanent RTR IDs.

**Pending name change.** When the club has requested a new name, show the current name, the requested name, and when it was sent, with **Approve name change** and **Reject**. Approving updates the name everywhere it appears (dashboard, public pages, future result images); rejecting returns the club to its current name with the request closed. A list of clubs with pending name changes can sit beside the existing contact-change requests. Logos are changed by the club directly and need no approval.

Allowed operational actions: open manual license activation/renewal; approve or reject a pending club name change; inspect status of the active-session expiry exception; review retention state. Credential reset/provisioning must use the approved auth process, not a plaintext password export.

No manager invitations, role assignment, owner-player mapping requirement, or multi-club session concurrency override is included.

## A-CLUB-PRICE — Change a club's price

Entry: **Change price** on the club's License tab. A sheet with **Paid** (monthly and yearly amounts, same validation as `A-ADD-CLUB`) or **Free**. Switching from Free back to Paid starts from the club's last paid price. Saving says the new price applies to later payments only; recorded payments keep their amounts.

## A-LICENSE — Activate or renew after external payment

Entry: selected club detail. The platform owner has collected payment outside ROTRA.

| Field/control | Behavior |
|---|---|
| Club | Read-only selected identity; review before commit |
| Plan | Monthly or yearly; each choice shows the club's price for it |
| Effective period | Display/propose start and expiry according to the eventual renewal policy; do not silently assume how early renewal stacks |
| Date paid | Required, not in the future (paid clubs) |
| Amount | Filled in from the club's price for the chosen plan, editable for this payment. A free club shows **Amount: Free** with no date paid or amount fields; the term is recorded at ₱0 |
| Note/reference | Optional operational reference; not a required payment receipt or in-app billing record |
| Review | Shows actual access effect and period before confirmation |

Actions: Activate license or Renew license, depending on state. Prevent duplicates. Save only succeeds when the license is actually persisted; a timeout requires retrieving the operation result before reapplying the same term.

Validation: required supported plan and valid effective period; for paid clubs a date paid and a whole amount above zero. Review notes when the amount differs from the club's price. Refunds and overlapping-term policy remain unresolved. Do not invent controls for these merely to complete a billing form.

On renewal, show whether retained public pages were restored and the deletion countdown cancelled. If already deleted, do not promise recovery that was never agreed. A subsequent expiry begins a new six-month countdown.

## A-RETENTION — Expiry and page lifecycle

Display license expiry, current continuous-expiry period, scheduled public-page deletion date when known, countdown state, and whether the cycle was cancelled by renewal.

Explain what expires: club operational access, saved-player/report access, and eventual public pages. An already-active session may finish/sync. Explain what is retained: player match history and earned rankings, still subject to normal rolling eligibility.

The deletion scope is public pages/assets, not player/history tables. No bulk Delete club and all players action is authorized. A stale job must not be displayed as executed if renewal cancelled its expiry cycle.

States: active/no countdown; expired/stale pages; renewal restored/cancelled cycle; deletion due/processing; deleted pages; deletion failure awaiting retry. These are operational status displays, not manual access bypasses.

## Acceptance examples

- A club added with username `lahug.smash` when that username already exists is refused before review.
- A yearly price of twelve times the monthly price or more is refused.
- Changing a club's price does not change any recorded license payment.
- A free club's license term appears in its payment history as Free, and it expires like any other term.

- Renewal cannot activate a second concurrent session for the club.
- A network timeout followed by retry does not grant two renewal periods accidentally.
- Six months is measured from continuous expiry, not original session date.
- Renewing before deletion cancels that countdown; future expiry starts a new one.
