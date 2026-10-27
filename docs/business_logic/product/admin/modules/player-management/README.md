# Player management

**Status:** Confirmed v1 target scope.

The platform owner manages user information and approves phone/email changes. Players cannot change these fields themselves, even though they can edit other personal information.

A registered player may contact the owner or submit a request. The owner reviews and manually approves it in Admin. Exact identity checks, notification steps, rejection flow, and handling of lost access to both contacts are open.

The permanent RTR ID remains unchanged by contact changes. Phone uniqueness must be respected; an approval cannot silently combine two people into one profile. Duplicate resolution and mistaken profile links need explicit rules before implementation.

Admin cannot edit confirmed match results or permit reconstruction of lost offline records. User-information oversight is not a score-correction permission.

See [contact-change flow](flow/contact-change.md).
