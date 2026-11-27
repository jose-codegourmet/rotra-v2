#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/club.cases.json: the club's writes in the Queue app (the invite link, the saved venues,
the club settings, the saved players: add, delete, move, club nickname, registration link).

Run it, then the capture (capture-writes-queue.test.mjs -t club), which writes club.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-club-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/club.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/roster.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
PL = lambda n: f'd4000000-0000-4000-8000-0000000000{n:02d}'
V1, V2, V3 = (f'a5000000-0000-4000-8000-00000000000{n}' for n in (1, 2, 3))
NEWV = lambda n: f'a5000000-0000-4000-8000-0000000001{n:02d}'
OPID = lambda n: f'b2000000-0000-4000-8000-{n:012d}'
UNKNOWN_CP = 'c6000000-0000-4000-8000-0000000000ff'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    """A case. allow500 and goExpects given here belong to the last step."""
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    c = {'name': name, 'scenario': scenario, 'steps': steps}
    c.update(kw)
    cases.append(c)


MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
CRASH = {'allow500': True}
NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}

# ---------------------------------------------------------------- POST /api/club/invite
INV = '/api/club/invite'
case('invite_signed_out', req('POST', INV, who=None))
case('invite_player_subject_is_not_a_club', req('POST', INV, who=PLAYER_SUBJECT, **NOSUBJECT))
case('invite_club_without_a_code_gets_one', req('POST', INV, redact=['inviteCode']))
case('invite_replaces_the_code', req('POST', INV, redact=['inviteCode']), scenario='club_has_a_code')
case('invite_twice_makes_two_different_codes', [req('POST', INV, redact=['inviteCode'], save={'first': 'inviteCode'}), req('POST', INV, redact=['inviteCode'])], scenario='club_has_a_code')
case('invite_lapsed_club', req('POST', INV, who=LAPSED))

