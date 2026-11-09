# Ranking settings and feature flags

**Surfaces:** `A-RANK-CONFIG`, `A-FEATURE-FLAGS`, `A-ADD-FLAG`.

**Source:** [configuration rules](../../../../business_logic/product/admin/modules/configuration/README.md). **Reference:** [ROTRA Admin prototype](../../../../../apps/mockup/admin-app/rotra-admin.html) (updated October 27, 2026).

## A-RANK-CONFIG — Agreed adjustable business settings

Show the currently effective configuration, its version/update time where available, and the edit form. Do not mix a draft value into public explanatory copy before the configuration is accepted and effective.

| Field | Initial value | Validation/context |
|---|---|---|
| Club assessment weight | 70% | Nonnegative percentage; complementary to performance |
| Match performance weight | 30% | Nonnegative percentage; combined total must be 100% |
| Recent completed standard matches for overall leaderboard | 10 | Whole number from 1 to 40 (product owner, October 30, 2026); applies to the preceding three-month window |

A linked percentage control or clear total validation can prevent invalid weight sums. The exact precision is an implementation choice; do not permit a displayed total that rounds to 100 while the stored total differs.

Read-only contextual rules: latest assessment from each club has equal weight; lookback is three months; Most Improved/Off Day requires five previous sessions in that club within three months. Those latter two are not approved adjustable controls.

Preview changed values and their scope before **Save configuration**. Whether the change recalculates existing rankings immediately or is prospective remains unresolved. The screen must describe the selected implemented policy accurately; until it is decided, do not promise an instant global rerank or add an arbitrary effective-date editor.

Loading/error: preserve the last accepted configuration and unsaved draft separately. Concurrent-edit conflict requires refresh/review, not silent last-write-wins. Success displays the actual saved/effective version. No direct individual player rank override is included.

## A-FEATURE-FLAGS — Platform flags

List the flags the platform owner has created: name, key, description, current value (a switch), and last change. **Add flag** in the page header opens `A-ADD-FLAG`. The catalog starts empty; the empty state explains this and offers **Add flag**.

Targeting and offline behavior are unresolved. Do not ship a sample catalog with invented payments, World launch, winner editing, or “ignore sync” switches.

Turning a flag on or off opens a confirmation showing the flag, its description and the new value; save deliberately. Permission/network errors preserve the current accepted value. A successful flag save does not prove a disconnected Queue device immediately received it; communicate the actual activation/sync policy once chosen.

Flags cannot bypass irreversible-result rules or legalize manual reconstruction of missing originals. No scheduled campaigns, audience segmentation, or billing tiers are implied by a simple feature-flag requirement.

## A-ADD-FLAG — Add a flag

A sheet with:

| Field/control | Behavior |
|---|---|
| Name | Required, unique, up to 50 characters |
| Key | Required; suggested from the name until edited. Lowercase letters, numbers and underscores, starting with a letter, 3–40 characters, unique. Fixed once saved, since the apps' code checks it |
| What it does | Required description, at least 10 characters |
| Turn on right away | Switch, off by default |

**Add flag** saves it and returns to the list with a toast. Closing with unsaved input asks before discarding. There is no field for which apps or behaviors a flag affects; the description covers it.

## A-CHARACTERS — Profile characters

`/admin/settings/profile-characters`, under Settings after Feature flags; the rail shows the number of shown images. Owner comments on the Admin artifact, November 9, 2026: “this is too much. I just want a simple grid of images…” and “for the admin character library it should just be me (admin) uploading images” ([D-2026-11-09-13](../../../../mvp/decisions.md#d-2026-11-09-13)).

- Header **Profile characters** and one helper line: “Players see the shown images, 8 per page. Click an image to hide or show it. N shown · M hidden.”
- A drag-and-drop upload zone: “Drag images here to upload” / “or click to choose · PNG, JPG or WebP, up to 1 MB each”. Clicking opens a file picker; several files at once. Each image is cropped to a centred square. Toasts: “N images added and shown to players.”, “Not added: <file> isn't a PNG, JPG or WebP image; <file> is over 1 MB.”
- A plain grid of the images, in upload order. **Click an image** to hide or show it: a hidden image is dimmed to opacity .25 (`aria-pressed="false"`, label “Character N, hidden”). A small **×** on each image deletes it, with a toast “Character N deleted.” and **Undo** for 6 seconds.
- At least **8** images stay shown: hiding or deleting a shown image below that is refused with a toast (“Keep at least 8 images shown…”).
- No names, ordering controls or generated characters. Hiding or deleting never takes an image from players who already use it. Every change goes in the record of actions. Offline: the offline error, nothing changes.
- Players see only shown images in the picker ([Player profile picture](../player-information/profile.md)), 8 per page; Admin's [A-PLAYER-EDIT](players-requests.md#a-player-edit--edit-a-player-everything-the-player-can-change) uses the same list.
- Prototype: seeded with 24 sample uploads (illustrated faces); uploads are kept as data URLs in the page's saved state.

## Acceptance examples

- 70/40 is rejected as an invalid total without saving either field separately.
- Threshold 10 is not confused with the five-session club-award requirement.
- A failed save leaves the previously effective values intact.
- No flag offers an Admin-only way to change confirmed winners.
- A flag key cannot be changed after the flag is created.
