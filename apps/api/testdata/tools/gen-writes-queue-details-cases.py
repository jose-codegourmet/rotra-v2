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


# ------------------------------------------------------------------ Saved level (club_player_saved_level) and a link-only record (#1019), task 2.7
case('edit_level_sets_the_saved_level', edit(GUS, form(level='beginner_mid')))
case('edit_level_on_an_unclaimed_player', edit(UNA, {'fullName': 'Una Alonzo', 'level': 'advanced_low'}))
case('edit_level_same_as_the_saved_one_changes_nothing', edit(GUS, form(level='intermediate_low')), scenario='gus_saved_level')
case('edit_level_changed', edit(GUS, form(level='advanced_high')), scenario='gus_saved_level')
case('edit_level_cleared_by_an_empty_text', edit(GUS, form(level='')), scenario='gus_saved_level')
case('edit_level_left_out_clears_it', edit(GUS, form()), scenario='gus_saved_level')
case('edit_level_not_text_clears_it', edit(GUS, form(level=5)), scenario='gus_saved_level')
case('edit_level_not_a_level', edit(GUS, form(level='wizard')), scenario='gus_saved_level')
case('edit_level_not_a_level_rolls_the_name_back', edit(GUS, {'fullName': 'Gus Renamed', 'level': 'wizard'}))
case('edit_level_a_session_assessment_is_newer', edit(GUS, form(level='advanced_low')), scenario='gus_assessed_later')
case('edit_level_a_session_assessment_is_newer_and_another_is_typed', edit(GUS, form(level='beginner_low')), scenario='gus_assessed_later')
case('edit_level_the_saved_level_is_newer_than_the_assessment', edit(GUS, form(level='intermediate_low')), scenario='gus_assessed_earlier')
case('edit_level_the_saved_level_is_newer_and_another_is_typed', edit(GUS, form(level='advanced_low')), scenario='gus_assessed_earlier')
case('edit_level_only_an_assessment_exists', edit(GUS, form(level='advanced_low')), scenario='gus_assessed_only')
case('edit_level_only_an_assessment_exists_and_it_is_cleared', edit(GUS, form()), scenario='gus_assessed_only')
case('edit_level_twice', [edit(GUS, form(level='beginner_high')), edit(GUS, form(level='beginner_high'))])

LINK = {'facebook': 'fb.com/una'}
case('edit_link_only_adds_an_email', edit(UNA, {'fullName': 'Una Alonzo', 'email': ' New.Una@Example.test ', 'socialLinks': LINK}), scenario='una_link_only')
case('edit_link_only_email_of_a_registered_player_leaves_the_link', edit(UNA, {'fullName': 'Una Alonzo', 'email': 'ben@example.test', 'socialLinks': LINK}), scenario='una_link_only')
case('edit_link_only_email_of_an_open_entry_leaves_the_link', edit(UNA, {'fullName': 'Una Alonzo', 'email': 'eve@example.test', 'socialLinks': LINK}), scenario='una_link_only')
case('edit_link_only_email_not_valid', edit(UNA, {'fullName': 'Una Alonzo', 'email': 'nope', 'socialLinks': LINK}), scenario='una_link_only')
case('edit_link_only_no_email_keeps_the_link', edit(UNA, {'fullName': 'Una Alonzo', 'socialLinks': LINK}), scenario='una_link_only')
case('edit_link_only_clearing_the_link_makes_a_guest', edit(UNA, {'fullName': 'Una Alonzo'}), scenario='una_link_only')
case('edit_link_only_changing_the_link_moves_the_key', edit(UNA, {'fullName': 'Una Alonzo', 'socialLinks': {'instagram': 'instagram.com/una_a'}}), scenario='una_link_only')
case('edit_link_only_adds_an_email_and_clears_the_link', edit(UNA, {'fullName': 'Una Alonzo', 'email': 'solo.una@example.test'}), scenario='una_link_only')
case('edit_link_only_adds_an_email_twice', [edit(UNA, {'fullName': 'Una Alonzo', 'email': 'first.una@example.test', 'socialLinks': LINK}), edit(UNA, {'fullName': 'Una Alonzo', 'email': 'second.una@example.test', 'socialLinks': LINK})], scenario='una_link_only')
case('edit_an_unclaimed_player_with_an_email_ignores_a_typed_one', edit(UNA, {'fullName': 'Una Alonzo', 'email': 'other@example.test', 'socialLinks': LINK}))