# ---------------------------------------------------------------- POST /api/venues
VEN = '/api/venues'
case('venue_signed_out', req('POST', VEN, {'id': NEWV(1), 'name': 'Hall'}, who=None))
case('venue_body_not_json', req('POST', VEN, rawBody='nope'))
case('venue_create', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall'}))
case('venue_create_with_everything', req('POST', VEN, {'id': NEWV(1), 'name': '  New Hall  ', 'address': '  12 Main St ', 'courtFeeMinor': 30000, 'entranceFeeMinor': 0}))
case('venue_create_empty_address_is_none', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'address': '   '}))
case('venue_create_null_fees', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'courtFeeMinor': None, 'entranceFeeMinor': None}))
case('venue_blank_name', req('POST', VEN, {'id': NEWV(1), 'name': '  '}))
case('venue_name_not_text', req('POST', VEN, {'id': NEWV(1), 'name': 5}))
case('venue_negative_fee', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'courtFeeMinor': -1}))
case('venue_fraction_fee', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'entranceFeeMinor': 1.5}))
case('venue_text_fee', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'courtFeeMinor': '100'}))
case('venue_entrance_fee_checked_after_the_court_fee', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'courtFeeMinor': -1, 'entranceFeeMinor': -2}))
case('venue_fee_beyond_an_int_column_crashes_at_the_write', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'courtFeeMinor': 3000000000}), **CRASH)
case('venue_fee_beyond_an_int_column_on_a_retry_is_not_written', [req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall'}), req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall', 'courtFeeMinor': 3000000000})])
case('venue_stale_revision_beats_a_fee_beyond_an_int_column', req('POST', VEN, {'id': V2, 'name': 'Court Two B', 'expectedRevision': '1', 'courtFeeMinor': 3000000000}))
case('venue_id_missing', req('POST', VEN, {'name': 'New Hall'}), **CRASH)
case('venue_id_not_a_uuid', req('POST', VEN, {'id': 'x', 'name': 'New Hall'}), **CRASH)
case('venue_same_name_as_another', req('POST', VEN, {'id': NEWV(1), 'name': 'Smash Hall'}))
case('venue_same_name_in_another_club_is_fine', req('POST', VEN, {'id': NEWV(1), 'name': 'Davao Court'}))
case('venue_retry_answers_the_venue_without_writing', [req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall'}, snapshot=True), req('POST', VEN, {'id': NEWV(1), 'name': 'Renamed'})])
case('venue_edit_at_the_revision', req('POST', VEN, {'id': V1, 'name': 'Smash Hall B', 'address': 'Elsewhere', 'courtFeeMinor': 100, 'expectedRevision': '1'}))
case('venue_edit_clears_the_fees_and_address', req('POST', VEN, {'id': V1, 'name': 'Smash Hall', 'expectedRevision': '1'}))
case('venue_edit_stale_revision', req('POST', VEN, {'id': V2, 'name': 'Court Two B', 'expectedRevision': '1'}))
case('venue_edit_revision_not_a_number', req('POST', VEN, {'id': V1, 'name': 'Smash Hall B', 'expectedRevision': 'x'}))
case('venue_edit_revision_not_text_is_a_retry', req('POST', VEN, {'id': V1, 'name': 'Smash Hall B', 'expectedRevision': 1}))
case('venue_edit_same_name_as_another', req('POST', VEN, {'id': V1, 'name': 'Court Two', 'expectedRevision': '1'}))
case('venue_edit_twice', [req('POST', VEN, {'id': V1, 'name': 'Smash Hall B', 'expectedRevision': '1'}), req('POST', VEN, {'id': V1, 'name': 'Smash Hall C', 'expectedRevision': '2'})])
case('venue_edit_other_clubs_venue', req('POST', VEN, {'id': V3, 'name': 'Mine now', 'expectedRevision': '1'}))
case('venue_lapsed_club', req('POST', VEN, {'id': NEWV(1), 'name': 'New Hall'}, who=LAPSED))
# Two creates of one new venue, or two edits at one revision, race without a lock: which request wins is not decided, so they are tested in race_test.go.

# ---------------------------------------------------------------- PATCH /api/club
CL = '/api/club'
case('club_signed_out', req('PATCH', CL, {'expectedRevision': '1', 'template': 'x'}, who=None))
case('club_body_not_json', req('PATCH', CL, rawBody='nope'))
case('club_without_a_revision', req('PATCH', CL, {'template': 'x'}))
case('club_revision_not_text', req('PATCH', CL, {'expectedRevision': 1, 'template': 'x'}))
case('club_template', req('PATCH', CL, {'expectedRevision': '1', 'template': 'Play tonight at {venue}'}))
case('club_template_null_restores_the_default', req('PATCH', CL, {'expectedRevision': '1', 'template': None}), scenario='club_has_settings')
case('club_template_not_text', req('PATCH', CL, {'expectedRevision': '1', 'template': 5}))
case('club_description_and_court_rules_are_trimmed', req('PATCH', CL, {'expectedRevision': '1', 'description': '  Friendly club  ', 'courtRules': ' Be kind '}))
case('club_description_empty_keeps_an_empty_text', req('PATCH', CL, {'expectedRevision': '1', 'description': '   '}), scenario='club_has_settings')
case('club_description_not_text', req('PATCH', CL, {'expectedRevision': '1', 'description': 5}))
case('club_court_rules_not_text', req('PATCH', CL, {'expectedRevision': '1', 'courtRules': None}))
case('club_self_check_in_on', req('PATCH', CL, {'expectedRevision': '1', 'selfCheckInEnabled': True}))
case('club_self_check_in_off', req('PATCH', CL, {'expectedRevision': '1', 'selfCheckInEnabled': False}), scenario='club_has_settings')
case('club_self_check_in_not_a_boolean', req('PATCH', CL, {'expectedRevision': '1', 'selfCheckInEnabled': 'yes'}))
case('club_nothing_to_change_still_bumps_the_revision', req('PATCH', CL, {'expectedRevision': '1'}))
case('club_checks_run_in_order_revision_template_switch_texts', req('PATCH', CL, {'expectedRevision': '1', 'template': 5, 'selfCheckInEnabled': 'x', 'description': 5}))
case('club_stale_revision', req('PATCH', CL, {'expectedRevision': '2', 'template': 'x'}))
case('club_revision_not_a_number', req('PATCH', CL, {'expectedRevision': 'x', 'template': 'x'}))
case('club_two_edits', [req('PATCH', CL, {'expectedRevision': '1', 'template': 'a'}), req('PATCH', CL, {'expectedRevision': '2', 'template': 'b'})])
case('club_lapsed_club', req('PATCH', CL, {'expectedRevision': '1', 'template': 'x'}, who=LAPSED))
case('club_parallel_edits_at_the_same_revision', {'parallel': [req('PATCH', CL, {'expectedRevision': '1', 'template': 'a'}), req('PATCH', CL, {'expectedRevision': '1', 'template': 'a'})]})

# ---------------------------------------------------------------- POST /api/club/players
PLS = '/api/club/players'
case('player_add_signed_out', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie'}, who=None))
case('player_add_body_not_json', req('POST', PLS, rawBody='nope'))
case('player_add_guest', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie'}))
case('player_add_guest_with_nickname_and_phone', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'nickname': 'Nub', 'phone': '0917 555 0100'}))
case('player_add_guest_blank_phone_is_none', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'phone': '  '}))
case('player_add_bad_phone', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'phone': 'abc'}))
case('player_add_phone_a_saved_player_has_as_private_input', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'phone': '0917 555 0100'}), scenario='gus_has_a_phone')
case('player_add_phone_a_registered_saved_player_has', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'phone': '+639175550001'}))
case('player_add_phone_of_a_deleted_player_is_fine', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'phone': '0917 555 0100'}), scenario='gus_has_a_phone_and_is_deleted')
case('player_add_blank_name', req('POST', PLS, {'operationId': OPID(1), 'name': '  '}))
case('player_add_with_a_new_email', req('POST', PLS, {'operationId': OPID(1), 'name': 'Eli Newmail', 'email': 'eli@example.test'}))
case('player_add_with_an_open_entrys_email', req('POST', PLS, {'operationId': OPID(1), 'name': 'Eve Open', 'email': 'eve@example.test'}))
case('player_add_with_a_registered_players_email', req('POST', PLS, {'operationId': OPID(1), 'name': 'Gil Again', 'email': 'gil@example.test'}))
case('player_add_with_an_email_already_saved', req('POST', PLS, {'operationId': OPID(1), 'name': 'Una Again', 'email': 'una@example.test'}))
case('player_add_with_a_bad_email', req('POST', PLS, {'operationId': OPID(1), 'name': 'Bad', 'email': 'nope'}))
case('player_add_retry_same_operation', [req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'email': 'eli@example.test'}, snapshot=True), req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie', 'email': 'eli@example.test'})])
case('player_add_operation_id_missing', req('POST', PLS, {'name': 'Newbie'}), **CRASH)
case('player_add_directory_registered_player', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(6)}))
case('player_add_directory_deleted_record_is_restored', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(3)}))
case('player_add_directory_already_saved', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(2)}))
case('player_add_directory_unclaimed_person_with_a_name', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': 'a6000000-0000-4000-8000-000000000008', 'name': 'Uri B.'}))
case('player_add_directory_unclaimed_person_without_a_name', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': 'a6000000-0000-4000-8000-000000000008'}))
case('player_add_directory_saved_unclaimed_person', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': 'a6000000-0000-4000-8000-000000000007', 'name': 'Una'}))
case('player_add_directory_unknown', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': 'd4000000-0000-4000-8000-0000000000ff'}))
case('player_add_directory_malformed_id', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': 'x'}), **MALFORMED)
case('player_add_directory_retry_says_already_saved', [req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(6)}), req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(6)})])
case('player_add_lapsed_club', req('POST', PLS, {'operationId': OPID(1), 'name': 'Newbie'}, who=LAPSED))

# ---- #1019 social links on a new player and the saved level on Add player (task 2.7)


def add(**kw):
    return req('POST', PLS, {'operationId': OPID(1), **kw})


case('player_add_with_a_social_link', add(name='Link Newbie', socialLink='https://facebook.com/Link.Newbie/'))
case('player_add_with_a_link_without_a_scheme', add(name='Link Newbie', socialLink=' www.fb.com/link.newbie?ref=x#top '))
case('player_add_with_an_instagram_link', add(name='Link Newbie', socialLink='instagram.com/link_newbie'))
case('player_add_with_a_youtube_link', add(name='Link Newbie', socialLink='https://youtu.be/@linknewbie'))
case('player_add_with_a_linkedin_link', add(name='Link Newbie', socialLink='https://m.linkedin.com/in/link-newbie/'))
case('player_add_with_a_link_and_a_nickname', add(name='Link Newbie', nickname='Linky', socialLink='facebook.com/link.newbie'))
case('player_add_with_a_link_and_a_phone', add(name='Link Newbie', phone='0917 555 0188', socialLink='facebook.com/link.newbie'))
case('player_add_with_a_link_and_a_new_email', add(name='Link Newbie', email='link.newbie@example.test', socialLink='facebook.com/link.newbie'))
case('player_add_with_a_link_and_a_registered_players_email', add(name='Link Newbie', email='gil@example.test', socialLink='facebook.com/link.newbie'))
case('player_add_with_a_link_and_an_open_entrys_email', add(name='Link Newbie', email='eve@example.test', socialLink='facebook.com/link.newbie'))
case('player_add_with_a_link_and_a_bad_email', add(name='Link Newbie', email='nope', socialLink='facebook.com/link.newbie'))
case('player_add_with_a_link_of_an_open_entry', add(name='Eve Open', socialLink='https://facebook.com/eve.open'), scenario='eve_has_a_link')
case('player_add_with_a_link_of_an_open_entry_and_an_email', add(name='Eve Open', email='someone.else@example.test', socialLink='facebook.com/Eve.Open/'), scenario='eve_has_a_link')
case('player_add_with_a_link_already_saved', add(name='Una Again', socialLink='facebook.com/una'), scenario='una_has_a_link')
case('player_add_with_a_link_already_saved_and_an_email', add(name='Una Again', email='fresh@example.test', socialLink='fb.com/una/'), scenario='una_has_a_link')
case('player_add_with_a_link_that_is_not_a_profile', add(name='Bad Link', socialLink='https://example.com/someone'))
case('player_add_with_a_bare_site', add(name='Bad Link', socialLink='facebook.com'))
case('player_add_with_a_bare_site_and_a_slash', add(name='Bad Link', socialLink='https://facebook.com/'))
case('player_add_with_text_that_is_not_a_link', add(name='Bad Link', socialLink='nope'))
case('player_add_with_a_bad_link_and_a_phone', add(name='Bad Link', phone='0917 555 0188', socialLink='nope'))
case('player_add_link_not_text', add(name='Link Newbie', socialLink=5))
case('player_add_with_a_link_retry_same_operation', [add(name='Link Newbie', socialLink='facebook.com/link.newbie'), add(name='Link Newbie', socialLink='facebook.com/link.newbie')])
case('player_add_with_a_level', add(name='Level Newbie', level='intermediate_mid'))
case('player_add_with_a_level_and_an_email', add(name='Level Newbie', email='level.newbie@example.test', level='advanced_low'))
case('player_add_with_a_level_and_a_link', add(name='Level Newbie', socialLink='facebook.com/level.newbie', level='beginner_low'))
case('player_add_with_a_level_that_is_not_a_level', add(name='Level Newbie', level='wizard'))
case('player_add_with_a_level_that_is_not_a_level_adds_nobody', add(name='Level Newbie', email='level.newbie@example.test', level='wizard'))
case('player_add_level_not_text', add(name='Level Newbie', level=5))
case('player_add_with_an_empty_level', add(name='Level Newbie', level=''))
case('player_add_directory_registered_player_with_a_level', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(6), 'level': 'advanced_mid'}))
case('player_add_directory_registered_player_with_a_bad_level', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(6), 'level': 'wizard'}))
case('player_add_directory_deleted_record_restored_with_a_level', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(3), 'level': 'beginner_high'}))
case('player_add_directory_unclaimed_person_with_a_level', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': 'a6000000-0000-4000-8000-000000000009', 'name': 'Eve Mine', 'level': 'intermediate_high'}))
case('player_add_directory_already_saved_with_a_level', req('POST', PLS, {'source': 'directory', 'operationId': OPID(1), 'playerId': PL(2), 'level': 'advanced_high'}))

# ---------------------------------------------------------------- POST club-nickname
def nick(cp, value, **kw):
    return req('POST', f'{PLS}/{cp}/club-nickname', {'clubNickname': value}, **kw)


case('nickname_signed_out', nick(CP(3), 'Annie', who=None))
case('nickname_set', nick(CP(3), 'Annie'))
case('nickname_is_trimmed', nick(CP(3), '  Annie  '))
case('nickname_changed', nick(CP(3), 'Anne'), scenario='ann_has_a_club_nickname')
case('nickname_removed', nick(CP(3), ''), scenario='ann_has_a_club_nickname')
case('nickname_blank_removes', nick(CP(3), '   '), scenario='ann_has_a_club_nickname')
case('nickname_none_to_remove', nick(CP(3), ''))
case('nickname_not_text_removes', req('POST', f'{PLS}/{CP(3)}/club-nickname', {'clubNickname': 5}), scenario='ann_has_a_club_nickname')
case('nickname_guest_is_forbidden', nick(CP(1), 'Gus'))
case('nickname_unclaimed_player_is_forbidden', nick(CP(5), 'Una'))
case('nickname_removed_player', nick(CP(6), 'x'))
case('nickname_other_clubs_player', nick(CP(30), 'x'))
case('nickname_unknown_player', nick(UNKNOWN_CP, 'x'))
case('nickname_id_not_a_uuid_is_not_found', nick('nope', 'x'))
case('nickname_uppercase_id', nick(CP(3).upper(), 'Annie'))
case('nickname_body_not_json', req('POST', f'{PLS}/{CP(3)}/club-nickname', rawBody='nope'))
case('nickname_lapsed_club', nick(CP(20), 'x', who=LAPSED))

# ---------------------------------------------------------------- DELETE /api/club/players/{id}
D = lambda cp: f'{PLS}/{cp}'
case('delete_player_signed_out', req('DELETE', D(CP(1)), who=None))
case('delete_a_guest', req('DELETE', D(CP(1))))
case('delete_a_registered_player_with_a_waitlist_spot', req('DELETE', D(CP(3))))
case('delete_releases_prepared_slots_marks_the_live_one_away', req('DELETE', D(CP(7))), scenario='hal_present_on_s3')
case('delete_closes_the_match_requests_that_named_them', req('DELETE', D(CP(7))), scenario='hal_present_on_s3')
case('delete_a_player_on_court', req('DELETE', D(CP(7))), scenario='hal_on_court')
case('delete_a_player_in_a_waiting_match_is_fine', req('DELETE', D(CP(7))), scenario='hal_in_a_waiting_match')
case('delete_a_no_show_entry_is_left_as_it_is', req('DELETE', D(CP(7))), scenario='hal_no_show')
case('delete_retires_an_unclaimed_persons_entry', req('DELETE', D(CP(5))))
case('delete_a_removed_player', req('DELETE', D(CP(6))))
case('delete_twice', [req('DELETE', D(CP(1))), req('DELETE', D(CP(1)))])
case('delete_unknown_player', req('DELETE', D(UNKNOWN_CP)))
case('delete_other_clubs_player', req('DELETE', D(CP(30))))
case('delete_malformed_id', req('DELETE', D('nope')), **MALFORMED)
case('delete_lapsed_club', req('DELETE', D(CP(20)), who=LAPSED))

# ---------------------------------------------------------------- POST move
def move(frm, into, email, **kw):
    return req('POST', f'{PLS}/{frm}/move', {'intoClubPlayerId': into, 'email': email}, **kw)


case('move_signed_out', move(CP(1), CP(5), 'una@example.test', who=None))
case('move_a_guest_into_the_saved_player_with_that_email', move(CP(1), CP(5), 'una@example.test'), scenario='gus_everywhere')
case('move_email_is_normalized', move(CP(1), CP(5), '  UNA@Example.TEST '), scenario='gus_everywhere')
case('move_into_a_registered_player', move(CP(1), CP(4), 'ben@example.test'), scenario='gus_everywhere')
case('move_a_guest_with_nothing_to_move', move(CP(1), CP(5), 'una@example.test'))
case('move_where_both_hold_a_slot_in_one_session', move(CP(1), CP(5), 'una@example.test'), scenario='gus_and_una_on_s1')
case('move_where_both_hold_a_slot_one_released_still_counts', move(CP(1), CP(5), 'una@example.test'), scenario='gus_and_una_on_s1_una_released')
case('move_keeps_the_other_players_waitlist_spot', move(CP(1), CP(5), 'una@example.test'), scenario='gus_and_una_both_waiting_on_s2')
case('move_a_released_slot_keeps_its_name', move(CP(1), CP(5), 'una@example.test'), scenario='gus_released_on_s1')
case('move_email_empty', move(CP(1), CP(5), ''))
case('move_email_not_text', req('POST', f'{PLS}/{CP(1)}/move', {'intoClubPlayerId': CP(5), 'email': 5}))
case('move_email_malformed', move(CP(1), CP(5), 'nope'))
case('move_email_of_nobody_in_the_club', move(CP(1), CP(5), 'eve@example.test'))
case('move_email_of_another_saved_player', move(CP(1), CP(5), 'ben@example.test'))
case('move_unknown_email', move(CP(1), CP(5), 'nobody@example.test'))
case('move_from_a_player_that_has_an_email', move(CP(5), CP(4), 'ben@example.test'))
case('move_from_a_registered_player', move(CP(3), CP(4), 'ben@example.test'))
case('move_into_itself', move(CP(1), CP(1), 'una@example.test'))
case('move_into_a_removed_player', move(CP(1), CP(6), 'una@example.test'))
case('move_unknown_player', move(UNKNOWN_CP, CP(5), 'una@example.test'))
case('move_into_an_unknown_player', move(CP(1), UNKNOWN_CP, 'una@example.test'))
case('move_other_clubs_player', move(CP(30), CP(5), 'una@example.test'))
case('move_malformed_id', move('nope', CP(5), 'una@example.test'), **CRASH)
case('move_into_missing', req('POST', f'{PLS}/{CP(1)}/move', {'email': 'una@example.test'}), **CRASH)
case('move_body_not_json', req('POST', f'{PLS}/{CP(1)}/move', rawBody='nope'))
case('move_lapsed_club', move(CP(20), CP(31), 'uri@example.test', who=LAPSED))
case('move_revokes_the_moved_players_claim_link', move(CP(1), CP(5), 'una@example.test'), scenario='gus_everywhere')

# ---------------------------------------------------------------- POST registration-link
def link(cp, **kw):
    return req('POST', f'{PLS}/{cp}/registration-link', **kw)


R = {'redact': ['token', 'expiresAt']}  # expiresAt is a fixed seven days after the fixed clock: pinned, not redacted
case('link_signed_out', link(CP(1), who=None))
case('link_for_a_guest', req('POST', f'{PLS}/{CP(1)}/registration-link', redact=['token']))
case('link_for_an_unclaimed_player_with_an_email', req('POST', f'{PLS}/{CP(5)}/registration-link', redact=['token']))
case('link_for_a_saved_player_linked_to_an_unclaimed_profile', req('POST', f'{PLS}/{CP(40)}/registration-link', redact=['token']), scenario='dee_saved')
case('link_twice_revokes_the_first', [req('POST', f'{PLS}/{CP(1)}/registration-link', redact=['token']), req('POST', f'{PLS}/{CP(1)}/registration-link', redact=['token'])])
case('link_twice_for_a_profile_player_revokes_the_first', [req('POST', f'{PLS}/{CP(40)}/registration-link', redact=['token']), req('POST', f'{PLS}/{CP(40)}/registration-link', redact=['token'])], scenario='dee_saved')
case('link_for_a_registered_player_is_refused', req('POST', f'{PLS}/{CP(3)}/registration-link'))
case('link_for_a_removed_player', req('POST', f'{PLS}/{CP(6)}/registration-link'))
case('link_unknown_player', req('POST', f'{PLS}/{UNKNOWN_CP}/registration-link'))
case('link_other_clubs_player', req('POST', f'{PLS}/{CP(30)}/registration-link'))
case('link_malformed_id', req('POST', f'{PLS}/nope/registration-link'), **CRASH)
case('link_lapsed_club', req('POST', f'{PLS}/{CP(20)}/registration-link', who=LAPSED))

# ---------------------------------------------------------------- POST and DELETE /api/club/name-change
NC = '/api/club/name-change'
CMD = lambda n: f'b3000000-0000-4000-8000-{n:012d}'
NCRED = ['request.id']
case('namechange_signed_out', req('POST', NC, {'commandId': CMD(1), 'name': 'New Name'}, who=None))
case('namechange_body_not_json', req('POST', NC, rawBody='nope'))
case('namechange_request', req('POST', NC, {'commandId': CMD(1), 'name': 'New Name'}, redact=NCRED))
case('namechange_name_is_trimmed', req('POST', NC, {'commandId': CMD(1), 'name': '   Spaced   Out  '}, redact=NCRED))
case('namechange_own_name_in_other_case_is_allowed', req('POST', NC, {'commandId': CMD(1), 'name': 'SMASH club'}, redact=NCRED))
case('namechange_blank_name', req('POST', NC, {'commandId': CMD(1), 'name': '   '}))
case('namechange_name_not_text', req('POST', NC, {'commandId': CMD(1), 'name': 5}))
case('namechange_command_missing', req('POST', NC, {'name': 'New Name'}))
case('namechange_command_not_text', req('POST', NC, {'commandId': 5, 'name': 'New Name'}))
case('namechange_command_not_a_uuid', req('POST', NC, {'commandId': 'x', 'name': 'New Name'}))
case('namechange_name_of_another_club', req('POST', NC, {'commandId': CMD(1), 'name': '  Other-CLUB '}))
case('namechange_second_pending_is_refused', [req('POST', NC, {'commandId': CMD(1), 'name': 'First Name'}, redact=NCRED), req('POST', NC, {'commandId': CMD(2), 'name': 'Second Name'})])
case('namechange_retry_of_the_same_command', [req('POST', NC, {'commandId': CMD(1), 'name': 'First Name'}, redact=NCRED), req('POST', NC, {'commandId': CMD(1), 'name': 'Changed Name'}, redact=NCRED)])
case('namechange_retry_after_cancel_returns_the_cancelled_one', [req('POST', NC, {'commandId': CMD(1), 'name': 'First Name'}, redact=NCRED), req('DELETE', NC), req('POST', NC, {'commandId': CMD(1), 'name': 'First Name'}, redact=NCRED)])
case('namechange_new_request_after_cancel', [req('POST', NC, {'commandId': CMD(1), 'name': 'First Name'}, redact=NCRED), req('DELETE', NC), req('POST', NC, {'commandId': CMD(2), 'name': 'Second Name'}, redact=NCRED)])
case('namechange_command_of_another_club', req('POST', NC, {'commandId': CMD(9), 'name': 'New Name'}), scenario='other_club_name_change')
case('namechange_while_one_is_pending', req('POST', NC, {'commandId': CMD(2), 'name': 'Second Name'}), scenario='club_has_a_name_change')
case('namechange_lapsed_club', req('POST', NC, {'commandId': CMD(1), 'name': 'New Name'}, who=LAPSED))
case('namechange_cancel_signed_out', req('DELETE', NC, who=None))
case('namechange_cancel_pending', req('DELETE', NC), scenario='club_has_a_name_change')
case('namechange_cancel_nothing_pending', req('DELETE', NC))
case('namechange_cancel_twice', [req('DELETE', NC), req('DELETE', NC)], scenario='club_has_a_name_change')
case('namechange_cancel_leaves_another_clubs_request', req('DELETE', NC), scenario='other_club_name_change')
case('namechange_cancel_lapsed_club', req('DELETE', NC, who=LAPSED))

# ---------------------------------------------------------------- scenarios
SCEN = dict(BASE['scenarios'])
SCEN['una_has_a_link'] = [f"UPDATE shared_player_entries SET social_key = 'facebook.com/una' WHERE id = 'a6000000-0000-4000-8000-000000000007'"]
SCEN['eve_has_a_link'] = [f"UPDATE shared_player_entries SET social_key = 'facebook.com/eve.open' WHERE id = 'a6000000-0000-4000-8000-000000000009'"]
SCEN.update({
    'club_has_a_name_change': [f"INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at, state, source_command_id, created_at, updated_at, revision) VALUES ('b4000000-0000-4000-8000-000000000001', '{CLUB1}', 'Pending Name', 'pending name', {NOW}, 'pending', '{'b3000000-0000-4000-8000-000000000001'}', {NOW}, {NOW}, 1)"],
    'other_club_name_change': [f"INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at, state, source_command_id, created_at, updated_at, revision) VALUES ('b4000000-0000-4000-8000-000000000009', 'c9000000-0000-4000-8000-000000000003', 'Other Pending', 'other pending', {NOW}, 'pending', '{'b3000000-0000-4000-8000-000000000009'}', {NOW}, {NOW}, 1)"],
    'club_has_a_code': ["UPDATE clubs SET invite_code = 'ABCDEFGHJK' WHERE id = '" + CLUB1 + "'"],
    'club_has_settings': [f"UPDATE clubs SET post_template = 'Old template', description = 'Old description', court_rules = 'Old rules', self_check_in_enabled = true WHERE id = '{CLUB1}'"],
    'gus_has_a_phone': [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, state, captured_at, created_at, updated_at) VALUES ('{CP(1)}', '{CLUB1}', '+639175550100', 'pending', {NOW}, {NOW}, {NOW})"],
    'gus_has_a_phone_and_is_deleted': [f"INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, state, captured_at, created_at, updated_at) VALUES ('{CP(1)}', '{CLUB1}', '+639175550100', 'pending', {NOW}, {NOW}, {NOW})",
                                       f"UPDATE club_players SET removed_at = TIMESTAMPTZ '2026-11-05 00:00:00+00' WHERE id = '{CP(1)}'"],
    'ann_has_a_club_nickname': [f"UPDATE club_players SET nickname = 'Old nick' WHERE id = '{CP(3)}'"],
    'hal_present_on_s3': [f"UPDATE session_players SET present = true WHERE id = '{SP(4)}'"],
    'dee_saved': [f"INSERT INTO club_players (id, club_id, player_id, display_name, nickname, shared_entry_id, added_at, revision, created_at, updated_at) VALUES ('{CP(40)}', '{CLUB1}', '{PL(4)}', 'Dee Unclaimed', NULL, NULL, {NOW}, 1, {NOW}, {NOW})"],
})


def entry_sql(sp, session, cp, name, released=False, waiting_only=False):
    return (f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, "
            f"released_at, release_reason, created_at, updated_at, revision) VALUES ('{SP(sp)}', '{CLUB1}', '{S[session]}', '{CP(cp)}', '{name}', false, {NOW}, 3, "
            f"TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', "
            f"{'TIMESTAMPTZ ' + repr('2026-11-16 00:00:00+00') if released else 'NULL'}, {repr('removed') if released else 'NULL'}, {NOW}, {NOW}, 1)")


def wait_sql(n, session, cp):
    return (f"INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, created_at, updated_at) VALUES "
            f"('a3300000-0000-4000-8000-0000000001{n:02d}', '{CLUB1}', '{S[session]}', '{CP(cp)}', 3, TIMESTAMPTZ '2026-11-17 00:00:00+00', {NOW}, {NOW})")


GUS_LINK = (f"INSERT INTO club_player_claim_links (id, club_id, club_player_id, token_digest, state, issued_at, expires_at, created_at, updated_at, revision) VALUES "
            f"('a8000000-0000-4000-8000-000000000001', '{CLUB1}', '{CP(1)}', decode('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 'hex'), 'active', {NOW}, TIMESTAMPTZ '2026-11-26 02:00:00+00', {NOW}, {NOW}, 1)")
GUS_REQUEST = (f"INSERT INTO session_join_requests (id, club_id, session_id, name, stated_band, placement, status, requested_at, club_player_id, created_at, updated_at, revision) VALUES "
               f"('a3400000-0000-4000-8000-000000000030', '{CLUB1}', '{S[1]}', 'Gus Guest', 'unsure', 'slot', 'pending', {NOW}, '{CP(1)}', {NOW}, {NOW}, 1)")
SCEN['gus_everywhere'] = [entry_sql(20, 1, 1, 'Gus Guest'), wait_sql(1, 2, 1), GUS_REQUEST, GUS_LINK, entry_sql(21, 5, 1, 'Gus Old', released=True)]
SCEN['gus_released_on_s1'] = [entry_sql(20, 1, 1, 'Gus Old', released=True)]
SCEN['gus_and_una_on_s1'] = [entry_sql(20, 1, 1, 'Gus Guest'), entry_sql(22, 1, 5, 'Una Alonzo')]
SCEN['gus_and_una_on_s1_una_released'] = [entry_sql(20, 1, 1, 'Gus Guest'), entry_sql(22, 1, 5, 'Una Alonzo', released=True)]
SCEN['gus_and_una_both_waiting_on_s2'] = [wait_sql(1, 2, 1), wait_sql(2, 2, 5)]
# Hal is on the live night; a waiting match, or a match on court, holds him.
SCEN['hal_on_court'] = [f"UPDATE session_players SET present = true WHERE id = '{SP(4)}'"]
SCEN['hal_in_a_waiting_match'] = [f"UPDATE session_players SET present = true WHERE id = '{SP(4)}'"]


def match_sql(n, entry, state, court=False):
    mid = f'a4000000-0000-4000-8000-0000000000{n:02d}'
    out = [f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, source_operation_id, placed_at, started_at, created_at, updated_at, revision) "
           f"VALUES ('{mid}', '{CLUB1}', '{S[3]}', {n}, '{state}', 'singles', {n}, 'manual', 'a4100000-0000-4000-8000-0000000000{n:02d}', "
           f"{NOW if state != 'waiting' else 'NULL'}, {NOW if state == 'active' else 'NULL'}, {NOW}, {NOW}, 1)",
           f"INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, joined_at, created_at, updated_at) "
           f"VALUES ('a4200000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S[3]}', '{mid}', '{SP(entry)}', 'A', 1, 'a4300000-0000-4000-8000-0000000000{n:02d}', {NOW}, {NOW}, {NOW})"]
    return out


