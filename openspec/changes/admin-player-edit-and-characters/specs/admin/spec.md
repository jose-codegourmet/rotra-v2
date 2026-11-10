# Admin (delta)

## Purpose

Record the mock Admin behavior built by epic A07 (#589). The business docs remain authoritative for product behavior and `apps/mockup/admin-app/rotra-admin.html` for appearance and copy. Real mode does not store characters or accept the full-form edit.

## ADDED Requirements

### Requirement: Profile character library

Admin SHALL provide Settings > Profile characters as a plain grid of images. At least 8 images SHALL stay shown. Uploads SHALL accept PNG, JPG or WebP up to 1 MB each and SHALL be cropped to a centred square. Deleting an image SHALL offer Undo for 6 seconds. A player who already uses an image that is later hidden or deleted SHALL keep showing it.

#### Scenario: Add an image
- GIVEN an image of 1 MB or less in PNG, JPG or WebP
- WHEN the admin drags it in
- THEN it is cropped to a centred square and added as shown.

#### Scenario: Reject a file
- GIVEN a file over 1 MB or of another type
- WHEN the admin drags it in
- THEN it is refused and the library is unchanged.

#### Scenario: Keep at least 8 shown
- GIVEN exactly 8 shown images
- WHEN the admin tries to hide or delete one
- THEN the change is refused.

#### Scenario: Undo a delete
- WHEN the admin deletes an image
- THEN Undo is available for 6 seconds and restores it
- AND players already using it keep showing it either way.

### Requirement: Admin edits everything on a player

Admin > Players > Edit SHALL change the picture, name, nickname, playing style, experience, playing since, the four social links, Private profile, Hide phone from clubs, phone and email. One reason SHALL be required, and one Activity log entry SHALL be written per save. RTR ID, created-by club, registered or unclaimed status, rank, level and match history SHALL stay read-only. On any picture change the old picture SHALL become the previous picture.

#### Scenario: Save with a reason
- GIVEN changed fields and a reason
- WHEN the admin saves
- THEN one Activity log entry lists the changed fields and the reason.

#### Scenario: Nothing changed
- GIVEN no field differs
- WHEN the admin saves
- THEN "Nothing changed." shows and no entry is written.

### Requirement: Beta-only password field

The field SHALL be labelled "Password *(for MVP or beta only)*" until an end date is set (none is set). It SHALL be available for registered players only. An empty value SHALL leave the password unchanged. The password SHALL NOT be stored or logged; only that it was set, and by whom, is recorded.

#### Scenario: Set a password
- GIVEN a registered player
- WHEN the admin types at least 8 characters and saves
- THEN the Activity log records that a password was set, never the password.

### Requirement: Direct contact edit supersedes open requests (Option A)

A direct Admin phone or email edit SHALL mark the open contact-change request for that field "Superseded by an Admin edit", stored as rejected plus `supersededAt`. It SHALL be logged in the Activity log and SHALL NOT be approvable or appliable afterwards.

#### Scenario: Edit email with an open request
- GIVEN an open email contact-change request
- WHEN the admin saves a new email directly
- THEN the request shows "Superseded by an Admin edit" and approve and apply are refused.