# ------------------------------------------------------------------ Rename (PATCH club/players/{id}/name, D-2026-11-26-07), task 2.7 follow-up
def rename(cp, body=None, who=SMASH, **kw):
    s = {'method': 'PATCH', 'path': f'/api/club/players/{cp if isinstance(cp, str) else CP(cp)}/name', 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


SCEN_ROSTER_NAMES = None
case('rename_signed_out', rename(GUS, {'fullName': 'Gus Renamed'}, who=None))
case('rename_a_player_subject_is_not_a_club', rename(GUS, {'fullName': 'Gus Renamed'}, who=PLAYER_SUBJECT, **NOSUBJECT))
case('rename_body_not_json', rename(GUS, rawBody='nope'))
case('rename_without_a_body', rename(GUS))
case('rename_a_guest', rename(GUS, {'fullName': 'Gus Renamed', 'nickname': 'Gussy'}))
case('rename_a_guest_spaces_are_collapsed', rename(GUS, {'fullName': '   Gus   \t Renamed  ', 'nickname': '  Big   Gus '}))
case('rename_an_empty_nickname_removes_it', rename(GUS, {'fullName': 'Gus Guest', 'nickname': ''}))
case('rename_a_blank_nickname_removes_it', rename(GUS, {'fullName': 'Gus Guest', 'nickname': '   '}))
case('rename_without_a_nickname_removes_it', rename(GUS, {'fullName': 'Gus Guest'}))
case('rename_nickname_not_text_removes_it', rename(GUS, {'fullName': 'Gus Guest', 'nickname': 5}))
case('rename_an_unclaimed_player', rename(UNA, {'fullName': 'Una Alonzo B.', 'nickname': 'U'}))
case('rename_nickname_of_24_characters', rename(GUS, {'fullName': 'Gus Guest', 'nickname': 'n' * 24}))
case('rename_nickname_of_25_characters', rename(GUS, {'fullName': 'Gus Guest', 'nickname': 'n' * 25}))
case('rename_nickname_too_long_before_collapsing_is_fine', rename(GUS, {'fullName': 'Gus Guest', 'nickname': 'n' + ' ' * 60 + 'n'}))
case('rename_name_of_60_characters', rename(GUS, {'fullName': 'a' * 60}))
case('rename_name_of_61_characters', rename(GUS, {'fullName': 'a' * 61}))
case('rename_name_of_2_characters', rename(GUS, {'fullName': 'Jo'}))
case('rename_name_of_1_character', rename(GUS, {'fullName': 'J'}))
case('rename_blank_name', rename(GUS, {'fullName': '   '}))
case('rename_name_not_text', rename(GUS, {'fullName': 5}))
case('rename_without_a_name', rename(GUS, {'nickname': 'x'}))
case('rename_name_is_checked_before_the_player', rename('c6000000-0000-4000-8000-0000000000ff', {'fullName': 'J'}))
case('rename_nickname_is_checked_before_the_player', rename('c6000000-0000-4000-8000-0000000000ff', {'fullName': 'Jo Jo', 'nickname': 'n' * 25}))
case('rename_a_registered_player', rename(ANN, {'fullName': 'Ann R'}))
case('rename_a_deleted_player', rename(6, {'fullName': 'Rex Rex'}))
case('rename_unknown_player', rename('c6000000-0000-4000-8000-0000000000ff', {'fullName': 'Xan Xu'}))
case('rename_other_clubs_player', rename(30, {'fullName': 'Xan Xu'}))
case('rename_malformed_id', rename('m', {'fullName': 'Xan Xu'}), **MALFORMED)
case('rename_lapsed_club', rename(20, {'fullName': 'Larry Lapsed'}, who=LAPSED))
case('rename_twice', [rename(GUS, {'fullName': 'Gus One'}), rename(GUS, {'fullName': 'Gus Two', 'nickname': 'G2'})])
case('rename_changes_the_name_on_live_entries', rename(GUS, {'fullName': 'Gus Renamed'}), scenario='gus_everywhere')
case('rename_leaves_a_released_entry_alone', rename(GUS, {'fullName': 'Gus Renamed'}), scenario='gus_released_on_s1')
case('rename_changes_every_live_entry_of_two_players', [rename(GUS, {'fullName': 'Gus Renamed'}), rename(UNA, {'fullName': 'Una Renamed'})], scenario='gus_and_una_on_s1')
case('rename_leaves_a_no_show_entry_alone', rename(GUS, {'fullName': 'Gus Renamed'}), scenario='gus_no_show_on_s1')
case('rename_leaves_an_invalid_sessions_entry_alone', rename(GUS, {'fullName': 'Gus Renamed'}), scenario='gus_on_an_invalid_session')

SCEN = dict(BASE['scenarios'])
SCEN['una_has_a_phone'] = [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, state, captured_at, created_at, updated_at) VALUES ('{CP(UNA)}', '{CLUB1}', '+639175550111', 'pending', {NOW}, {NOW}, {NOW})"]
SCEN['rex_has_that_phone_and_is_deleted'] = [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, state, captured_at, created_at, updated_at) VALUES ('{CP(6)}', '{CLUB1}', '+639175550199', 'pending', {NOW}, {NOW}, {NOW})"]
SCEN['una_has_experience'] = [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, preset_fields, state, captured_at, created_at, updated_at) VALUES ('{CP(UNA)}', '{CLUB1}', NULL, "
                              f"'{{\"version\":1,\"playingStyle\":\"Old\",\"experienceMonths\":24,\"experienceRecordedAt\":\"2026-03-10T00:00:00.000Z\",\"socialLinks\":{{\"facebook\":\"old\"}}}}'::jsonb, 'pending', {NOW}, {NOW}, {NOW})"]

ASSESS = lambda lvl, at, n: (f"INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, skill_level_id, source_operation_id, assessed_at, received_at, accepted_revision, actor_club_id) "
                             f"VALUES ('a0300000-0000-4000-8000-000000000a{n:02d}', '{CLUB1}', '{CP(GUS)}', 'a3000000-0000-4000-8000-000000000003', 'a7000000-0000-4000-8000-000000000099', {lvl}, 'a0300000-0000-4000-8000-000000000b{n:02d}', TIMESTAMPTZ '{at}', TIMESTAMPTZ '{at}', 1, '{CLUB1}')")
SAVED3 = f"UPDATE club_players SET saved_skill_level_id = 3, saved_level_at = TIMESTAMPTZ '2026-11-10 00:00:00+00' WHERE id = '{CP(GUS)}'"
SCEN['gus_saved_level'] = [SAVED3]
SCEN['gus_assessed_later'] = [SAVED3, ASSESS(6, '2026-11-15 00:00:00+00', 1)]
SCEN['gus_assessed_earlier'] = [SAVED3, ASSESS(6, '2026-11-05 00:00:00+00', 2)]
SCEN['gus_assessed_only'] = [ASSESS(6, '2026-11-05 00:00:00+00', 3)]
SCEN['una_link_only'] = [
    "UPDATE shared_player_entries SET email = NULL, social_key = 'facebook.com/una' WHERE id = 'a6000000-0000-4000-8000-000000000007'",
    f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, preset_fields, state, captured_at, created_at, updated_at) VALUES ('{CP(UNA)}', '{CLUB1}', NULL, "
    f"'{{\"version\":1,\"playingStyle\":\"\",\"experienceMonths\":null,\"experienceRecordedAt\":null,\"socialLinks\":{{\"facebook\":\"fb.com/una\"}}}}'::jsonb, 'pending', {NOW}, {NOW}, {NOW})"]

SCEN['gus_no_show_on_s1'] = BASE['scenarios']['gus_everywhere'] + ["UPDATE session_players SET no_show_at = TIMESTAMPTZ '2026-11-19 01:00:00+00' WHERE released_at IS NULL AND club_player_id = 'c6000000-0000-4000-8000-000000000001'"]
SCEN['gus_on_an_invalid_session'] = BASE['scenarios']['gus_everywhere'] + ["UPDATE queue_sessions SET state = 'invalid', invalid_reason = 'Test' WHERE id IN (SELECT session_id FROM session_players WHERE club_player_id = 'c6000000-0000-4000-8000-000000000001')"]
SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'club_player_private_inputs':
        s['sql'] = s['sql'].replace('phone_e164, email, state,', 'phone_e164, email, preset_fields, state,') if 'preset_fields' not in s['sql'] else s['sql']
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
