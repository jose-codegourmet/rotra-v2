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

**Real-mode Admin edit (owner direction, November 12, 2026):** the full Edit form applies to registered Player profiles; club-only records remain outside this implementation. A save applies valid profile and phone changes even if a login email or password change cannot be confirmed, and reports the Auth failure. Email changes use a recoverable provider operation and are applied to the private contact only after the provider confirms them. A failed or uncertain password change is reported without storing the password. Pending contact requests for a field changed directly are superseded; an already applying contact change must be resolved first.

**Admin edits everything (owner decision, November 9, 2026, [D-2026-11-09-14](../../../../mvp/decisions.md#d-2026-11-09-14); mockup log 2026-11-09-admin-edit-player-everything; in the mock app, tickets #647–#650; registered Player real-mode implementation in source):** Edit lets the platform owner change every field the player can (profile picture, name, nickname, playing style, experience, playing since, the four social links, Private profile, Hide phone from clubs), plus phone and email (format and uniqueness checked; applied directly, without a contact-change request) for registered and unclaimed players. The picture can be an upload, initials, the previous picture, or a shown character from the [character library](../configuration/README.md#profile-character-library). A reason is required and one Record of actions entry lists the changed fields. RTR ID, created-by club, registered/unclaimed status, rank, level and match history stay read-only. **Password *(for MVP or beta only)*:** Admin may type a new password (at least 8 characters) for a registered player; empty leaves it unchanged; only that it was set, by whom and when is recorded, never the password. **Decided (owner, 2026-11-10):** D-2026-11-09-14 is confirmed over [D-2026-11-07-01](../../../../mvp/decisions.md#d-2026-11-07-01) (“the Admin never sees” a player's password), for MVP or beta only; the end date is not set, so the field keeps its label until one is. A direct phone or email edit marks the open contact-change request for that field “Superseded by an Admin edit” (stored as rejected plus `supersededAt`), logs it in the Activity log, and it can no longer be approved or applied (Option A). An Admin save makes the old picture the previous picture on any picture change; known gap: no “Previous picture” row when the old picture was initials. Until it is built, the rules below describe the current app.

Current app (before the November 9 change): Admin may edit full name, nickname and photo for unclaimed players, and name and nickname for claimed players. Review before/after, require a reason and a current revision. Claimed players see Changed by ROTRA Admin with the reason. Admin may also enter a new email in Edit profile (#564, owner decision, November 8, 2026): saving does not change the email, it creates an Admin-entered contact-change request (source `owner`, pending) that is reviewed and applied like any other, for registered and unclaimed players alike. It is disabled while the player has an open request, removing an email is not offered, and the reason is recorded in the Record of actions. Phone, rank and the RTR ID stay outside Edit profile; phone changes still require a contact-change request.

Archive requires a reason, is reversible and hides identities from default directories and club pickers. Sign-in and retained histories remain intact. Remove requires a reason and typed RTR ID and is allowed only with no games, no claimed account and no references requiring retention. Audit retains the RTR ID.

Registration links open `/claim/{token}`, expire after seven days, and are issued as ROTRA Admin. Issuing replaces the earlier active link. Never put the token in the audit. ROTRA sends no email or SMS. A player who registers from an Admin link is not assigned to a club (owner decision, November 8, 2026).

Bulk actions: Archive, Restore, Remove (only when all selected records qualify), Export CSV and Copy RTR IDs. CSV includes name, nickname, RTR ID, account, rank, clubs, added and place, never contacts. Selection survives pages and view changes; filters clear it. Mutations report each record and retry only failures.

Management mutations remain an in-memory mock. In real mode, the directory, identity detail, selected-ID reads and read-only history load persisted players through Admin-only endpoints (2026-11-01). Contact-request reads, Decline and the Record of actions also load saved data (#401). Approve, Retry application and Check status for a contact change run on saved data too (#575, November 8, 2026): approval reviews then applies, an unclaimed player (no login) changes only the contact, and any failure shows Application failed. Edit profile saves name and nickname for real (`PATCH /api/players/[playerId]`, revision-checked, audit `player.profile_updated` with before/after and reason, shown as the record line). A registered player sees "Changed by ROTRA Admin: <reason>" from the latest such event since the claim. The unclaimed photo link stays mock-only, and club-owned names are not rewritten in real mode. Create, archive, restore, remove, claim-link transport and ranking-settings reads remain F07 work.

## Reviewed password recovery (#491, owner request November 8, 2026)

Player Forgot password submits the registered email for Admin review, without automatic email.
Known and unknown addresses receive the same acknowledgement. Repeated submissions while pending
reuse that request. Admin alone sees requests, including unmatched addresses, and can decline or
verify ownership through ROTRA support before generating a link. Matching email alone is not proof.
Only an enabled player account with unchanged email and synchronized provider identity is eligible.
An unmatched or changed account must use a fresh, corrected request, never manual reassignment.

Admin never sets or sees the password. Copy the generated link for private manual delivery using
the chosen support channel. The player sets their password at the existing reset screen; Supabase
controls recovery expiry and single use. ROTRA also binds the issued token digest to the reviewed
player/account, rejects unreviewed or replaced links, and records issuance/decline without secrets.
Generating a replacement requires ownership confirmation again. Link issued is not delivery proof.
