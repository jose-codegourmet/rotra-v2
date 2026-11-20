#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/details.cases.json: PATCH /api/club/players/{id}, Edit details of a saved player.

Run it, then the capture (capture-writes-queue.test.mjs -t details), which writes details.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-details-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/details.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/club.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}
GUS, UNA, ANN = 1, 5, 3
cases = []


def case(name, steps, scenario='base', **kw):
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    cases.append({'name': name, 'scenario': scenario, 'steps': steps, **kw})


def edit(cp, body=None, who=SMASH, **kw):
    s = {'method': 'PATCH', 'path': f'/api/club/players/{cp if isinstance(cp, str) else CP(cp)}', 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


def form(**kw):
    return {'fullName': 'Gus Guest', 'nickname': 'Gus', **kw}


case('edit_signed_out', edit(GUS, form(), who=None))
case('edit_a_player_subject_is_not_a_club', edit(GUS, form(), who=PLAYER_SUBJECT, **NOSUBJECT))
case('edit_body_not_json', edit(GUS, rawBody='nope'))
case('edit_without_a_body', edit(GUS))
case('edit_a_guest_renamed', edit(GUS, {'fullName': '  Gus Renamed ', 'nickname': ' Gussy '}))
case('edit_a_guest_blank_nickname_clears_it', edit(GUS, {'fullName': 'Gus Guest', 'nickname': '   '}))
case('edit_a_guest_nickname_not_text_clears_it', edit(GUS, {'fullName': 'Gus Guest', 'nickname': 5}))
case('edit_blank_name', edit(GUS, {'fullName': '  '}))
case('edit_name_not_text', edit(GUS, {'fullName': 5}))
case('edit_a_guest_gets_no_details_row', edit(GUS, form(playingStyle='Attacker', experienceYears=2, socialLinks={'facebook': 'fb'})))
case('edit_a_guest_typed_phone_is_not_kept', edit(GUS, form(phone='0917 555 0199')))
case('edit_a_guest_typed_email_makes_them_unclaimed', edit(GUS, form(email='  New.Person@Example.test ')))
case('edit_a_guest_email_of_a_person_already_saved', edit(GUS, form(email='una@example.test')))
case('edit_a_guest_email_of_a_registered_player_already_saved', edit(GUS, form(email='ben@example.test')))
case('edit_a_guest_email_of_a_registered_player_not_saved', edit(GUS, form(email='gil@example.test')))
case('edit_a_guest_email_of_an_unclaimed_person_on_rotra', edit(GUS, form(email='eve@example.test')))
case('edit_email_not_valid', edit(GUS, form(email='nope')))
case('edit_email_is_ignored_when_one_is_on_file', edit(UNA, {'fullName': 'Una Alonzo', 'email': 'other@example.test'}))
case('edit_an_unclaimed_player_saves_details', edit(UNA, {'fullName': 'Una A', 'nickname': 'U', 'playingStyle': '  Defender ', 'experienceYears': 2, 'experienceMonths': 3,
                                                       'socialLinks': {'facebook': ' fb.com/una ', 'instagram': 'ig', 'youtube': 5, 'linkedin': None, 'tiktok': 'x'}}))
case('edit_an_unclaimed_player_takes_a_phone', edit(UNA, {'fullName': 'Una Alonzo', 'phone': '0917 555 0150'}))
case('edit_an_unclaimed_player_phone_not_valid', edit(UNA, {'fullName': 'Una Alonzo', 'phone': '123'}))
case('edit_phone_is_checked_before_the_entitlement', edit(20, {'fullName': 'Larry Lapsed', 'phone': '123'}, who=LAPSED))
case('edit_phone_on_file_is_never_replaced', edit(UNA, {'fullName': 'Una Alonzo', 'phone': '0917 555 0150'}), scenario='una_has_a_phone')
case('edit_phone_taken_by_another_saved_player', edit(UNA, {'fullName': 'Una Alonzo', 'phone': '0917 555 0001'}))
case('edit_phone_taken_by_a_deleted_player_is_fine', edit(UNA, {'fullName': 'Una Alonzo', 'phone': '0917 555 0199'}), scenario='rex_has_that_phone_and_is_deleted')
case('edit_an_older_record_with_a_phone_and_no_email', edit(GUS, form(playingStyle='Net', experienceMonths=5)), scenario='gus_has_a_phone')
case('edit_shows_the_experience_that_kept_counting', edit(UNA, {'fullName': 'Una Alonzo', 'experienceYears': 2, 'experienceMonths': 9}), scenario='una_has_experience')
case('edit_experience_unchanged_keeps_the_recorded_date', edit(UNA, {'fullName': 'Una Alonzo', 'experienceYears': 2, 'experienceMonths': 8}), scenario='una_has_experience')
case('edit_experience_cleared', edit(UNA, {'fullName': 'Una Alonzo'}), scenario='una_has_experience')
case('edit_experience_months_only', edit(UNA, {'fullName': 'Una Alonzo', 'experienceMonths': 11}))
case('edit_experience_years_only', edit(UNA, {'fullName': 'Una Alonzo', 'experienceYears': 80}))
case('edit_experience_too_many_years', edit(UNA, {'fullName': 'Una Alonzo', 'experienceYears': 81}))
case('edit_experience_too_many_months', edit(UNA, {'fullName': 'Una Alonzo', 'experienceMonths': 12}))
case('edit_experience_negative', edit(UNA, {'fullName': 'Una Alonzo', 'experienceYears': -1}))
case('edit_experience_fraction', edit(UNA, {'fullName': 'Una Alonzo', 'experienceMonths': 1.5}))
case('edit_experience_text', edit(UNA, {'fullName': 'Una Alonzo', 'experienceYears': '2'}))
case('edit_a_registered_player_keeps_their_own_details', edit(ANN, {'fullName': 'Ann R'}))
case('edit_a_deleted_player', edit(6, {'fullName': 'Rex'}))
case('edit_unknown_player', edit('c6000000-0000-4000-8000-0000000000ff', {'fullName': 'X'}))
case('edit_other_clubs_player', edit(30, {'fullName': 'X'}))
case('edit_malformed_id', edit('m', {'fullName': 'X'}), **MALFORMED)
case('edit_lapsed_club', edit(20, {'fullName': 'Larry'}, who=LAPSED))
case('edit_twice', [edit(GUS, form(email='new.person@example.test')), edit(GUS, form(email='another@example.test'))])
# Edit details takes no lock, so two different names race for the last word (not decided, so not pinned); the same edit twice is.
case('edit_the_same_edit_twice_at_once', {'parallel': [edit(UNA, {'fullName': 'Una A'}), edit(UNA, {'fullName': 'Una A'})]})

SCEN = dict(BASE['scenarios'])
SCEN['una_has_a_phone'] = [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, state, captured_at, created_at, updated_at) VALUES ('{CP(UNA)}', '{CLUB1}', '+639175550111', 'pending', {NOW}, {NOW}, {NOW})"]
SCEN['rex_has_that_phone_and_is_deleted'] = [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, state, captured_at, created_at, updated_at) VALUES ('{CP(6)}', '{CLUB1}', '+639175550199', 'pending', {NOW}, {NOW}, {NOW})"]
SCEN['una_has_experience'] = [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, preset_fields, state, captured_at, created_at, updated_at) VALUES ('{CP(UNA)}', '{CLUB1}', NULL, "
                              f"'{{\"version\":1,\"playingStyle\":\"Old\",\"experienceMonths\":24,\"experienceRecordedAt\":\"2026-03-10T00:00:00.000Z\",\"socialLinks\":{{\"facebook\":\"old\"}}}}'::jsonb, 'pending', {NOW}, {NOW}, {NOW})"]
SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'club_player_private_inputs':
        s['sql'] = s['sql'].replace('phone_e164, email, state,', 'phone_e164, email, preset_fields, state,')
    SNAPSHOT.append(s)
doc = {'now': BASE['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}
for c in cases:
    for st in c['steps']:
        for k in [k for k, v in st.items() if v is None and k != 'who']:
            del st[k]
        for p in st.get('parallel', []):
            for k in [k for k, v in p.items() if v is None and k != 'who']:
                del p[k]
names = [c['name'] for c in cases]
assert len(set(names)) == len(names)
assert {c['scenario'] for c in cases} <= set(SCEN)
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
