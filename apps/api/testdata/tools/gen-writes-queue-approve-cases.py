#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/approve.cases.json: the Queue Master's Approve of a slot transfer (task 5.5),
POST /api/sessions/{sessionId}/requests/transfers/{transferId}/approve (#1011, #1013, approveSlotTransfer in packages/db/src/queue/slot-transfers.ts).

Run it, then the capture with the server zone fixed, as the servers run:
  TZ=UTC ROTRA_CAPTURE_DB_URL=... node .../vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs \\
    apps/api/testdata/tools/capture-writes-queue.test.mjs -t approve
Usage: python3 apps/api/testdata/tools/gen-writes-queue-approve-cases.py

The scenarios, helpers and snapshot are those of the transfers group (gen-writes-queue-transfers-cases.py, task 2.12): session 6 (Noon Break, Smash,
prepared, 4 players per court on 1 court) is the transfer night. Ann (registered, RTR 0001) has paid part of 900, Ben all, Cy nothing, Hal is a guest;
the waitlist is Kai (no level), Una (level 2), Lee (level 3). Gil (registered, RTR 0006, no saved player in the club) is the usual recipient; Fay has
no RTR ID and Dee's profile is unclaimed, so neither can take a slot (Player not available). Hugh is a registered player added here.
What is generated and cannot match is named, never hidden by shape: the database's own now() (a column default). Every other time is the fixed clock.
"""
import json
import os

HERE = os.path.dirname(__file__)
SRC = open(os.path.join(HERE, 'gen-writes-queue-transfers-cases.py')).read()
# the helpers and the scenarios of the transfers group, up to its routes (no case of it is kept)
exec(compile(SRC[:SRC.index('# ---------------------------------------------------------------- the routes')], 'transfers-scenarios', 'exec'))
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/approve.cases.json')
TRANSFERS = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/transfers.cases.json')))
cases.clear()

GIL, GILP = CP(41), PL(6)
HUGH_P = PL(7)
LEVEL = 'intermediate_low'


def approve(session, transfer_id, body='__default__', who=SMASH, **kw):
    b = {'level': LEVEL} if body == '__default__' else body
    return req('POST', f'/api/sessions/{session}/requests/transfers/{transfer_id}/approve', b, who=who, **kw)


def reject(session, transfer_id, who=SMASH, **kw):
    return req('POST', f'/api/sessions/{session}/requests/transfers/{transfer_id}/reject', who=who, **kw)


def approve_with(session, transfer_id, who=SMASH, **fields):
    return approve(session, transfer_id, {'level': LEVEL, **fields}, who=who)


# ---------------------------------------------------------------- scenarios of this group
HUGH = ["INSERT INTO players (id, full_name, nickname, profile_visibility, profile_state, hide_phone_from_clubs, revision, created_at, updated_at) VALUES "
        f"('{HUGH_P}', 'Hugh Reyes', 'Hu', 'public', 'claimed', false, 1, {T0}, {T0})",
        "INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at) VALUES "
        f"('{HUGH_P}', 'RTR-PH-CEB-102926-0007', '{CLUB1}', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 7, TIMESTAMPTZ '2026-10-29 01:00:00+00')",
        "INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, updated_at) VALUES "
        f"('{HUGH_P}', 'supabase', 'f4000000-0000-4000-8000-000000000007', {T0}, 1, NULL, NULL, {T0})"]
GIL_SAVED = ["INSERT INTO club_players (id, club_id, player_id, display_name, added_at, revision, created_at, updated_at) VALUES "
             f"('{GIL}', '{CLUB1}', '{GILP}', 'Gil Gomez', {T0}, 1, {T0}, {T0})"]
GIL_REMOVED = ["INSERT INTO club_players (id, club_id, player_id, display_name, added_at, removed_at, revision, created_at, updated_at) VALUES "
               f"('{GIL}', '{CLUB1}', '{GILP}', 'Gil Gomez', {T0}, TIMESTAMPTZ '2026-11-05 00:00:00+00', 1, {T0}, {T0})"]


def pending(n, sender, recipient=GILP, link=False):
    s = {1: (ANN6, ANN, PL(1)), 2: (BEN6, BEN, PL(2)), 3: (CY6, CY, PL(3))}[sender]
    return transfer(n, S[6], s[0], s[1], s[2], recipient, link=link)


def join_request(player, club_player='NULL'):
    return ["INSERT INTO session_join_requests (id, club_id, session_id, name, stated_band, placement, status, requested_at, club_player_id, player_id, created_at, updated_at, revision) VALUES "
            f"('a3400000-0000-4000-8000-000000000070', '{CLUB1}', '{S[6]}', 'Gil Gomez', 'unsure', 'slot', 'pending', {NOW}, {club_player}, '{player}', {NOW}, {NOW}, 1)"]


A = {}
A['ann_to_gil'] = sql(BASE6, pending(1, 1))
A['ben_paid_all_to_gil'] = sql(BASE6, pending(1, 2))
A['cy_unpaid_to_gil'] = sql(BASE6, pending(1, 3))
A['three_to_gil'] = sql(BASE6, pending(1, 1), pending(2, 2), pending(3, 3))
A['ann_to_gil_saved'] = sql(BASE6, GIL_SAVED, pending(1, 1))
A['ann_to_gil_removed'] = sql(BASE6, GIL_REMOVED, pending(1, 1))
A['ann_to_gil_waitlisted'] = sql(BASE6, GIL_SAVED, waiter(14, GIL, 4, 4), pending(1, 1))
A['ann_to_gil_waitlisted_first'] = sql(BASE6, GIL_SAVED, waiter(14, GIL, 4, 0), pending(1, 1))
A['ann_to_gil_waitlisted_no_level'] = sql(BASE6, GIL_SAVED, waiter(14, GIL, 'NULL', 4), pending(1, 1))
A['ann_to_gil_has_a_slot'] = sql(BASE6, GIL_SAVED, entry(48, S[6], GIL, 'Gil Gomez', 3, GILP, 5), pending(1, 1))
A['ann_to_gil_has_a_slot_released'] = sql(BASE6, GIL_SAVED, entry(48, S[6], GIL, 'Gil Gomez', 3, GILP, 5, released=True), pending(1, 1))
A['ann_to_gil_join_request'] = sql(BASE6, join_request(GILP), pending(1, 1))
A['ann_to_gil_join_request_decided'] = sql(BASE6, join_request(GILP), ["UPDATE session_join_requests SET status = 'declined', decided_at = %s" % NOW], pending(1, 1))
A['ann_to_gil_other_request'] = sql(BASE6, join_request(PL(2)), pending(1, 1))
A['ann_to_gil_drop_out_notice'] = sql(BASE6, pending(1, 1), SCEN['t6_pending_drop_out_notice'][-1:])
A['ann_to_gil_calculated_minimum'] = sql(BASE6, ["UPDATE queue_sessions SET minimum_games = 99 WHERE id = '%s'" % S[6]], pending(1, 1))
A['ann_to_gil_fixed_minimum'] = sql(BASE6, ["UPDATE queue_sessions SET minimum_is_calculated = false, minimum_games = 7 WHERE id = '%s'" % S[6]], pending(1, 1))
A['ann_to_gil_no_estimate'] = sql(ROSTER6, WAIT6, PAID6, pending(1, 1))
A['ann_to_gil_break_even'] = sql(estimate(S[6], 35000, 6000, 'break_even', 'NULL'), ROSTER6, WAIT6, PAID6, pending(1, 1))
A['ann_to_gil_waiver_earlier'] = sql(BASE6, pending(1, 1), ["UPDATE session_players SET is_free = true WHERE id = '%s'" % HAL6])
A['ann_to_fay'] = sql(BASE6, pending(1, 1, PL(5)))
A['ann_to_dee_unclaimed'] = sql(BASE6, pending(1, 1, PL(4)))
A['ann_to_gil_link_claimed'] = sql(BASE6, pending(1, 1, link=True))
A['ann_link_unclaimed'] = sql(BASE6, pending(1, 1, None, link=True))
A['ann_to_gil_sender_released'] = sql(BASE6, pending(1, 1), ["UPDATE session_players SET released_at = %s, release_reason = 'removed' WHERE id = '%s'" % (NOW, ANN6)])
A['ann_to_gil_sender_no_show'] = sql(BASE6, pending(1, 1), ["UPDATE session_players SET no_show_at = %s WHERE id = '%s'" % (NOW, ANN6)])
A['ann_to_gil_decided'] = {st: sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), GILP, status=st, decided='2026-11-19 02:30:00+00')) for st in ('rejected', 'expired', 'cancelled')}
for st, stm in A['ann_to_gil_decided'].items():
    A[f'ann_to_gil_{st}'] = stm
del A['ann_to_gil_decided']
A['ann_to_gil_withdrawn'] = sql(BASE6, ["INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, status, requested_at, decided_at, withdrawn_by_player_id) VALUES "
                                        f"('{TR(1)}', '{CLUB1}', '{S[6]}', '{ANN6}', '{ANN}', '{PL(1)}', '{GILP}', 'withdrawn', TIMESTAMPTZ '2026-11-19 01:30:00+00', TIMESTAMPTZ '2026-11-19 02:30:00+00', '{PL(1)}')"])
A['ann_to_gil_approved'] = sql(BASE6, GIL_SAVED, entry(45, S[6], GIL, 'Gil Gomez', 3, GILP, 4),
                               ["UPDATE session_players SET released_at = %s, release_reason = 'transferred' WHERE id = '%s'" % (NOW, ANN6)],
                               transfer(1, S[6], ANN6, ANN, PL(1), GILP, status='approved', decided='2026-11-19 01:05:00+00', approved=(GIL6, GIL, 90000, 50000, 0, 40000)))
A['ann_to_gil_started'] = sql(BASE6, pending(1, 1), [f"UPDATE queue_sessions SET state = 'invalid', invalid_reason = 'Test night' WHERE id = '{S[3]}'", f"UPDATE queue_sessions SET state = 'active', started_at = {NOW} WHERE id = '{S[6]}'"])
A['ann_to_gil_live_night'] = sql(EST_S3_EVEN, transfer(1, S[3], HAL3, HAL, PL(1), GILP))
A['ann_to_gil_other_session'] = sql(BASE6, entry(46, S[2], CP(12), 'Lee Guest', 3, PL(3), 5), transfer(1, S[2], SP(46), CP(12), PL(3), GILP))
A['gil_took_ann_then_hands_on'] = sql(SCEN['t6_approved_gil_paid'], HUGH, transfer(2, S[6], GIL6, CP(40), GILP, HUGH_P))
A['ann_to_gil_full_roster'] = sql(BASE6, ["UPDATE queue_sessions SET players_per_court = 2 WHERE id = '%s'" % S[6]], pending(1, 1))
A['ann_and_ben_to_gil'] = sql(BASE6, pending(1, 1), pending(2, 2))
A['ann_to_gil_ben_to_hugh'] = sql(BASE6, HUGH, pending(1, 1), pending(2, 2, HUGH_P))
A['ann_to_gil_free_sender'] = sql(BASE6, ["UPDATE session_players SET is_free = true WHERE id = '%s'" % ANN6], pending(1, 1))
SCEN.update(A)

# ---------------------------------------------------------------- Approve
S6, T1, T2, T3 = S[6], TR(1), TR(2), TR(3)
case('approve_signed_out', approve(S6, T1, who=None), 'ann_to_gil')
case('approve_player_subject_is_not_a_club', approve(S6, T1, who=PLAYER_SUBJECT, **NOSUBJECT), 'ann_to_gil')
case('approve_body_not_json', req('POST', f'/api/sessions/{S6}/requests/transfers/{T1}/approve', rawBody='nope'), 'ann_to_gil')
case('approve_a_part_paid_slot_waives_the_rest', approve(S6, T1), 'ann_to_gil')
case('approve_a_fully_paid_slot_waives_nothing', approve(S6, T1), 'ben_paid_all_to_gil')
case('approve_an_unpaid_slot_waives_all_of_it', approve(S6, T1), 'cy_unpaid_to_gil')
case('approve_picks_the_transfer_by_its_id', approve(S6, T2), 'three_to_gil')
case('approve_with_the_recipient_already_saved', approve(S6, T1), 'ann_to_gil_saved')
case('approve_restores_a_removed_saved_player', approve(S6, T1), 'ann_to_gil_removed')
case('approve_a_waitlisted_recipient_leaves_the_waitlist', approve(S6, T1), 'ann_to_gil_waitlisted')
case('approve_a_waitlisted_recipient_who_is_first', approve(S6, T1), 'ann_to_gil_waitlisted_first')
case('approve_a_waitlisted_recipient_with_no_level_gets_the_chosen_level', approve(S6, T1), 'ann_to_gil_waitlisted_no_level')
case('approve_the_recipient_got_a_slot_meanwhile', approve(S6, T1), 'ann_to_gil_has_a_slot')
case('approve_the_recipient_has_a_released_entry_that_comes_back', approve(S6, T1), 'ann_to_gil_has_a_slot_released')
case('approve_closes_the_recipients_pending_join_request', approve(S6, T1), 'ann_to_gil_join_request')
case('approve_leaves_a_decided_join_request', approve(S6, T1), 'ann_to_gil_join_request_decided')
case('approve_leaves_another_players_join_request', approve(S6, T1), 'ann_to_gil_other_request')
case('approve_closes_the_senders_drop_out_notice', approve(S6, T1), 'ann_to_gil_drop_out_notice')
case('approve_recomputes_a_calculated_minimum', approve(S6, T1), 'ann_to_gil_calculated_minimum')
case('approve_keeps_a_fixed_minimum', approve(S6, T1), 'ann_to_gil_fixed_minimum')
case('approve_with_no_fee_set_records_no_amount_due', approve(S6, T1), 'ann_to_gil_no_estimate')
case('approve_on_a_break_even_fee', approve(S6, T1), 'ann_to_gil_break_even')
case('approve_with_a_free_player_in_the_amount_due', approve(S6, T1), 'ann_to_gil_waiver_earlier')
case('approve_a_free_sender_waives_the_whole_amount', approve(S6, T1), 'ann_to_gil_free_sender')
case('approve_with_a_full_roster', approve(S6, T1), 'ann_to_gil_full_roster')
case('approve_a_recipient_with_no_rtr_id_is_not_available', approve(S6, T1), 'ann_to_fay')
case('approve_an_unclaimed_profile_is_not_available', approve(S6, T1), 'ann_to_dee_unclaimed')
case('approve_a_claimed_link', approve(S6, T1), 'ann_to_gil_link_claimed')
case('approve_an_unclaimed_link_has_nobody_to_approve', approve(S6, T1), 'ann_link_unclaimed')
case('approve_the_sender_left', approve(S6, T1), 'ann_to_gil_sender_released')
case('approve_the_sender_is_a_no_show', approve(S6, T1), 'ann_to_gil_sender_no_show')
case('approve_a_rejected_transfer_is_refused', approve(S6, T1), 'ann_to_gil_rejected')
case('approve_an_expired_transfer_is_refused', approve(S6, T1), 'ann_to_gil_expired')
case('approve_a_cancelled_transfer_is_refused', approve(S6, T1), 'ann_to_gil_cancelled')
case('approve_a_withdrawn_transfer_is_refused', approve(S6, T1), 'ann_to_gil_withdrawn')
case('approve_an_approved_transfer_is_refused', approve(S6, T1), 'ann_to_gil_approved')
case('approve_after_the_session_started_is_refused', approve(S6, T1), 'ann_to_gil_started')
case('approve_on_a_live_session_is_refused', approve(S[3], T1), 'ann_to_gil_live_night')
case('approve_a_transfer_of_another_session_is_not_found', approve(S6, T1), 'ann_to_gil_other_session')
case('approve_a_slot_that_came_by_transfer_carries_its_cash_on', approve(S6, T2), 'gil_took_ann_then_hands_on')
case('approve_unknown_transfer', approve(S6, TR(9)), 'ann_to_gil')
case('approve_transfer_id_not_a_uuid', approve(S6, 'nope'), 'ann_to_gil')
case('approve_the_session_is_looked_up_before_the_transfer_id', approve(UNKNOWN, 'nope'), 'ann_to_gil')
case('approve_transfer_with_an_upper_case_id', approve(S6, T1.upper()), 'ann_to_gil')
case('approve_unknown_session', approve(UNKNOWN, T1), 'ann_to_gil')
case('approve_session_id_not_a_uuid', approve('nope', T1), 'ann_to_gil', **MALFORMED)
case('approve_another_clubs_session', approve(S[9], T1), 'ann_to_gil')
case('approve_the_lapsed_club_is_refused', approve(S[7], T1, who=LAPSED), 'ann_to_gil')

# the level is the first thing checked
case('approve_level_missing', approve(S6, T1, {}), 'ann_to_gil')
case('approve_level_not_a_level', approve(S6, T1, {'level': 'expert'}), 'ann_to_gil')
case('approve_level_a_number', approve(S6, T1, {'level': 3}), 'ann_to_gil')
case('approve_level_null', approve(S6, T1, {'level': None}), 'ann_to_gil')
case('approve_level_is_checked_before_the_session', approve(UNKNOWN, 'nope', {}), 'ann_to_gil')
case('approve_level_is_checked_before_the_waiver', approve(S6, T1, {'level': 'x', 'expectedWaiverMinor': -1}), 'ann_to_gil')
for lv in ('beginner_low', 'beginner_high', 'intermediate_high', 'advanced_high'):
    case(f'approve_at_level_{lv}', approve(S6, T1, {'level': lv}), 'ann_to_gil_waitlisted')

# the waiver the Queue Master was shown (#1013)
case('approve_the_waiver_matches', approve_with(S6, T1, expectedWaiverMinor=40000), 'ann_to_gil')
case('approve_the_waiver_changed', approve_with(S6, T1, expectedWaiverMinor=39999), 'ann_to_gil')
case('approve_the_waiver_changed_to_more', approve_with(S6, T1, expectedWaiverMinor=40001), 'ann_to_gil')
case('approve_the_waiver_zero_matches_a_full_payer', approve_with(S6, T1, expectedWaiverMinor=0), 'ben_paid_all_to_gil')
case('approve_the_waiver_zero_against_a_waiver', approve_with(S6, T1, expectedWaiverMinor=0), 'ann_to_gil')
case('approve_the_waiver_null_skips_the_check', approve_with(S6, T1, expectedWaiverMinor=None), 'ann_to_gil')
case('approve_the_waiver_missing_skips_the_check', approve(S6, T1), 'ann_to_gil')
case('approve_the_waiver_negative', approve_with(S6, T1, expectedWaiverMinor=-1), 'ann_to_gil')
case('approve_the_waiver_a_fraction', approve_with(S6, T1, expectedWaiverMinor=400.5), 'ann_to_gil')
case('approve_the_waiver_text', approve_with(S6, T1, expectedWaiverMinor='40000'), 'ann_to_gil')
case('approve_the_waiver_a_boolean', approve_with(S6, T1, expectedWaiverMinor=True), 'ann_to_gil')
case('approve_the_waiver_a_list', approve_with(S6, T1, expectedWaiverMinor=[40000]), 'ann_to_gil')
case('approve_the_waiver_beyond_a_safe_integer', approve_with(S6, T1, expectedWaiverMinor=9007199254740993), 'ann_to_gil')
case('approve_the_waiver_is_checked_before_the_session', approve_with(UNKNOWN, 'nope', expectedWaiverMinor=-1), 'ann_to_gil')
case('approve_the_waiver_with_no_fee_set', approve_with(S6, T1, expectedWaiverMinor=0), 'ann_to_gil_no_estimate')
case('approve_the_waiver_with_no_fee_set_nonzero', approve_with(S6, T1, expectedWaiverMinor=40000), 'ann_to_gil_no_estimate')
case('approve_the_waiver_of_a_carried_slot', approve_with(S6, T2, expectedWaiverMinor=0), 'gil_took_ann_then_hands_on')
case('approve_the_waiver_of_a_carried_slot_changed', approve_with(S6, T2, expectedWaiverMinor=20000), 'gil_took_ann_then_hands_on')

# sequences and races
case('approve_twice_is_refused_the_second_time', [approve(S6, T1), approve(S6, T1)], 'ann_to_gil')
case('approve_then_reject_is_refused', [approve(S6, T1), reject(S6, T1)], 'ann_to_gil')
case('reject_then_approve_is_refused', [reject(S6, T1), approve(S6, T1)], 'ann_to_gil')
case('approve_two_transfers_to_one_recipient_refuses_the_second', [approve(S6, T1), approve(S6, T2)], 'ann_and_ben_to_gil')
case('approve_two_transfers_to_two_recipients', [approve(S6, T1), approve(S6, T2)], 'ann_to_gil_ben_to_hugh')
case('approve_two_at_once', {'parallel': [approve(S6, T1), approve(S6, T1)]}, 'ann_to_gil')

# ---------------------------------------------------------------- write the file
def spec(name):
    return next(x for x in PREP['snapshot'] if x['name'] == name)


def pub(name):
    return next(x for x in json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/pubjoin.cases.json')))['snapshot'] if x['name'] == name)


SNAPSHOT = TRANSFERS['snapshot'] + [pub('session_join_requests'), pub('club_players')]
doc = {'now': PREP['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}


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
# the scenarios of this group only
used = {c['scenario'] for c in cases}
assert used <= set(SCEN), used - set(SCEN)
doc['scenarios'] = {k: v for k, v in SCEN.items() if k in used or k == 'base'}
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
