# Player management

**Status:** Confirmed v1 target scope.

The platform owner manages user information and approves phone/email changes. Players cannot change these fields themselves, even though they can edit other personal information.

A registered player may contact the owner or submit a request. The owner reviews and manually approves it in Admin. Exact identity checks, notification steps, rejection flow, and handling of lost access to both contacts are open.

The permanent RTR ID remains unchanged by contact changes. Phone uniqueness must be respected; an approval cannot silently combine two people into one profile. Duplicates share a normalized name (case and spacing ignored), phone or email. Flag groups and their matching reason; never merge identities. Mistaken profile linking remains outside this scope.

Admin cannot edit confirmed match results or permit reconstruction of lost offline records. User-information oversight is not a score-correction permission.

See [contact-change flow](flow/contact-change.md).

## Players management (approved #335–#346, 2026-11-01)

Admin sees six filtered counts: Advanced, Intermediate, Beginner, No rank, Registered and Unclaimed. Level bands come from overall rank, never club playing level. Date added is profile creation (RTR ID date); place is the RTR ID city code. Filters and pagination live in the URL. List is the desktop default; phones use cards. Show all memberships, labelling pending and guest. Quick view shows private contacts under the same rules as detail, and the last three games. Full history is read-only with counted, fun/partial and all tabs.

An explicit Add player header action creates an unclaimed profile, with optional club, phone and email and required place. No club means Created by Admin. Admin cannot assign rank. Duplicate matches require Create anyway. An empty search only offers Clear filters.

Admin may edit full name, nickname and photo for unclaimed players, and name and nickname for claimed players. Review before/after, require a reason and a current revision. Claimed players see Changed by ROTRA Admin with the reason. Contacts still require contact-change requests.

Archive requires a reason, is reversible and hides identities from default directories and club pickers. Sign-in and retained histories remain intact. Remove requires a reason and typed RTR ID and is allowed only with no games, no claimed account and no references requiring retention. Audit retains the RTR ID.

Registration links open `/claim/{token}`, expire after seven days, and are issued as ROTRA Admin. Issuing replaces the earlier active link. Never put the token in the audit. ROTRA sends no email or SMS.

Bulk actions: Archive, Restore, Remove (only when all selected records qualify), Export CSV and Copy RTR IDs. CSV includes name, nickname, RTR ID, account, rank, clubs, added and place, never contacts. Selection survives pages and view changes; filters clear it. Mutations report each record and retry only failures.

This is an in-memory mock. Real database and cross-app durable claim-link transport remain F07 work.
