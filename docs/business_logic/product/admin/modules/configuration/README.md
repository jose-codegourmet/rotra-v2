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

- Uploads: images only (PNG, JPG or WebP), up to 1 MB each, cropped to a centred square; several at once. While files are added, a progress bar shows **Uploading N of M…** (November 11, 2026, [D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11)); rejected files count towards M.
- Each image is **shown** or **hidden**; at least **15** stay shown. Players see shown images in upload order, **15 per page**. Delete has a short Undo. *(Changed November 11, 2026, [D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11): the picker was 8 per page with at least 8 shown; it is now 5 circles across, 15 per page, so Admin keeps at least 15 shown.)*
- Hiding or deleting an image never changes the picture of a player who already uses it.
- The same shown list feeds the Player profile picture dialog, Admin's edit-player sheet and the club's picture editor (D-2026-11-09-12).
- Every change is recorded in the Record of actions. Offline: no change.

## Profile banner library

Owner decision, November 11, 2026 ([D-2026-11-11-11](../../../../../mvp/decisions.md#d-2026-11-11-11); mockup log 2026-11-11-admin-profile-banners; mock app and real-mode services built in P08.6). A banner is the strip across the top of a player's ROTRA profile card, like a Discord banner. Players pick one of the **predefined banners** the platform owner manages in Admin › Settings › Profile banners. It is managed exactly like the [character library](#profile-character-library); **no club or player ever uploads a banner**.

- Uploads: images only (PNG, JPG or WebP), up to 2 MB each, centred-cropped to **5:2**; several at once, with the same **Uploading N of M…** progress bar.
- Each banner is **shown** or **hidden**; at least **2** stay shown, so players have a choice. Delete has a short Undo.
- Six sample banners are seeded: Court, Night, Dusk, Ember, Sun and Stripe.
- Players pick one of the shown banners in Edit profile. Hiding or deleting a banner never changes the banner of a player who already uses it.
- **Default banner** ([D-2026-11-13-03](../../../../../mvp/decisions.md#d-2026-11-13-03), November 13, 2026): exactly one shown banner is the default (Court at first). It shows on every profile with no pick, and on guests and unclaimed profiles, in all three apps. **Make default** on another shown banner moves it at once (Undo toast, Record of actions). The default can't be hidden or deleted until another banner is made the default.
- Every change is recorded in the Record of actions. Offline: no change.

