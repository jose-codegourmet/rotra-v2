# Feature flags and business configuration

**Status:** Confirmed v1 target scope.

The platform owner manages feature flags in Admin. Updated October 27, 2026 from the [ROTRA Admin prototype](../../../../../../apps/mockup/admin-app/rotra-admin.html):

- The catalog starts empty. The platform owner creates each flag with **Add flag**.
- A flag has a **name** (unique, up to 50 characters), a **key** the apps' code checks (suggested from the name; lowercase letters, numbers and underscores, starting with a letter, 3–40 characters, unique, fixed once saved), a **description** of what it does, and an on/off value.
- New flags start off unless the platform owner chooses to turn it on right away. Turning a flag on or off is confirmed first.
- Flags are on/off switches for the whole platform. Targeting particular clubs or players, rollout schedules, and when offline Queue devices pick up a change have not been selected.

## Agreed adjustable settings

Decided November 11, 2026 ([D-2026-11-11-05](../../../../../mvp/decisions.md#d-2026-11-11-05)); the 70% / 30% weight fields are gone.

| Setting | Initial value | Scope |
|---|---|---|
| Normal step size | chosen in #247 | How far a rating moves after a counted game |
| Provisional step size | chosen in #247 | The bigger step while a player is Provisional |
| Provisional game count | 10 | Counted games before a player leaves Provisional |
| Leaderboard game count | 10 | Counted games in the window for a leaderboard position |
| Window length | 90 days | Rolling window, Asia/Manila midnight boundary |

**Saving settings recomputes everyone** from the stored game facts; rank is a projection, the facts never change, and there is no "old world / new world" split.

The agreed Most Improved/Off Day requirement is five prior sessions at the same club within the window; the prototype award formula is approved as is for v1 and is not an Admin setting. Feature flags must not become a back door for changing confirmed winners or bypassing lost-data invalidation.

## Profile character library

Owner decision, November 9, 2026 ([D-2026-11-09-13](../../../../../mvp/decisions.md#d-2026-11-09-13); mockup log 2026-11-09-admin-profile-characters; in the mock app, tickets #644–#646; real mode not started). The characters players pick as their profile picture are images **the platform owner uploads** in Admin › Settings › Profile characters. No club or player adds to the library.

- Uploads: images only (PNG, JPG or WebP), up to 1 MB each, cropped to a centred square; several at once.
- Each image is **shown** or **hidden**; at least **8** stay shown. Players see shown images in upload order, **8 per page**. Delete has a short Undo.
- Hiding or deleting an image never changes the picture of a player who already uses it.
- The same shown list feeds the Player profile picture dialog, Admin's edit-player sheet and the club's picture editor (D-2026-11-09-12).
- Every change is recorded in the Record of actions. Offline: no change.

