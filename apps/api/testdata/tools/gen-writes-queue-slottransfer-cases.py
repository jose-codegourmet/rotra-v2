#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/slottransfer.cases.json: the signed-in Player's seven slot-transfer routes, called from the Queue
session page (task 5.5, #1011 and #1012): POST /api/public-sessions/{slug}/slot-transfer/{,lookup,withdraw,link,link/read,link/claim,link/withdraw}.
The app is player.

Run it, then the capture (capture-writes-queue.test.mjs -t slottransfer), which writes slottransfer.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-slottransfer-cases.py

The scenarios and helpers are those of the transfers group (gen-writes-queue-transfers-cases.py): session 6 (Noon Break, slug noon-break, prepared) is the
transfer night. Ann (RTR 0001), Ben (0002) and Cy (0003) are confirmed; Hal is a guest; Gil (RTR 0006, an account, no saved player in the club) is the
usual recipient; Hugh (0007, an account) is added here; Dee (0004) has an unclaimed profile and Fay no RTR ID. A transfer link is created through the
route and its token saved for the next step; where a link must already be in a state, its row is seeded with the digest of a known token.
What is generated and cannot match: the link token (redacted in the answer; the database keeps only its digest, never read) and the database's own now().
"""
import hashlib
import json
import os

HERE = os.path.dirname(__file__)
SRC = open(os.path.join(HERE, 'gen-writes-queue-transfers-cases.py')).read()
exec(compile(SRC[:SRC.index('# ---------------------------------------------------------------- the routes')], 'transfers-scenarios', 'exec'))
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/slottransfer.cases.json')
TRANSFERS = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/transfers.cases.json')))
PUBJOIN = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/pubjoin.cases.json')))
cases.clear()

ORIGIN = 'http://localhost:9000'
ANNS, BENS, CYS, GILS, HUGHS = (f'f4000000-0000-4000-8000-0000000000{n:02d}' for n in (1, 2, 3, 6, 7))
GIL, GILP, HUGH_P = CP(41), PL(6), PL(7)
NEW = lambda n: f'a3d10000-0000-4000-8000-0000000000{n:02d}'
SLUG6 = 'noon-break'
TOK = 'A' * 43
TOK2 = 'B' * 43


def digest_of(token):
    return hashlib.sha256(token.encode()).hexdigest()


def ltransfer(n, sender, recipient, token=TOK, session=None, **kw):
    """A transfer link row of S6 (or another session) with the digest of a known token."""
    s = {1: (ANN6, ANN, PL(1)), 2: (BEN6, BEN, PL(2)), 3: (CY6, CY, PL(3))}[sender] if isinstance(sender, int) else sender
    stmts = transfer(n, session or S[6], s[0], s[1], s[2], recipient, link=True, **kw)
    return [x.replace("decode('%s', 'hex')" % ('0b' * 32), "decode('%s', 'hex')" % digest_of(token)) for x in stmts]


def rtr_transfer(n, sender, recipient=GILP, **kw):
    s = {1: (ANN6, ANN, PL(1)), 2: (BEN6, BEN, PL(2)), 3: (CY6, CY, PL(3))}[sender]
    return transfer(n, S[6], s[0], s[1], s[2], recipient, **kw)


HUGH = ["INSERT INTO players (id, full_name, nickname, profile_visibility, profile_state, hide_phone_from_clubs, revision, created_at, updated_at) VALUES "
        f"('{HUGH_P}', 'Hugh Reyes', 'Hu', 'public', 'claimed', false, 1, {T0}, {T0})",
        "INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at) VALUES "
        f"('{HUGH_P}', 'RTR-PH-CEB-102926-0007', '{CLUB1}', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 7, TIMESTAMPTZ '2026-10-29 01:00:00+00')",
        "INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, updated_at) VALUES "
        f"('{HUGH_P}', 'supabase', '{HUGHS}', {T0}, 1, NULL, NULL, {T0})"]
GIL_SAVED = ["INSERT INTO club_players (id, club_id, player_id, display_name, added_at, revision, created_at, updated_at) VALUES "
             f"('{GIL}', '{CLUB1}', '{GILP}', 'Gil Gomez', {T0}, 1, {T0}, {T0})"]
GIL_REMOVED = ["INSERT INTO club_players (id, club_id, player_id, display_name, added_at, removed_at, revision, created_at, updated_at) VALUES "
               f"('{GIL}', '{CLUB1}', '{GILP}', 'Gil Gomez', {T0}, TIMESTAMPTZ '2026-11-05 00:00:00+00', 1, {T0}, {T0})"]
HIDE = lambda p: ["UPDATE players SET hidden_from_directory = true WHERE id = '%s'" % p]
S6_STATE = lambda st, extra='': [f"UPDATE queue_sessions SET state = '{st}'{extra} WHERE id = '{S[6]}'"]
CANCELLED6 = S6_STATE('cancelled', f", cancelled_at = {NOW}, cancel_reason = 'Rain'")
STARTED6 = [f"UPDATE queue_sessions SET state = 'invalid', invalid_reason = 'Test night' WHERE id = '{S[3]}'"] + S6_STATE('active', f", started_at = {NOW}")

P = {}
P['p6'] = BASE6
P['p6_gil_waitlisted'] = sql(BASE6, GIL_SAVED, waiter(14, GIL, 4, 4))
P['p6_gil_waitlisted_first'] = sql(BASE6, GIL_SAVED, waiter(14, GIL, 4, 0))
P['p6_gil_hidden'] = sql(BASE6, HIDE(GILP))
P['p6_ann_hidden'] = sql(BASE6, HIDE(PL(1)))
P['p6_gil_on_the_roster'] = sql(BASE6, GIL_SAVED, entry(48, S[6], GIL, 'Gil Gomez', 3, GILP, 5))
P['p6_gil_released'] = sql(BASE6, GIL_SAVED, entry(48, S[6], GIL, 'Gil Gomez', 3, GILP, 5, released=True))
P['p6_hugh'] = sql(BASE6, HUGH)
P['p6_started'] = sql(BASE6, STARTED6)
P['p6_ann_released'] = sql(BASE6, ["UPDATE session_players SET released_at = %s, release_reason = 'removed' WHERE id = '%s'" % (NOW, ANN6)])
P['p6_ann_no_show'] = sql(BASE6, ["UPDATE session_players SET no_show_at = %s WHERE id = '%s'" % (NOW, ANN6)])
P['p6_pending_rtr'] = sql(BASE6, rtr_transfer(1, 1))
P['p6_pending_rtr_waitlisted'] = sql(BASE6, GIL_SAVED, waiter(14, GIL, 4, 4), rtr_transfer(1, 1))
P['p6_pending_rtr_by_ben'] = sql(BASE6, rtr_transfer(1, 2))
P['p6_pending_rtr_started'] = sql(BASE6, rtr_transfer(1, 1), STARTED6)
P['p6_decided'] = {st: sql(BASE6, rtr_transfer(1, 1, status=st, decided='2026-11-19 02:30:00+00')) for st in ('rejected', 'expired', 'cancelled')}
for st, stm in P['p6_decided'].items():
    P[f'p6_{st}'] = stm
del P['p6_decided']
P['p6_withdrawn'] = sql(BASE6, ["INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, status, requested_at, decided_at, withdrawn_by_player_id) VALUES "
                                f"('{TR(1)}', '{CLUB1}', '{S[6]}', '{ANN6}', '{ANN}', '{PL(1)}', '{GILP}', 'withdrawn', TIMESTAMPTZ '2026-11-19 01:30:00+00', TIMESTAMPTZ '2026-11-19 02:30:00+00', '{PL(1)}')"])
P['p6_approved'] = sql(BASE6, GIL_SAVED, entry(45, S[6], GIL, 'Gil Gomez', 3, GILP, 4),
                       ["UPDATE session_players SET released_at = %s, release_reason = 'transferred' WHERE id = '%s'" % (NOW, ANN6)],
                       transfer(1, S[6], ANN6, ANN, PL(1), GILP, status='approved', decided='2026-11-19 01:05:00+00', approved=(GIL6, GIL, 90000, 50000, 0, 40000)))
P['p6_link'] = sql(BASE6, ltransfer(1, 1, None))
P['p6_link_claimed_by_gil'] = sql(BASE6, ltransfer(1, 1, GILP))
P['p6_link_claimed_by_hugh'] = sql(BASE6, HUGH, ltransfer(1, 1, HUGH_P))
P['p6_link_claimed_by_gil_hugh'] = sql(BASE6, HUGH, ltransfer(1, 1, GILP))
P['p6_session_cancelled'] = sql(BASE6, CANCELLED6)
P['p6_link_gil_saved'] = sql(BASE6, GIL_SAVED, ltransfer(1, 1, None))
P['p6_link_gil_removed'] = sql(BASE6, GIL_REMOVED, ltransfer(1, 1, None))
P['p6_link_gil_on_the_roster'] = sql(BASE6, GIL_SAVED, entry(48, S[6], GIL, 'Gil Gomez', 3, GILP, 5), ltransfer(1, 1, None))
P['p6_link_gil_released'] = sql(BASE6, GIL_SAVED, entry(48, S[6], GIL, 'Gil Gomez', 3, GILP, 5, released=True), ltransfer(1, 1, None))
P['p6_link_gil_waitlisted'] = sql(BASE6, GIL_SAVED, waiter(14, GIL, 4, 4), ltransfer(1, 1, None))
P['p6_link_sender_released'] = sql(BASE6, ltransfer(1, 1, None), ["UPDATE session_players SET released_at = %s, release_reason = 'removed' WHERE id = '%s'" % (NOW, ANN6)])
P['p6_link_sender_no_show'] = sql(BASE6, ltransfer(1, 1, None), ["UPDATE session_players SET no_show_at = %s WHERE id = '%s'" % (NOW, ANN6)])
P['p6_link_started'] = sql(BASE6, ltransfer(1, 1, None), STARTED6)
P['p6_link_claimed_started'] = sql(BASE6, ltransfer(1, 1, GILP), STARTED6)
P['p6_link_cancelled_session'] = sql(BASE6, ltransfer(1, 1, None), CANCELLED6)
P['p6_link_other_session'] = sql(BASE6, entry(46, S[2], CP(12), 'Lee Guest', 3, PL(3), 5), ltransfer(1, (SP(46), CP(12), PL(3)), None, session=S[2]))
for st in ('rejected', 'expired', 'cancelled'):
    P[f'p6_link_{st}'] = sql(BASE6, ltransfer(1, 1, GILP, status=st, decided='2026-11-19 02:30:00+00'))
# a link its sender cancelled (nobody had claimed it)
P['p6_link_withdrawn'] = sql(BASE6, ltransfer(1, 1, None), ["UPDATE session_slot_transfers SET status = 'withdrawn', decided_at = TIMESTAMPTZ '2026-11-19 02:30:00+00', withdrawn_by_player_id = '%s' WHERE id = '%s'" % (PL(1), TR(1))])
P['p6_link_approved'] = sql(BASE6, GIL_SAVED, entry(45, S[6], GIL, 'Gil Gomez', 3, GILP, 4),
                            ["UPDATE session_players SET released_at = %s, release_reason = 'transferred' WHERE id = '%s'" % (NOW, ANN6)],
                            ltransfer(1, 1, GILP, status='approved', decided='2026-11-19 01:05:00+00', approved=(GIL6, GIL, 90000, 50000, 0, 40000)))
P['p6_link_ben_too'] = sql(BASE6, ltransfer(1, 1, None), ltransfer(2, 2, None, token=TOK2))
P['p6_pending_rtr_and_other_link'] = sql(BASE6, rtr_transfer(1, 2), ltransfer(2, 1, None))
SCEN.update(P)

# ---------------------------------------------------------------- the routes
def post(suffix, who=ANNS, body='__default__', headers=None, slug=SLUG6, **kw):
    s = {'method': 'POST', 'path': f'/api/public-sessions/{slug}/slot-transfer{suffix}', 'who': who, 'headers': {'Origin': ORIGIN} if headers is None else headers}
    if body != '__default__' and body is not None:
        s['body'] = body
    elif body == '__default__':
        s['body'] = {}
    s.update(kw)
    return s


def request(transfer_id=NEW(1), rtr='RTR-PH-CEB-102926-0006', who=ANNS, **kw):
    body = {}
    if transfer_id is not None:
        body['transferId'] = transfer_id
    if rtr is not None:
        body['rtrId'] = rtr
    return post('', who, body, **kw)


def lookup(rtr='RTR-PH-CEB-102926-0006', who=ANNS, **kw):
    return post('/lookup', who, {} if rtr is None else {'rtrId': rtr}, **kw)


def withdraw(who=ANNS, **kw):
    return post('/withdraw', who, **kw)


def make_link(transfer_id=NEW(2), who=ANNS, save=True, redact=None, **kw):
    redact = save if redact is None else redact
    body = {} if transfer_id is None else {'transferId': transfer_id}
    extra = {}
    if save:
        extra['save'] = {'token': 'token'}
    if redact:
        extra['redact'] = ['token']
    extra.update(kw)
    return post('/link', who, body, **extra)


def read(token=TOK, who=None, **kw):
    return post('/link/read', who, {} if token is None else {'token': token}, **kw)


def claim(token=TOK, who=GILS, **kw):
    return post('/link/claim', who, {} if token is None else {'token': token}, **kw)


def unclaim(token=TOK, who=GILS, **kw):
    return post('/link/withdraw', who, {} if token is None else {'token': token}, **kw)


NOPE = 'nope'
RTR = lambda n: f'RTR-PH-CEB-102926-{n:04d}'

# ---- the CORS and content-type guard and the pass, on every route
for name, mk in (('request', lambda **k: request(**k)), ('lookup', lambda **k: lookup(**k)), ('withdraw', lambda **k: withdraw(**k)), ('link', lambda **k: make_link(save=False, redact=False, **k)),
                 ('link_read', lambda **k: read(who=ANNS, **k)), ('link_claim', lambda **k: claim(**k)), ('link_withdraw', lambda **k: unclaim(**k))):
    base = mk()
    if name != 'link_read':
        case(f'{name}_signed_out', mk(who=None), 'p6')
    case(f'{name}_without_an_origin', mk(headers={}), 'p6')
    case(f'{name}_from_another_origin', mk(headers={'Origin': 'http://localhost:9999'}), 'p6')
    player = mk(headers={'Origin': 'http://localhost:9001', 'Content-Type': 'application/json'})
    if name == 'link':  # it succeeds: the token is random
        player['redact'] = ['token']
    case(f'{name}_from_the_player_origin', player, 'p6')
    case(f'{name}_not_json_is_forbidden', mk(headers={'Origin': ORIGIN, 'Content-Type': 'text/plain'}), 'p6')
    case(f'{name}_without_a_content_type_is_forbidden', mk(headers={'Origin': ORIGIN, 'Content-Type': ''}), 'p6')
    case(f'{name}_body_not_json', {**base, 'body': None, 'rawBody': 'nope'}, 'p6')
case('request_a_content_type_with_a_charset_is_fine', request(headers={'Origin': ORIGIN, 'Content-Type': 'application/json; charset=utf-8'}), 'p6')
case('link_read_signed_out_is_a_visitor', read(token=TOK, who=None), 'p6_link')

# ---- Find (lookup)
case('lookup_a_registered_player', lookup(), 'p6')
case('lookup_pads_and_ignores_case', lookup(' rtr-ph-ceb-102926-0006 '), 'p6')
case('lookup_a_waitlisted_player_reports_the_place', lookup(), 'p6_gil_waitlisted')
case('lookup_a_waitlisted_player_who_is_first', lookup(), 'p6_gil_waitlisted_first')
case('lookup_a_player_with_a_nickname', lookup(RTR(3), BENS), 'p6')
case('lookup_writes_nothing', lookup(), 'p6_pending_rtr')
case('lookup_the_rtr_id_is_missing', lookup(None), 'p6')
case('lookup_the_rtr_id_is_empty', lookup(''), 'p6')
case('lookup_the_rtr_id_is_a_number', lookup(5), 'p6')
case('lookup_the_rtr_id_is_not_the_shape', lookup('RTR-1'), 'p6')
case('lookup_the_rtr_id_has_a_short_number', lookup('RTR-PH-CEB-1029-0006'), 'p6')
case('lookup_the_rtr_id_is_a_phone_number', lookup('0917 555 0006'), 'p6')
case('lookup_the_rtr_id_has_a_line_break', lookup('RTR-PH\nCEB-102926-0006'), 'p6')
case('lookup_the_rtr_id_has_a_trailing_line_break_after_trim', lookup('RTR-PH-CEB-102926-0006\n'), 'p6')
case('lookup_no_player_has_that_rtr_id', lookup('RTR-PH-CEB-102926-9999'), 'p6')
case('lookup_an_unclaimed_profile_is_not_found', lookup(RTR(4)), 'p6')
case('lookup_a_hidden_player_is_not_found', lookup(), 'p6_gil_hidden')
case('lookup_your_own_hidden_profile_is_your_own_rtr_id', lookup(RTR(1)), 'p6_ann_hidden')
case('lookup_your_own_rtr_id', lookup(RTR(1)), 'p6')
case('lookup_a_player_who_has_a_slot', lookup(RTR(2)), 'p6')
case('lookup_a_player_whose_entry_was_released', lookup(), 'p6_gil_released')
case('lookup_a_player_with_a_slot_here', lookup(), 'p6_gil_on_the_roster')
case('lookup_you_are_not_confirmed', lookup(who=GILS), 'p6')
case('lookup_you_are_a_no_show', lookup(), 'p6_ann_no_show')
case('lookup_you_left', lookup(), 'p6_ann_released')
case('lookup_after_the_session_started', lookup(), 'p6_started')
case('lookup_a_cancelled_session', lookup(), 'p6_session_cancelled')
case('lookup_unknown_session', lookup(slug='nowhere'), 'p6')
case('lookup_the_state_is_checked_before_the_rtr_id', lookup('nope'), 'p6_started')
case('lookup_you_are_checked_before_the_rtr_id', lookup('nope', GILS), 'p6')
case('lookup_while_a_transfer_is_pending', lookup(), 'p6_pending_rtr')

# ---- Send transfer request
case('request_a_registered_player', request(), 'p6')
case('request_pads_and_ignores_case', request(rtr=' rtr-ph-ceb-102926-0006 '), 'p6')
case('request_a_waitlisted_player_keeps_the_place', request(), 'p6_gil_waitlisted')
case('request_by_a_player_who_paid_nothing', request(who=CYS), 'p6')
case('request_by_a_player_who_paid_it_all', request(who=BENS), 'p6')
case('request_to_a_player_with_a_nickname', request(rtr=RTR(1), who=BENS), 'p6')
case('request_the_rtr_id_is_missing', request(rtr=None), 'p6')
case('request_the_rtr_id_is_not_the_shape', request(rtr='nope'), 'p6')
case('request_no_player_has_that_rtr_id', request(rtr='RTR-PH-CEB-102926-9999'), 'p6')
case('request_an_unclaimed_profile_is_not_found', request(rtr=RTR(4)), 'p6')
case('request_a_hidden_player_is_not_found', request(), 'p6_gil_hidden')
case('request_your_own_hidden_profile_is_your_own_rtr_id', request(rtr=RTR(1)), 'p6_ann_hidden')
case('request_your_own_rtr_id', request(rtr=RTR(1)), 'p6')
case('request_a_player_who_has_a_slot', request(rtr=RTR(2)), 'p6')
case('request_a_player_whose_entry_was_released', request(), 'p6_gil_released')
case('request_you_are_not_confirmed', request(who=GILS), 'p6')
case('request_you_are_a_no_show', request(), 'p6_ann_no_show')
case('request_after_the_session_started', request(), 'p6_started')
case('request_a_cancelled_session', request(), 'p6_session_cancelled')
case('request_unknown_session', request(slug='nowhere'), 'p6')
case('request_the_transfer_id_is_missing', request(transfer_id=None), 'p6')
case('request_the_transfer_id_is_not_a_uuid', request(transfer_id='nope'), 'p6')
case('request_the_transfer_id_is_checked_before_the_session', request(transfer_id='nope', slug='nowhere'), 'p6')
case('request_the_transfer_id_is_checked_before_the_rtr_id', request(transfer_id='nope', rtr=None), 'p6')
case('request_the_transfer_id_with_upper_case_letters', request(transfer_id=NEW(1).upper()), 'p6')
case('request_the_session_is_found_before_the_state', request(slug='nowhere'), 'p6_started')
case('request_the_state_is_checked_before_the_rtr_id', request(rtr='nope'), 'p6_started')
case('request_again_with_the_same_id_returns_the_saved_request', [request(snapshot=True), request()], 'p6')
case('request_again_with_the_same_id_after_the_player_changed_the_rtr_id', [request(), request(rtr=RTR(3))], 'p6')
case('request_again_with_the_same_id_by_another_player_is_refused', [request(who=ANNS), request(who=BENS)], 'p6')
case('request_again_with_a_new_id_while_one_is_pending', [request(), request(NEW(3), RTR(3))], 'p6')
case('request_the_replay_is_answered_before_the_state_is_checked', request(TR(1)), 'p6_pending_rtr_started')
case('request_the_replay_of_a_decided_transfer', request(TR(1)), 'p6_rejected')
case('request_the_replay_of_an_approved_transfer', request(TR(1)), 'p6_approved')
case('request_the_replay_of_a_withdrawn_transfer', request(TR(1)), 'p6_withdrawn')
case('request_the_replay_of_a_link_has_no_name', request(TR(1), rtr=None), 'p6_link')
case('request_the_replay_of_another_players_transfer_is_refused', request(TR(1), who=ANNS), 'p6_pending_rtr_by_ben')
case('request_while_one_is_pending', request(NEW(3)), 'p6_pending_rtr')
case('request_while_a_link_is_pending', request(NEW(3)), 'p6_link')
case('request_after_a_rejected_one', request(NEW(3)), 'p6_rejected')
case('request_after_a_withdrawn_one', request(NEW(3)), 'p6_withdrawn')
case('request_two_players_each_ask', [request(NEW(1), RTR(6), ANNS), request(NEW(2), RTR(6), BENS)], 'p6')
case('request_two_at_once_with_the_same_id', {'parallel': [request(), request()]}, 'p6')
case('request_after_withdraw', [request(), withdraw(), request(NEW(3), RTR(3), ANNS)], 'p6')

# ---- Withdraw request (and Cancel link)
case('withdraw_a_request', withdraw(), 'p6_pending_rtr')
case('withdraw_an_unclaimed_link_is_cancel_link', withdraw(), 'p6_link')
case('withdraw_a_claimed_link_is_withdraw_request', withdraw(), 'p6_link_claimed_by_gil')
case('withdraw_nothing_pending', withdraw(), 'p6')
case('withdraw_a_decided_transfer', withdraw(), 'p6_rejected')
case('withdraw_an_approved_transfer_the_sender_left', withdraw(), 'p6_approved')
case('withdraw_another_players_transfer_is_not_yours', withdraw(who=BENS), 'p6_pending_rtr')
case('withdraw_you_are_not_confirmed', withdraw(who=GILS), 'p6_pending_rtr')
case('withdraw_after_the_session_started', withdraw(), 'p6_pending_rtr_started')
case('withdraw_a_cancelled_session', withdraw(), 'p6_session_cancelled')
case('withdraw_unknown_session', withdraw(slug='nowhere'), 'p6_pending_rtr')
case('withdraw_twice', [withdraw(), withdraw()], 'p6_pending_rtr')
case('withdraw_two_at_once', {'parallel': [withdraw(), withdraw()]}, 'p6_pending_rtr')
case('withdraw_then_ask_again_with_a_link', [request(), withdraw(), make_link()], 'p6')
case('withdraw_leaves_the_other_players_transfer', withdraw(), 'p6_pending_rtr_and_other_link')
case('withdraw_a_pending_request_of_the_senders_own_slot_only', withdraw(who=BENS), 'p6_pending_rtr_and_other_link')

# ---- Create a transfer link
case('link_create', make_link(), 'p6')
case('link_create_for_a_player_who_paid_nothing', make_link(who=CYS), 'p6')
case('link_create_twice_is_refused_the_second_time', [make_link(NEW(2), snapshot=True), make_link(NEW(3), save=False)], 'p6')
case('link_create_again_with_the_same_id', [make_link(NEW(2)), make_link(NEW(2), save=False)], 'p6')
case('link_create_while_a_request_is_pending', make_link(NEW(3), save=False, redact=False), 'p6_pending_rtr')
case('link_create_while_a_link_is_pending', make_link(NEW(3), save=False, redact=False), 'p6_link')
case('link_create_after_a_rejected_one', make_link(NEW(3)), 'p6_rejected')
case('link_create_after_a_withdrawn_one', make_link(NEW(3)), 'p6_withdrawn')
case('link_create_reusing_the_id_of_a_closed_transfer', make_link(TR(1), save=False, redact=False), 'p6_rejected')
case('link_create_you_are_not_confirmed', make_link(who=GILS, save=False, redact=False), 'p6')
case('link_create_you_are_a_no_show', make_link(save=False, redact=False), 'p6_ann_no_show')
case('link_create_after_the_session_started', make_link(save=False, redact=False), 'p6_started')
case('link_create_a_cancelled_session', make_link(save=False, redact=False), 'p6_session_cancelled')
case('link_create_unknown_session', make_link(slug='nowhere', save=False, redact=False), 'p6')
case('link_create_the_transfer_id_is_missing', make_link(None, save=False, redact=False), 'p6')
case('link_create_the_transfer_id_is_not_a_uuid', make_link('nope', save=False, redact=False), 'p6')
case('link_create_the_transfer_id_is_checked_before_the_session', make_link('nope', slug='nowhere', save=False, redact=False), 'p6')
case('link_create_two_at_once_with_the_same_id', {'parallel': [make_link(NEW(2), save=False, redact=False), make_link(NEW(2), save=False, redact=False)], 'redact': ['token']}, 'p6')
case('link_create_then_cancel_then_create', [make_link(NEW(2), save=False, redact=True), withdraw(), make_link(NEW(3), save=False, redact=True)], 'p6')
case('link_create_then_read_it', [make_link(), read(token='{{token}}')], 'p6')
case('link_create_then_read_it_as_the_sender', [make_link(), read(token='{{token}}', who=ANNS)], 'p6')
case('link_create_then_read_it_signed_in', [make_link(), read(token='{{token}}', who=GILS)], 'p6')
case('link_create_then_claim_it', [make_link(), claim('{{token}}')], 'p6')
case('link_create_then_claim_then_withdraw_the_claim', [make_link(), claim('{{token}}'), unclaim('{{token}}'), read(token='{{token}}', who=GILS)], 'p6')
case('link_create_then_claim_it_twice_by_two_players', [make_link(), claim('{{token}}'), claim('{{token}}', who=BENS)], 'p6_hugh')
case('link_create_then_cancel_it_and_claim', [make_link(), withdraw(), claim('{{token}}')], 'p6')

# ---- the link card
case('read_an_open_link_as_a_visitor', read(), 'p6_link')
case('read_an_open_link_signed_in', read(who=GILS), 'p6_link')
case('read_an_open_link_as_a_player_who_has_a_slot', read(who=BENS), 'p6_link')
case('read_an_open_link_as_a_player_who_has_a_slot_here', read(who=GILS), 'p6_link_gil_on_the_roster')
case('read_an_open_link_as_a_player_whose_entry_was_released', read(who=GILS), 'p6_link_gil_released')
case('read_your_own_link', read(who=ANNS), 'p6_link')
case('read_a_claimed_link_as_a_visitor', read(), 'p6_link_claimed_by_gil')
case('read_a_claimed_link_as_the_claimant', read(who=GILS), 'p6_link_claimed_by_gil')
case('read_a_claimed_link_as_another_player', read(who=HUGHS), 'p6_link_claimed_by_gil_hugh')
case('read_a_claimed_link_as_the_sender', read(who=ANNS), 'p6_link_claimed_by_gil')
case('read_a_rejected_link', read(), 'p6_link_rejected')
case('read_a_rejected_link_as_the_claimant', read(who=GILS), 'p6_link_rejected')
case('read_a_withdrawn_link', read(), 'p6_link_withdrawn')
case('read_an_approved_link_as_the_claimant', read(who=GILS), 'p6_link_approved')
case('read_an_approved_link_as_a_visitor', read(), 'p6_link_approved')
case('read_an_expired_link', read(), 'p6_link_expired')
case('read_a_cancelled_link', read(), 'p6_link_cancelled')
case('read_a_pending_link_after_the_session_started', read(), 'p6_link_started')
case('read_a_claimed_link_after_the_session_started_as_the_claimant', read(who=GILS), 'p6_link_claimed_started')
case('read_a_pending_link_of_a_cancelled_session', read(), 'p6_link_cancelled_session')
case('read_a_link_of_another_session_is_closed', read(), 'p6_link_other_session')
case('read_an_unknown_token_is_closed', read(token=TOK2), 'p6_link')
case('read_a_short_token_is_closed', read(token='abc'), 'p6_link')
case('read_a_token_with_a_trailing_line_break_is_closed', read(token=TOK + '\n'), 'p6_link')
case('read_a_token_with_a_wrong_character_is_closed', read(token='A' * 42 + '+'), 'p6_link')
case('read_the_token_is_missing', read(token=None), 'p6_link')
case('read_the_token_is_a_number', post('/link/read', None, {'token': 5}), 'p6_link')
case('read_unknown_session_is_closed', read(slug='nowhere'), 'p6_link')
case('read_the_sender_name_is_masked', read(), 'p6_link_ben_too')
case('read_another_link_of_the_night', read(token=TOK2), 'p6_link_ben_too')
case('read_writes_nothing', read(who=GILS), 'p6_link')

# ---- Claim this slot
case('claim_a_link', claim(), 'p6_link')
case('claim_a_link_when_already_a_member', claim(), 'p6_link_gil_saved')
case('claim_a_link_brings_back_a_removed_member', claim(), 'p6_link_gil_removed')
case('claim_a_link_while_waitlisted', claim(), 'p6_link_gil_waitlisted')
case('claim_your_own_link', claim(who=ANNS), 'p6_link')
case('claim_when_you_already_have_a_slot', claim(who=BENS), 'p6_link')
case('claim_when_you_already_have_a_slot_here', claim(), 'p6_link_gil_on_the_roster')
case('claim_when_your_entry_was_released', claim(), 'p6_link_gil_released')
case('claim_a_link_someone_else_claimed', claim(who=HUGHS), 'p6_link_claimed_by_gil_hugh')
case('claim_a_link_you_claimed_yourself', claim(), 'p6_link_claimed_by_gil')
case('claim_a_rejected_link', claim(), 'p6_link_rejected')
case('claim_a_withdrawn_link', claim(), 'p6_link_withdrawn')
case('claim_an_approved_link', claim(), 'p6_link_approved')
case('claim_an_expired_link', claim(), 'p6_link_expired')
case('claim_a_cancelled_link', claim(), 'p6_link_cancelled')
case('claim_a_link_after_the_session_started', claim(), 'p6_link_started')
case('claim_a_link_of_a_cancelled_session', claim(), 'p6_link_cancelled_session')
case('claim_a_link_whose_sender_left', claim(), 'p6_link_sender_released')
case('claim_a_link_whose_sender_is_a_no_show', claim(), 'p6_link_sender_no_show')
case('claim_a_link_of_another_session_is_closed', claim(), 'p6_link_other_session')
case('claim_an_unknown_token', claim(TOK2), 'p6_link')
case('claim_a_short_token', claim('abc'), 'p6_link')
case('claim_the_token_is_missing', claim(None), 'p6_link')
case('claim_the_token_is_a_number', post('/link/claim', GILS, {'token': 5}), 'p6_link')
case('claim_unknown_session', claim(slug='nowhere'), 'p6_link')
case('claim_twice', [claim(), claim()], 'p6_link')
case('claim_then_another_player_claims', [claim(), claim(who=HUGHS)], 'p6_hugh_link')
case('claim_two_at_once_by_the_same_player', {'parallel': [claim(), claim()]}, 'p6_link')
case('claim_the_other_link_of_the_night', claim(token=TOK2), 'p6_link_ben_too')
case('claim_then_read_it', [claim(), read(who=GILS), read()], 'p6_link')

# ---- Withdraw claim
case('unclaim_a_claim', unclaim(), 'p6_link_claimed_by_gil')
case('unclaim_the_link_is_open', unclaim(), 'p6_link')
case('unclaim_the_claim_of_another_player', unclaim(who=HUGHS), 'p6_link_claimed_by_gil_hugh')
case('unclaim_as_the_sender', unclaim(who=ANNS), 'p6_link_claimed_by_gil')
case('unclaim_a_rejected_link', unclaim(), 'p6_link_rejected')
case('unclaim_a_withdrawn_link', unclaim(), 'p6_link_withdrawn')
case('unclaim_an_approved_link', unclaim(), 'p6_link_approved')
case('unclaim_after_the_session_started', unclaim(), 'p6_link_claimed_started')
case('unclaim_a_link_of_a_cancelled_session', unclaim(), 'p6_link_cancelled_session')
case('unclaim_a_link_of_another_session', unclaim(), 'p6_link_other_session')
case('unclaim_an_unknown_token', unclaim(TOK2), 'p6_link_claimed_by_gil')
case('unclaim_a_short_token', unclaim('abc'), 'p6_link_claimed_by_gil')
case('unclaim_the_token_is_missing', unclaim(None), 'p6_link_claimed_by_gil')
case('unclaim_unknown_session', unclaim(slug='nowhere'), 'p6_link_claimed_by_gil')
case('unclaim_twice', [unclaim(), unclaim()], 'p6_link_claimed_by_gil')
case('unclaim_then_claim_again', [unclaim(), claim()], 'p6_link_claimed_by_gil')
case('unclaim_then_the_sender_makes_a_new_link', [unclaim(), make_link(NEW(3), save=False, redact=True)], 'p6_link_claimed_by_gil')
case('unclaim_keeps_the_membership_the_claim_made', [claim(), unclaim()], 'p6_link')
case('claim_then_unclaim_then_another_claims', [claim(), unclaim(), claim(who=HUGHS)], 'p6_hugh_link')

P['p6_hugh_link'] = sql(BASE6, HUGH, ltransfer(1, 1, None))
SCEN['p6_hugh_link'] = P['p6_hugh_link']

# ---------------------------------------------------------------- write the file
def pub(name):
    return next(x for x in PUBJOIN['snapshot'] if x['name'] == name)


SNAPSHOT = TRANSFERS['snapshot'] + [pub('session_join_requests'), pub('club_players')]
doc = {'now': PREP['now'], 'app': 'player', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}


def tidy(step_):
    for k in [k for k, v in step_.items() if v is None and k != 'who']:
        del step_[k]
    for p in step_.get('parallel', []):
        tidy(p)
    return step_


for c in cases:
    for s in c['steps']:
        tidy(s)
# a claim saves the claimant to the club under a random id (randomUUID), the one value of these rows that is generated
for c in cases:
    def claims(st):
        return st.get('path', '').endswith('/link/claim') or any(claims(p) for p in st.get('parallel', []))
    if any(claims(st) for st in c['steps']):
        c['redact'] = {'club_players': ['id']}
names = [c['name'] for c in cases]
assert len(set(names)) == len(names), [n for n in names if names.count(n) > 1]
used = {c['scenario'] for c in cases}
assert used <= set(SCEN), used - set(SCEN)
doc['scenarios'] = {k: v for k, v in SCEN.items() if k in used or k == 'base'}
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
