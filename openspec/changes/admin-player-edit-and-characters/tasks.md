# Admin player edit and profile characters: A07

## Implemented (mock app)

- [x] #644 A07.1: CharacterGrid and ImageDropZone in `@rotra/ui`.
- [x] #645 A07.2: character library, Admin side (mock data and hooks).
- [x] #646 A07.3: `/settings/profile-characters` page.
- [x] #647 A07.4: picture section in Edit player.
- [x] #649 A07.6: Admin edits everything (mock only), including superseding open contact-change requests.
- [x] #648 A07.5: full Edit player form.
- [x] #650 A07.7: wiring.
- [x] Decisions D-2026-11-09-13 and D-2026-11-09-14 updated; owner answers recorded 2026-11-10.

## Verification

- [ ] `make check` on the last commit (not run for this docs change).
- [ ] Mockup comparison at 375 px and 1280 px, dark and light (not run).

## Not done

- Real mode: Supabase Storage for characters, `profile_characters` table, full-form PATCH, admin-set password via Supabase.
- End date for the beta-only password field: not set.
- Known gap: when the old picture was initials, no "Previous picture" row shows (the mockup shows one).