SCEN['hal_on_court'] += match_sql(1, 4, 'active')
SCEN['hal_in_a_waiting_match'] += match_sql(1, 4, 'waiting')

SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'session_players':
        s['sql'] = s['sql'].replace('no_show_at, revision::text', 'no_show_at, games_adjustment, revision::text')
    if s['name'] == 'club_players':
        s['sql'] = s['sql'].replace('removed_at, linked_to_club_player_id,', 'removed_at, saved_skill_level_id, saved_level_at, linked_to_club_player_id,')
    if s['name'] == 'shared_player_entries':
        s['sql'] = s['sql'].replace('SELECT email, rtr_id,', 'SELECT email, social_key, rtr_id,')
    if s['name'] == 'club_player_private_inputs':
        s['sql'] = s['sql'].replace('phone_e164, email, state,', 'phone_e164, email, preset_fields, state,')
    SNAPSHOT.append(s)
SNAPSHOT += [
    {'name': 'clubs', 'sql': "SELECT id, name, invite_code, post_template, description, court_rules, self_check_in_enabled, revision::text AS revision, updated_at FROM clubs ORDER BY id", 'redact': ['invite_code']},
    {'name': 'club_venues', 'sql': "SELECT id, club_id, name, address, court_fee_per_court_hour_minor, entrance_fee_minor, currency, created_at, updated_at, revision::text AS revision FROM club_venues ORDER BY id"},
    {'name': 'club_name_change_requests', 'sql': "SELECT club_id, requested_name, requested_name_key, requested_at, state, reviewed_at, source_command_id, created_at, updated_at, revision::text AS revision FROM club_name_change_requests ORDER BY club_id, requested_at, source_command_id"},
    {'name': 'club_player_claim_links', 'sql': "SELECT club_player_id, club_id, state, issued_at, expires_at, consumed_at, revoked_at, created_at, updated_at, revision::text AS revision FROM club_player_claim_links ORDER BY club_player_id, revision, state"},
    {'name': 'player_claim_links', 'sql': "SELECT player_id, issuing_club_id, state, issued_at, expires_at, consumed_at, revoked_at, created_at, updated_at, revision::text AS revision FROM player_claim_links ORDER BY player_id, revision, state"},
]

doc = {'now': BASE['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}


def tidy(step_):
    for k in [k for k, v in step_.items() if v is None and k != 'who']:
        del step_[k]
    for p in step_.get('parallel', []):
        tidy(p)
    return step_


for c in cases:
    for s in c['steps']:
        tidy(s)
names = [c['name'] for c in cases]
assert len(set(names)) == len(names), [n for n in names if names.count(n) > 1]
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
