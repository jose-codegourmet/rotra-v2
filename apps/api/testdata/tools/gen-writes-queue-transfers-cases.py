#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/transfers.cases.json: the Queue app's plays-free and slot transfer money writes (task 2.12):
POST payments/free (D-2026-11-27-01), POST payments/refunds (#1014), POST requests/transfers/{id}/reject and /refund (#1011, #1014), the
payment writes on a slot that came by transfer or was refunded (#1013, #1014), and Start and Cancel session closing the pending transfers.

Run it, then the capture with the server zone fixed, as the servers run:
  TZ=UTC ROTRA_CAPTURE_DB_URL=... node .../vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs \\
    apps/api/testdata/tools/capture-writes-queue.test.mjs -t transfers
Usage: python3 apps/api/testdata/tools/gen-writes-queue-transfers-cases.py

Session 6 (Noon Break, Smash, prepared, 4 players per court on 1 court) is the transfer night: Ann (a registered player) has paid part, Ben all, Cy
nothing, Hal is a guest; the waitlist is Kai (no level), Una (level 2), Lee (level 3). Session 3 (live, three players) is the free-player night.
What is generated and cannot match is named, never hidden by shape: the database's own now() (a column default). Every other time is the fixed
clock of the case.
"""
import hashlib
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/transfers.cases.json')
PREP = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/prep.cases.json')))
FINISH = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/finish.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
CLUB1, CLUB3 = 'c9000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000003'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
PL = lambda n: f'd4000000-0000-4000-8000-0000000000{n:02d}'
TR = lambda n: f'a3d00000-0000-4000-8000-0000000000{n:02d}'
OP = lambda n: f'b0000000-0000-4000-8000-{n:012d}'
UNKNOWN = 'a3000000-0000-4000-8000-0000000000ff'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
T0 = "TIMESTAMPTZ '2026-11-01 00:00:00+00'"
HAL3, IVY3, JO3 = SP(4), SP(5), SP(6)  # their entries in S3
HAL, IVY, JO, ANN, BEN, CY, UNA, KAI, LEE = CP(7), CP(8), CP(9), CP(3), CP(4), CP(10), CP(5), CP(11), CP(12)
ANN6, BEN6, CY6, HAL6, GIL6 = SP(41), SP(42), SP(43), SP(44), SP(45)  # their entries in S6


def derived_id(command, part):
    """derivedId in session-store.ts: the first 16 bytes of SHA-256 of "<command>:<part>", version 8, RFC variant."""
    b = bytearray(hashlib.sha256(f'{command}:{part}'.encode()).digest()[:16])
    b[6] = (b[6] & 0x0F) | 0x80
    b[8] = (b[8] & 0x3F) | 0x80
    h = b.hex()
    return f'{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}'


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    c = {'name': name, 'scenario': scenario, 'steps': steps}
    c.update(kw)
    cases.append(c)


CRASH = {'allow500': True}
MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}

# ---------------------------------------------------------------- scenarios
def estimate(session, court, entrance, mode, custom):
    return ["INSERT INTO session_cost_estimates (session_id, club_id, court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode, custom_fee_per_head_minor, "
            f"currency, created_at, updated_at, revision) VALUES ('{session}', '{CLUB1}', {court}, {entrance}, '{mode}', {custom}, 'PHP', {T0}, {T0}, 1)"]


def mark(session, entry, amount, op, at="TIMESTAMPTZ '2026-11-19 01:00:00+00'"):
    return ["INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id, device_id) VALUES "
            f"('{session}', '{entry}', '{CLUB1}', {amount}, 'PHP', {at}, '{OP(op)}', '{CLUB1}', NULL)"]


def entry(n, session, club_player, name, level, player=None, minute=0, released=False):
    rel = "TIMESTAMPTZ '2026-11-19 03:00:00+00', 'transferred'" if released else "NULL, NULL"
    who = "'%s'" % player if player else 'NULL'
    at = "TIMESTAMPTZ '2026-11-18 0%d:%02d:00+00'" % (minute // 60, minute % 60)
    return ["INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, "
            "released_at, release_reason, created_at, updated_at, revision) VALUES "
            f"('{SP(n)}', '{CLUB1}', '{session}', '{club_player}', {who}, '{name}', false, {NOW}, {level}, {at}, {at}, {rel}, {NOW}, {NOW}, 1)"]


def waiter(n, club_player, level, day):
    return ["INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, created_at, updated_at, revision) VALUES "
            f"('a3300000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S[6]}', '{club_player}', {level}, TIMESTAMPTZ '2026-11-1{day} 00:00:00+00', {NOW}, {NOW}, 1)"]


def transfer(n, session, sender, sender_cp, sender_player, recipient, status='pending', requested='2026-11-19 01:30:00+00', decided=None, link=False,
             approved=None):
    cols = "id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, link_token_digest, claimed_at, status, requested_at, decided_at"
    digest = "decode('%s', 'hex')" % ('0b' * 32) if link else 'NULL'
    claimed = "TIMESTAMPTZ '2026-11-19 01:40:00+00'" if link and recipient else 'NULL'
    who = "'%s'" % recipient if recipient else 'NULL'
    when = "TIMESTAMPTZ '%s'" % decided if decided else 'NULL'
    vals = f"'{TR(n)}', '{CLUB1}', '{session}', '{sender}', '{sender_cp}', '{sender_player}', {who}, {digest}, {claimed}, '{status}', TIMESTAMPTZ '{requested}', {when}"
    if approved:
        entry_id, cp, due, paid, prior, waived = approved
        cols += ", recipient_club_player_id, recipient_session_player_id, recipient_was_waitlisted, amount_due_minor, amount_paid_minor, prior_waived_minor, waived_minor, currency"
        vals += f", '{cp}', '{entry_id}', false, {due}, {paid}, {prior}, {waived}, 'PHP'"
    return [f"INSERT INTO session_slot_transfers ({cols}) VALUES ({vals})"]


def sql(*parts):
    out = []
    for p in parts:
        out += p
    return out


INV = ["INSERT INTO inventory_items (id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, created_at, updated_at, revision) VALUES "
       f"('b1000000-0000-4000-8000-000000000001', '{CLUB1}', 'Yonex AS-50', 'shuttlecocks', 'tube', 12, 145000, 'PHP', NULL, {T0}, {T0}, 1)"]
SCEN = {'base': []}

# S3 (live, Hal, Ivy and Jo): a custom ₱900 a head, or the break-even of two courts and four hours
EST_S3_CUSTOM = estimate(S[3], 35000, 6000, 'custom', 90000)
EST_S3_EVEN = estimate(S[3], 35000, 6000, 'break_even', 'NULL')
SCEN['s3_even'] = sql(EST_S3_EVEN)
SCEN['s3_custom'] = sql(EST_S3_CUSTOM)
SCEN['s3_even_hal_paid'] = sql(EST_S3_EVEN, mark(S[3], HAL3, 120000, 901))
SCEN['s3_even_hal_jo_paid'] = sql(EST_S3_EVEN, mark(S[3], HAL3, 120000, 901), mark(S[3], JO3, 50000, 902))
SCEN['s3_even_hal_free'] = sql(EST_S3_EVEN, ["UPDATE session_players SET is_free = true WHERE id = '%s'" % HAL3])
SCEN['s3_even_jo_free'] = sql(EST_S3_EVEN, ["UPDATE session_players SET is_free = true WHERE id = '%s'" % JO3])
SCEN['s3_even_hal_free_paid'] = sql(EST_S3_EVEN, ["UPDATE session_players SET is_free = true WHERE id = '%s'" % HAL3], mark(S[3], HAL3, 120000, 901))
SCEN['s3_no_fee'] = []
SCEN['s3_no_fee_hal_free'] = ["UPDATE session_players SET is_free = true WHERE id = '%s'" % HAL3]
SCEN['s3_even_all_free'] = sql(EST_S3_EVEN, ["UPDATE session_players SET is_free = true WHERE session_id = '%s'" % S[3]])
SCEN['s3_even_hal_released'] = sql(EST_S3_EVEN, ["UPDATE session_players SET released_at = %s, release_reason = 'removed', level_locked_at = NULL WHERE id = '%s'" % (NOW, HAL3)])
SCEN['s3_even_hal_no_show'] = sql(EST_S3_EVEN, ["UPDATE session_players SET no_show_at = %s WHERE id = '%s'" % (NOW, HAL3)])
SCEN['s3_even_hal_free_released'] = sql(["UPDATE session_players SET is_free = true, released_at = %s, release_reason = 'removed', level_locked_at = NULL WHERE id = '%s'" % (NOW, HAL3)])
for state, extra in (('cancelled', f", started_at = NULL, cancelled_at = {NOW}, cancel_reason = 'Rain'"), ('invalid', ", invalid_reason = 'Wrong night'"), ('finalizing', ''), ('completed', f", finalized_at = {NOW}")):
    SCEN[f's3_even_{state}'] = sql(EST_S3_EVEN, mark(S[3], HAL3, 120000, 901), [f"UPDATE queue_sessions SET state = '{state}'{extra} WHERE id = '{S[3]}'"])
SCEN['s3_even_cancelled_marks'] = sql(EST_S3_EVEN, mark(S[3], HAL3, 120000, 901), mark(S[3], JO3, 50000, 902),
                                    [f"UPDATE queue_sessions SET state = 'cancelled', started_at = NULL, cancelled_at = {NOW}, cancel_reason = 'Rain' WHERE id = '{S[3]}'"])
SCEN['s3_custom_cancelled_legacy_mark'] = sql(EST_S3_CUSTOM, ["INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id, device_id) VALUES "
                                                           f"('{S[3]}', '{HAL3}', '{CLUB1}', NULL, 'PHP', TIMESTAMPTZ '2026-11-19 01:00:00+00', '{OP(903)}', '{CLUB1}', NULL)"],
                                            [f"UPDATE queue_sessions SET state = 'cancelled', started_at = NULL, cancelled_at = {NOW}, cancel_reason = 'Rain' WHERE id = '{S[3]}'"])
SCEN['s3_even_cancelled_released'] = sql(SCEN['s3_even_cancelled_marks'], ["UPDATE session_players SET released_at = %s, release_reason = 'removed', level_locked_at = NULL WHERE id = '%s'" % (NOW, HAL3)])
SCEN['s3_even_cancelled_no_show'] = sql(SCEN['s3_even_cancelled_marks'], ["UPDATE session_players SET no_show_at = %s WHERE id = '%s'" % (NOW, HAL3)])
SCEN['s3_even_cancelled_refunded'] = sql(SCEN['s3_even_cancelled_marks'], [
    "INSERT INTO session_payment_refunds (id, club_id, session_id, session_player_id, reason, amount_minor, refunded_at) VALUES "
    f"('a3e00000-0000-4000-8000-000000000001', '{CLUB1}', '{S[3]}', '{HAL3}', 'session_cancelled', 120000, TIMESTAMPTZ '2026-11-19 03:00:00+00')"])
# a slot that came by transfer in a cancelled session: Hal's cash (₱500) is carried into a new entry that also paid ₱100 itself
SCEN['s3_even_cancelled_carried'] = sql(
    EST_S3_EVEN, mark(S[3], HAL3, 50000, 901), entry(46, S[3], CP(12), 'Lee Guest', 3, minute=30), mark(S[3], SP(46), 10000, 904, "TIMESTAMPTZ '2026-11-19 01:30:00+00'"),
    ["UPDATE session_players SET released_at = %s, release_reason = 'transferred', level_locked_at = NULL WHERE id = '%s'" % (NOW, HAL3)],
    transfer(1, S[3], HAL3, HAL, PL(1), PL(6), status='approved', decided='2026-11-19 01:20:00+00', approved=(SP(46), CP(12), 90000, 50000, 0, 40000)),
    [f"UPDATE queue_sessions SET state = 'cancelled', started_at = NULL, cancelled_at = {NOW}, cancel_reason = 'Rain' WHERE id = '{S[3]}'"])

# S6: the transfer night. Capacity 4 (1 court, 4 players per court); Ann paid ₱500 of ₱900, Ben ₱900, Cy nothing; Hal is a guest
ROSTER6 = sql(entry(41, S[6], ANN, 'Ann Reyes', 3, PL(1), 0), entry(42, S[6], BEN, 'Ben Santos', 3, PL(2), 1), entry(43, S[6], CY, 'Cy Dela Cruz', 4, PL(3), 2),
              entry(44, S[6], HAL, 'Hal Guest', 3, None, 3))
WAIT6 = sql(waiter(11, KAI, 'NULL', 1), waiter(12, UNA, 2, 2), waiter(13, LEE, 3, 3))
EST6 = estimate(S[6], 'NULL', 'NULL', 'custom', 90000)
PAID6 = sql(mark(S[6], ANN6, 50000, 911), mark(S[6], BEN6, 90000, 912))
BASE6 = sql(EST6, ROSTER6, WAIT6, PAID6)
SCEN['t6'] = BASE6
SCEN['t6_pending'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)), transfer(2, S[6], BEN6, BEN, PL(2), PL(6)), transfer(3, S[6], CY6, CY, PL(3), PL(5)))
SCEN['t6_pending_one'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)))
SCEN['t6_pending_cy_unpaid'] = sql(BASE6, transfer(3, S[6], CY6, CY, PL(3), PL(5)))
SCEN['t6_pending_link_claimed'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5), link=True))
SCEN['t6_pending_link_unclaimed'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), None, link=True))
SCEN['t6_pending_no_estimate'] = sql(ROSTER6, WAIT6, PAID6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)))
SCEN['t6_pending_nobody_waits'] = sql(BASE6, ["DELETE FROM session_waitlist WHERE session_id = '%s'" % S[6]], transfer(1, S[6], ANN6, ANN, PL(1), PL(5)))
SCEN['t6_pending_only_unleveled_wait'] = sql(BASE6, ["DELETE FROM session_waitlist WHERE club_player_id <> '%s'" % KAI], transfer(1, S[6], ANN6, ANN, PL(1), PL(5)))
SCEN['t6_pending_full_roster'] = sql(BASE6, ["UPDATE queue_sessions SET players_per_court = 2 WHERE id = '%s'" % S[6]], transfer(1, S[6], ANN6, ANN, PL(1), PL(5)))
SCEN['t6_pending_fixed_minimum'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)), ["UPDATE queue_sessions SET minimum_is_calculated = false, minimum_games = 7 WHERE id = '%s'" % S[6]])
SCEN['t6_pending_drop_out_notice'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)), [
    "INSERT INTO session_drop_out_notices (id, club_id, session_id, session_player_id, player_id, created_at) VALUES "
    f"('a3800000-0000-4000-8000-000000000001', '{CLUB1}', '{S[6]}', '{ANN6}', '{PL(1)}', TIMESTAMPTZ '2026-11-19 01:45:00+00')"])
SCEN['t6_pending_sender_released'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)), ["UPDATE session_players SET released_at = %s, release_reason = 'removed' WHERE id = '%s'" % (NOW, ANN6)])
SCEN['t6_pending_sender_no_show'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)), ["UPDATE session_players SET no_show_at = %s WHERE id = '%s'" % (NOW, ANN6)])
SCEN['t6_decided'] = {st: sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5), status=st, decided='2026-11-19 02:30:00+00')) for st in ('rejected', 'expired', 'cancelled')}
for st, stm in SCEN['t6_decided'].items():
    SCEN[f't6_{st}'] = stm
del SCEN['t6_decided']
SCEN['t6_withdrawn'] = sql(BASE6, ["INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, status, requested_at, decided_at, withdrawn_by_player_id) VALUES "
                                   f"('{TR(1)}', '{CLUB1}', '{S[6]}', '{ANN6}', '{ANN}', '{PL(1)}', '{PL(5)}', 'withdrawn', TIMESTAMPTZ '2026-11-19 01:30:00+00', TIMESTAMPTZ '2026-11-19 02:30:00+00', '{PL(1)}')"])
SCEN['t6_other_session_transfer'] = sql(BASE6, entry(46, S[2], CP(12), 'Lee Guest', 3, PL(6), 5), transfer(1, S[2], SP(46), CP(12), PL(6), PL(5)))
SCEN['t6_pending_started'] = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5)),
                                 [f"UPDATE queue_sessions SET state = 'invalid', invalid_reason = 'Test night' WHERE id = '{S[3]}'", f"UPDATE queue_sessions SET state = 'active', started_at = {NOW} WHERE id = '{S[6]}'"])
SCEN['t6_pending_on_the_live_night'] = sql(EST_S3_EVEN, transfer(1, S[3], HAL3, HAL, PL(1), PL(6)))
# Gil took Ann's slot (₱500 carried, ₱400 waived) and paid ₱200 himself; he now asks to hand it on to Fay
APPROVED6 = sql(["INSERT INTO club_players (id, club_id, player_id, display_name, added_at, revision, updated_at) VALUES "
                 f"('{CP(40)}', '{CLUB1}', '{PL(6)}', 'Gil Gomez', {T0}, 1, {T0})"],
                entry(45, S[6], CP(40), 'Gil Gomez', 3, PL(6), 4),
                ["UPDATE session_players SET released_at = %s, release_reason = 'transferred' WHERE id = '%s'" % (NOW, ANN6)],
                transfer(1, S[6], ANN6, ANN, PL(1), PL(6), status='approved', decided='2026-11-19 01:05:00+00', approved=(GIL6, CP(40), 90000, 50000, 0, 40000)))
SCEN['t6_approved'] = sql(BASE6, APPROVED6)
SCEN['t6_approved_gil_paid'] = sql(BASE6, APPROVED6, mark(S[6], GIL6, 20000, 913, "TIMESTAMPTZ '2026-11-19 01:10:00+00'"))
SCEN['t6_chain'] = sql(SCEN['t6_approved_gil_paid'], transfer(2, S[6], GIL6, CP(40), PL(6), PL(5)))
# a refunded entry: Ann's transfer was rejected with her ₱500 refunded and her registration cancelled
REFUNDED6 = sql(BASE6, transfer(1, S[6], ANN6, ANN, PL(1), PL(5), status='rejected', decided='2026-11-19 01:20:00+00'),
                ["INSERT INTO session_payment_refunds (id, club_id, session_id, session_player_id, reason, slot_transfer_id, amount_minor, refunded_at) VALUES "
                 f"('a3e00000-0000-4000-8000-000000000002', '{CLUB1}', '{S[6]}', '{ANN6}', 'transfer_rejected', '{TR(1)}', 50000, TIMESTAMPTZ '2026-11-19 01:20:00+00')"])
SCEN['t6_refunded_released'] = sql(REFUNDED6, ["UPDATE session_players SET released_at = %s, release_reason = 'refunded' WHERE id = '%s'" % (NOW, ANN6)])
SCEN['t6_refunded_live'] = REFUNDED6  # the entry is still on the roster: the refund is what blocks its payment

for name, steps in list(SCEN.items()):
    assert isinstance(steps, list), name

# S1 (prepared, Hal) and S2 (prepared, full) for Start and Cancel closing transfers
S1_TODAY = PREP['scenarios']['s1_today']
RESERVED = FINISH['scenarios']['reserved']
ANN1 = SP(46)
S1_TRANSFER = sql(entry(46, S[1], ANN, 'Ann Reyes', 3, PL(1), 1), transfer(1, S[1], SP(46), ANN, PL(1), PL(5)))
SCEN['s1_today_pending_transfer'] = sql(S1_TODAY, S1_TRANSFER)
SCEN['s1_reserved_pending_transfer'] = sql(RESERVED, S1_TRANSFER)
SCEN['s1_reserved_pending_and_decided'] = sql(RESERVED, S1_TRANSFER, entry(47, S[1], BEN, 'Ben Santos', 3, PL(2), 2),
                                              transfer(2, S[1], SP(47), BEN, PL(2), PL(6), status='rejected', decided='2026-11-19 01:00:00+00'))

# ---------------------------------------------------------------- the routes
def free(session, op, player, value, who=SMASH, **kw):
    body = {}
    if op is not None:
        body['operationId'] = op
    if player is not None:
        body['clubPlayerId'] = player
    if value != '__omit__':
        body['free'] = value
    return req('POST', f'/api/sessions/{session}/payments/free', body, who=who, **kw)


def batch(session, op, marks, who=SMASH, **kw):
    return req('POST', f'/api/sessions/{session}/payments', {'operationId': op, 'marks': marks}, who=who, **kw)


def tick(player, paid=True):
    return {'clubPlayerId': player, 'paid': paid}


def amount(session, op, player, minor, who=SMASH, **kw):
    return req('POST', f'/api/sessions/{session}/payments/amount', {'operationId': op, 'clubPlayerId': player, 'amountMinor': minor}, who=who, **kw)


def mark_all(session, op, who=SMASH, **kw):
    return req('POST', f'/api/sessions/{session}/payments/mark-all', {'operationId': op}, who=who, **kw)


def refund(session, player, expected='__omit__', who=SMASH, **kw):
    body = {}
    if player != '__omit__':
        body['sessionPlayerId'] = player
    if expected != '__omit__':
        body['expectedAmountMinor'] = expected
    return req('POST', f'/api/sessions/{session}/payments/refunds', body, who=who, **kw)


def reject(session, transfer_id, who=SMASH, **kw):
    return req('POST', f'/api/sessions/{session}/requests/transfers/{transfer_id}/reject', who=who, **kw)


def refund_transfer(session, transfer_id, expected='__omit__', who=SMASH, raw=None, **kw):
    body = None if expected == '__omit__' else {'expectedRefundMinor': expected}
    if raw is not None:
        return req('POST', f'/api/sessions/{session}/requests/transfers/{transfer_id}/refund', rawBody=raw, who=who, **kw)
    return req('POST', f'/api/sessions/{session}/requests/transfers/{transfer_id}/refund', {} if body is None else body, who=who, **kw)


# ================================================================ plays free
case('free_signed_out', free(S[3], OP(1), HAL, True, who=None), 's3_even')
case('free_player_subject_is_not_a_club', free(S[3], OP(1), HAL, True, who=PLAYER_SUBJECT, **NOSUBJECT), 's3_even')
case('free_body_not_json', req('POST', f'/api/sessions/{S[3]}/payments/free', rawBody='nope'), 's3_even')
case('free_a_player', free(S[3], OP(1), HAL, True), 's3_even')
case('free_a_player_with_no_fee_set', free(S[3], OP(1), HAL, True), 's3_no_fee')
case('free_a_paid_player_deletes_the_mark', free(S[3], OP(1), HAL, True), 's3_even_hal_paid')
case('free_a_player_who_is_free_already_changes_nothing', free(S[3], OP(1), HAL, True), 's3_even_hal_free')
case('free_a_player_who_is_free_already_with_a_mark_keeps_the_mark', free(S[3], OP(1), HAL, True), 's3_even_hal_free_paid')
case('free_off_for_a_player_who_is_not_free_changes_nothing', free(S[3], OP(1), HAL, False), 's3_even')
case('free_off', free(S[3], OP(1), HAL, False), 's3_even_hal_free')
case('free_off_keeps_a_mark_that_is_there', free(S[3], OP(1), HAL, False), 's3_even_hal_free_paid')
case('free_then_off_again', [free(S[3], OP(1), HAL, True, snapshot=True), free(S[3], OP(2), HAL, False)], 's3_even')
case('free_twice_is_one_write', [free(S[3], OP(1), HAL, True, snapshot=True), free(S[3], OP(1), HAL, True)], 's3_even')
case('free_a_paid_player_twice_clears_once', [free(S[3], OP(1), HAL, True), free(S[3], OP(1), HAL, True)], 's3_even_hal_paid')
case('free_leaves_the_amount_due_for_the_next_tick_over_fewer_payers', [free(S[3], OP(1), JO, True), batch(S[3], OP(2), [tick(HAL)])], 's3_even')
case('free_a_custom_fee_stays_the_same_for_the_next_tick', [free(S[3], OP(1), JO, True), batch(S[3], OP(2), [tick(HAL)])], 's3_custom')
case('free_everyone_still_leaves_one_payer_for_the_next_tick', batch(S[3], OP(2), [tick(HAL)]), 's3_even_all_free')
case('tick_a_free_player_makes_them_a_payer_again', batch(S[3], OP(2), [tick(HAL)]), 's3_even_hal_free')
case('tick_down_a_free_player_changes_nothing', batch(S[3], OP(2), [tick(HAL, False)]), 's3_even_hal_free')
case('record_cash_for_a_free_player_makes_them_a_payer_again', amount(S[3], OP(2), HAL, 50000), 's3_even_hal_free')
case('record_zero_for_a_free_player_keeps_them_free', amount(S[3], OP(2), HAL, 0), 's3_even_hal_free')
case('record_cash_for_a_free_player_who_has_a_mark', amount(S[3], OP(2), HAL, 50000), 's3_even_hal_free_paid')
case('mark_all_skips_a_free_player', mark_all(S[3], OP(2)), 's3_even_jo_free')
case('mark_all_with_everyone_free_marks_nobody', mark_all(S[3], OP(2)), 's3_even_all_free')
case('free_then_mark_all', [free(S[3], OP(1), JO, True), mark_all(S[3], OP(2))], 's3_even')
case('free_a_paid_player_then_mark_all_leaves_them_unpaid', [free(S[3], OP(1), HAL, True), mark_all(S[3], OP(2))], 's3_even_hal_paid')
case('free_the_operation_is_checked_before_the_player', free(S[3], 'nope', 'nope', 'x'), 's3_even')
case('free_the_player_is_checked_before_the_value', free(S[3], OP(1), 'nope', 'x'), 's3_even')
case('free_operation_missing', free(S[3], None, HAL, True), 's3_even')
case('free_operation_not_a_uuid', free(S[3], 'nope', HAL, True), 's3_even')
case('free_the_operation_is_checked_before_the_session', free(UNKNOWN, 'nope', HAL, True), 's3_even')
case('free_player_missing', free(S[3], OP(1), None, True), 's3_even')
case('free_player_not_a_uuid', free(S[3], OP(1), 'nope', True), 's3_even')
case('free_the_player_is_checked_before_the_session', free(UNKNOWN, OP(1), 'nope', True), 's3_even')
case('free_value_missing', free(S[3], OP(1), HAL, '__omit__'), 's3_even')
case('free_value_text', free(S[3], OP(1), HAL, 'true'), 's3_even')
case('free_value_a_number', free(S[3], OP(1), HAL, 1), 's3_even')
case('free_value_null', free(S[3], OP(1), HAL, None), 's3_even')
case('free_value_checked_before_the_session', free(UNKNOWN, OP(1), HAL, 'true'), 's3_even')
case('free_unknown_session', free(UNKNOWN, OP(1), HAL, True), 's3_even')
case('free_session_id_not_a_uuid', free('nope', OP(1), HAL, True), 's3_even', **MALFORMED)
case('free_another_clubs_session', free(S[9], OP(1), CP(30), True), 's3_even')
case('free_a_player_who_is_not_in_the_session', free(S[3], OP(1), CP(11), True), 's3_even')
case('free_another_clubs_player', free(S[3], OP(1), CP(30), True), 's3_even')
case('free_a_player_with_an_upper_case_id', free(S[3], OP(1), HAL.upper(), True), 's3_even')
case('free_a_released_player_is_not_in_the_session', free(S[3], OP(1), HAL, True), 's3_even_hal_released')
case('free_a_no_show_is_not_in_the_session', free(S[3], OP(1), HAL, True), 's3_even_hal_no_show')
case('free_off_a_released_player_is_not_in_the_session_even_when_free', free(S[3], OP(1), HAL, False), 's3_even_hal_free_released')
case('free_in_a_cancelled_session', free(S[3], OP(1), HAL, True), 's3_even_cancelled')
case('free_in_an_invalid_session', free(S[3], OP(1), HAL, True), 's3_even_invalid')
case('free_in_a_finalizing_session', free(S[3], OP(1), HAL, True), 's3_even_finalizing')
case('free_in_a_completed_session', free(S[3], OP(1), HAL, True), 's3_even_completed')
case('free_in_a_prepared_session', free(S[1], OP(1), HAL, True))
case('free_in_a_prepared_session_with_a_guest_and_an_estimate', free(S[6], OP(1), HAL, True), 't6')
case('free_the_lapsed_club_live_session_keeps_working', free(S[8], OP(1), CP(20), True, who=LAPSED), 'base')
case('free_the_lapsed_club_prepared_session_is_refused', free(S[7], OP(1), CP(20), True, who=LAPSED), 'base')
case('free_two_at_once', {'parallel': [free(S[3], OP(1), HAL, True), free(S[3], OP(2), HAL, True)]}, 's3_even_hal_paid')
case('free_a_slot_paid_through_a_transfer_is_refused', free(S[6], OP(1), CP(40), True), 't6_approved_gil_paid')
case('free_a_slot_that_came_by_transfer_with_nothing_paid_is_refused', free(S[6], OP(1), CP(40), True), 't6_approved')
case('free_a_slot_that_was_handed_on_is_not_in_the_session', free(S[6], OP(1), ANN, True), 't6_approved')
case('free_a_refunded_player_is_not_in_the_session_when_released', free(S[6], OP(1), ANN, True), 't6_refunded_released')
case('free_a_refunded_player_who_is_still_on_the_roster_is_refused', free(S[6], OP(1), ANN, True), 't6_refunded_live')
case('free_off_a_player_with_a_transfer_slot_is_a_no_op', free(S[6], OP(1), CP(40), False), 't6_approved_gil_paid')
case('free_a_player_whose_transfer_is_only_pending_is_allowed', free(S[6], OP(1), ANN, True), 't6_pending_one')

# ================================================================ payments on slots with a history (#1013, #1014)
case('tick_a_slot_that_came_by_transfer_answers_paid_with_the_own_mark', batch(S[6], OP(1), [tick(CP(40))]), 't6_approved_gil_paid')
case('tick_a_slot_that_came_by_transfer_with_no_own_mark_answers_paid_without_an_amount', batch(S[6], OP(1), [tick(CP(40))]), 't6_approved')
case('untick_a_slot_that_came_by_transfer_is_refused', batch(S[6], OP(1), [tick(CP(40), False)]), 't6_approved_gil_paid')
case('untick_a_slot_that_came_by_transfer_with_no_own_mark_is_refused', batch(S[6], OP(1), [tick(CP(40), False)]), 't6_approved')
case('a_batch_with_a_locked_slot_rolls_back_the_rest', batch(S[6], OP(1), [tick(CY), tick(CP(40), False)]), 't6_approved_gil_paid')
case('tick_a_slot_in_a_batch_after_a_locked_tick_goes_on', batch(S[6], OP(1), [tick(CP(40)), tick(CY)]), 't6_approved_gil_paid')
case('amount_for_a_slot_that_came_by_transfer_is_refused', amount(S[6], OP(1), CP(40), 30000), 't6_approved_gil_paid')
case('amount_zero_for_a_slot_that_came_by_transfer_is_refused', amount(S[6], OP(1), CP(40), 0), 't6_approved_gil_paid')
case('amount_retry_of_the_own_mark_answers_it_before_the_lock', amount(S[6], OP(913), CP(40), 30000), 't6_approved_gil_paid')
case('amount_for_a_slot_with_a_pending_transfer_is_allowed', amount(S[6], OP(1), ANN, 90000), 't6_pending_one')
case('mark_all_skips_a_slot_that_came_by_transfer', mark_all(S[6], OP(2)), 't6_approved')
case('mark_all_skips_a_refunded_entry_on_the_roster', mark_all(S[6], OP(2)), 't6_refunded_live')
case('tick_a_refunded_entry_is_refused', batch(S[6], OP(1), [tick(ANN)]), 't6_refunded_live')
case('untick_a_refunded_entry_is_refused', batch(S[6], OP(1), [tick(ANN, False)]), 't6_refunded_live')
case('tick_a_refunded_entry_that_left_the_roster_is_refused_as_refunded', batch(S[6], OP(1), [tick(ANN)]), 't6_refunded_released')
case('amount_for_a_refunded_entry_is_refused', amount(S[6], OP(1), ANN, 90000), 't6_refunded_live')
case('amount_for_a_refunded_entry_that_left_is_not_in_the_session_first', amount(S[6], OP(1), ANN, 90000), 't6_refunded_released')
case('amount_retry_of_a_refunded_entrys_mark_answers_it_first', amount(S[6], OP(911), ANN, 90000), 't6_refunded_live')
case('tick_a_slot_with_a_transfer_the_sender_made_and_a_frozen_mark', batch(S[6], OP(1), [tick(ANN)]), 't6_approved')
case('tick_a_sender_whose_slot_was_handed_on_is_not_in_the_session', batch(S[6], OP(1), [tick(ANN, False)]), 't6_approved')

# ================================================================ Record refund (a cancelled session's list)
case('refund_signed_out', refund(S[3], HAL3, 120000, who=None), 's3_even_cancelled_marks')
case('refund_body_not_json', req('POST', f'/api/sessions/{S[3]}/payments/refunds', rawBody='nope'), 's3_even_cancelled_marks')
case('refund_a_player_who_paid_in_full', refund(S[3], HAL3, 120000), 's3_even_cancelled_marks')
case('refund_a_player_who_paid_part', refund(S[3], JO3, 50000), 's3_even_cancelled_marks')
case('refund_a_retry_answers_the_refund_already_recorded', [refund(S[3], HAL3, 120000), refund(S[3], HAL3, 120000, snapshot=True)], 's3_even_cancelled_marks')
case('refund_a_retry_with_another_amount_still_answers_the_recorded_one', [refund(S[3], HAL3, 120000), refund(S[3], HAL3, 1)], 's3_even_cancelled_marks')
case('refund_a_retry_of_a_refund_made_before', refund(S[3], HAL3, 120000), 's3_even_cancelled_refunded')
case('refund_two_players', [refund(S[3], HAL3, 120000), refund(S[3], JO3, 50000)], 's3_even_cancelled_marks')
case('refund_a_player_with_nothing_paid_is_refused', refund(S[3], IVY3, 0), 's3_even_cancelled_marks')
case('refund_nothing_paid_is_refused_before_the_amount_is_compared', refund(S[3], IVY3, 5), 's3_even_cancelled_marks')
case('refund_an_amount_that_no_longer_matches_is_refused', refund(S[3], HAL3, 100000), 's3_even_cancelled_marks')
case('refund_a_legacy_mark_with_no_amount_counts_as_paid_in_full', refund(S[3], HAL3, 90000), 's3_custom_cancelled_legacy_mark')
case('refund_a_slot_that_came_by_transfer_refunds_the_carried_cash_and_the_own_cash', refund(S[3], SP(46), 60000), 's3_even_cancelled_carried')
case('refund_a_slot_that_was_handed_on_is_not_in_the_session', refund(S[3], HAL3, 50000), 's3_even_cancelled_carried')
case('refund_a_released_entry_is_not_in_the_session', refund(S[3], HAL3, 120000), 's3_even_cancelled_released')
case('refund_a_no_show_is_not_in_the_session', refund(S[3], HAL3, 120000), 's3_even_cancelled_no_show')
case('refund_a_session_that_is_not_cancelled_is_refused', refund(S[3], HAL3, 120000), 's3_even_hal_paid')
case('refund_a_completed_session_is_refused', refund(S[3], HAL3, 120000), 's3_even_completed')
case('refund_the_state_is_checked_before_the_player', refund(S[3], UNKNOWN, 120000), 's3_even_hal_paid')
case('refund_the_amount_is_checked_before_the_session', refund(UNKNOWN, HAL3, 'x'), 's3_even_cancelled_marks')
case('refund_the_player_is_checked_before_the_amount', refund(S[3], 'nope', 'x'), 's3_even_cancelled_marks')
case('refund_player_missing', refund(S[3], '__omit__', 120000), 's3_even_cancelled_marks')
case('refund_player_not_text', refund(S[3], 7, 120000), 's3_even_cancelled_marks')
case('refund_player_not_a_uuid', refund(S[3], 'nope', 120000), 's3_even_cancelled_marks')
case('refund_unknown_player', refund(S[3], UNKNOWN, 120000), 's3_even_cancelled_marks')
case('refund_a_player_of_another_session', refund(S[3], SP(7), 120000), 's3_even_cancelled_marks')
case('refund_amount_missing', refund(S[3], HAL3), 's3_even_cancelled_marks')
case('refund_amount_null', refund(S[3], HAL3, None), 's3_even_cancelled_marks')
case('refund_amount_text', refund(S[3], HAL3, '120000'), 's3_even_cancelled_marks')
case('refund_amount_negative', refund(S[3], HAL3, -1), 's3_even_cancelled_marks')
case('refund_amount_a_fraction', refund(S[3], HAL3, 1.5), 's3_even_cancelled_marks')
case('refund_amount_beyond_the_safe_integers', refund(S[3], HAL3, 9007199254740992), 's3_even_cancelled_marks')
case('refund_unknown_session', refund(UNKNOWN, HAL3, 120000), 's3_even_cancelled_marks')
case('refund_session_id_not_a_uuid', refund('nope', HAL3, 120000), 's3_even_cancelled_marks', **MALFORMED)
case('refund_another_clubs_session', refund(S[9], HAL3, 120000), 's3_even_cancelled_marks')
case('refund_two_at_once', {'parallel': [refund(S[3], HAL3, 120000), refund(S[3], HAL3, 120000)]}, 's3_even_cancelled_marks')

# ================================================================ Reject (a slot transfer)
case('reject_signed_out', reject(S[6], TR(1), who=None), 't6_pending')
case('reject_a_transfer', reject(S[6], TR(1)), 't6_pending')
case('reject_a_transfer_with_nothing_paid', reject(S[6], TR(3)), 't6_pending')
case('reject_a_claimed_link_ends_the_link', reject(S[6], TR(1)), 't6_pending_link_claimed')
case('reject_an_unclaimed_link_is_not_in_requests', reject(S[6], TR(1)), 't6_pending_link_unclaimed')
case('reject_twice_is_refused_the_second_time', [reject(S[6], TR(1)), reject(S[6], TR(1))], 't6_pending')
case('reject_a_decided_transfer_is_refused', reject(S[6], TR(1)), 't6_rejected')
case('reject_an_expired_transfer_is_refused', reject(S[6], TR(1)), 't6_expired')
case('reject_a_cancelled_transfer_is_refused', reject(S[6], TR(1)), 't6_cancelled')
case('reject_a_withdrawn_transfer_is_refused', reject(S[6], TR(1)), 't6_withdrawn')
case('reject_an_approved_transfer_is_refused', reject(S[6], TR(1)), 't6_approved')
case('reject_after_the_session_started_is_refused', reject(S[6], TR(1)), 't6_pending_started')
case('reject_on_a_live_session_is_refused', reject(S[3], TR(1)), 't6_pending_on_the_live_night')
case('reject_a_transfer_whose_sender_left_still_closes_it', reject(S[6], TR(1)), 't6_pending_sender_released')
case('reject_a_transfer_of_another_session_is_not_found', reject(S[6], TR(1)), 't6_other_session_transfer')
case('reject_unknown_transfer', reject(S[6], TR(9)), 't6_pending')
case('reject_transfer_id_not_a_uuid', reject(S[6], 'nope'), 't6_pending')
case('reject_the_session_is_looked_up_before_the_transfer_id', reject(UNKNOWN, 'nope'), 't6_pending')
case('reject_transfer_with_an_upper_case_id', reject(S[6], TR(1).upper()), 't6_pending')
case('reject_unknown_session', reject(UNKNOWN, TR(1)), 't6_pending')
case('reject_session_id_not_a_uuid', reject('nope', TR(1)), 't6_pending', **MALFORMED)
case('reject_another_clubs_session', reject(S[9], TR(1)), 't6_pending')
case('reject_the_lapsed_club_is_refused', reject(S[7], TR(1), who=LAPSED), 't6_pending')
case('reject_two_at_once', {'parallel': [reject(S[6], TR(1)), reject(S[6], TR(1))]}, 't6_pending')
case('reject_two_transfers_one_after_the_other', [reject(S[6], TR(1)), reject(S[6], TR(2))], 't6_pending')
case('reject_with_a_calculated_minimum_recomputes_nothing_but_bumps_the_session', reject(S[6], TR(1)), 't6_pending')

# ================================================================ Reject and refund
case('refund_transfer_signed_out', refund_transfer(S[6], TR(1), 50000, who=None), 't6_pending')
case('refund_transfer_body_not_json', refund_transfer(S[6], TR(1), raw='nope'), 't6_pending')
case('refund_transfer_without_a_body', req('POST', f'/api/sessions/{S[6]}/requests/transfers/{TR(1)}/refund'), 't6_pending')
case('refund_transfer_gives_the_slot_to_the_first_waiter_with_a_level', refund_transfer(S[6], TR(1), 50000), 't6_pending')
case('refund_transfer_of_a_player_who_paid_in_full', refund_transfer(S[6], TR(2), 90000), 't6_pending')
case('refund_transfer_without_an_expected_amount_refunds_what_was_paid', refund_transfer(S[6], TR(1)), 't6_pending')
case('refund_transfer_with_a_null_expected_amount', req('POST', f'/api/sessions/{S[6]}/requests/transfers/{TR(1)}/refund', {'expectedRefundMinor': None}), 't6_pending')
case('refund_transfer_an_amount_that_no_longer_matches_is_refused', refund_transfer(S[6], TR(1), 40000), 't6_pending')
case('refund_transfer_nothing_paid_is_refused', refund_transfer(S[6], TR(3), 0), 't6_pending')
case('refund_transfer_nothing_paid_is_refused_before_the_amount_is_compared', refund_transfer(S[6], TR(3), 5), 't6_pending')
case('refund_transfer_nothing_paid_without_an_amount', refund_transfer(S[6], TR(3)), 't6_pending_cy_unpaid')
case('refund_transfer_amount_text', refund_transfer(S[6], TR(1), '50000'), 't6_pending')
case('refund_transfer_amount_negative', refund_transfer(S[6], TR(1), -1), 't6_pending')
case('refund_transfer_amount_a_fraction', refund_transfer(S[6], TR(1), 0.5), 't6_pending')
case('refund_transfer_amount_beyond_the_safe_integers', refund_transfer(S[6], TR(1), 9007199254740992), 't6_pending')
case('refund_transfer_the_amount_is_checked_before_the_session', refund_transfer(UNKNOWN, 'nope', 'x'), 't6_pending')
case('refund_transfer_a_slot_that_came_by_transfer_refunds_the_carried_and_the_own_cash', refund_transfer(S[6], TR(2), 70000), 't6_chain')
case('refund_transfer_the_carried_cash_alone', refund_transfer(S[6], TR(2), 50000), 't6_chain')
case('refund_transfer_when_no_one_waits_the_slot_stays_open', refund_transfer(S[6], TR(1), 50000), 't6_pending_nobody_waits')
case('refund_transfer_when_only_a_waiter_with_no_level_is_left_the_slot_stays_open', refund_transfer(S[6], TR(1), 50000), 't6_pending_only_unleveled_wait')
case('refund_transfer_when_the_roster_is_over_the_slots_nobody_is_promoted', refund_transfer(S[6], TR(1), 50000), 't6_pending_full_roster')
case('refund_transfer_with_a_fixed_minimum_keeps_it', refund_transfer(S[6], TR(1), 50000), 't6_pending_fixed_minimum')
case('refund_transfer_with_no_estimate_has_nothing_to_refund_but_an_own_mark_counts', refund_transfer(S[6], TR(1)), 't6_pending_no_estimate')
case('refund_transfer_closes_the_senders_open_drop_out_notice', refund_transfer(S[6], TR(1), 50000), 't6_pending_drop_out_notice')
case('refund_transfer_a_claimed_link', refund_transfer(S[6], TR(1), 50000), 't6_pending_link_claimed')
case('refund_transfer_an_unclaimed_link_is_not_in_requests', refund_transfer(S[6], TR(1), 50000), 't6_pending_link_unclaimed')
case('refund_transfer_the_sender_left_is_refused', refund_transfer(S[6], TR(1), 50000), 't6_pending_sender_released')
case('refund_transfer_the_sender_is_a_no_show_is_refused', refund_transfer(S[6], TR(1), 50000), 't6_pending_sender_no_show')
case('refund_transfer_twice_is_refused_the_second_time', [refund_transfer(S[6], TR(1), 50000), refund_transfer(S[6], TR(1), 50000)], 't6_pending')
case('refund_transfer_a_decided_transfer_is_refused', refund_transfer(S[6], TR(1), 50000), 't6_rejected')
case('refund_transfer_after_the_session_started_is_refused', refund_transfer(S[6], TR(1), 50000), 't6_pending_started')
case('refund_transfer_unknown_transfer', refund_transfer(S[6], TR(9), 50000), 't6_pending')
case('refund_transfer_id_not_a_uuid', refund_transfer(S[6], 'nope', 50000), 't6_pending')
case('refund_transfer_unknown_session', refund_transfer(UNKNOWN, TR(1), 50000), 't6_pending')
case('refund_transfer_another_clubs_session', refund_transfer(S[9], TR(1), 50000), 't6_pending')
case('refund_transfer_the_lapsed_club_is_refused', refund_transfer(S[7], TR(1), 50000, who=LAPSED), 't6_pending')
case('refund_transfer_two_at_once', {'parallel': [refund_transfer(S[6], TR(1), 50000), refund_transfer(S[6], TR(1), 50000)]}, 't6_pending')
case('refund_transfer_two_transfers_one_after_the_other', [refund_transfer(S[6], TR(1), 50000), refund_transfer(S[6], TR(2), 90000)], 't6_pending')
case('refund_transfer_then_a_tick_for_the_refunded_player_is_refused', [refund_transfer(S[6], TR(1), 50000), batch(S[6], OP(1), [tick(ANN)])], 't6_pending')

# ================================================================ Start and Cancel session close the pending transfers
case('start_expires_the_pending_transfers', req('POST', f'/api/sessions/{S[1]}/start', {'expectedRevision': '5'}), 's1_today_pending_transfer')
case('cancel_cancels_the_pending_transfers', req('POST', f'/api/sessions/{S[1]}/cancel', {'reason': 'Court flooded'}), 's1_reserved_pending_transfer')
case('cancel_leaves_the_decided_transfers_as_they_are', req('POST', f'/api/sessions/{S[1]}/cancel', {}), 's1_reserved_pending_and_decided')


# ================================================================ write the file
def spec(name):
    return next(x for x in PREP['snapshot'] if x['name'] == name)


SNAPSHOT = [
    spec('queue_sessions'), spec('session_players'), spec('club_assessments'), spec('session_waitlist'), spec('player_notifications'),
    {'name': 'session_players_free', 'sql': "SELECT id, is_free, updated_at FROM session_players ORDER BY id"},
    {'name': 'session_payment_marks', 'sql': "SELECT session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id, device_id "
     "FROM session_payment_marks ORDER BY session_id, session_player_id"},
    {'name': 'session_payment_refunds', 'sql': "SELECT id, club_id, session_id, session_player_id, reason::text AS reason, slot_transfer_id, amount_minor, currency, refunded_at, "
     "CASE WHEN created_at > TIMESTAMPTZ '2026-11-19 12:00:00+00' THEN 'database now()' ELSE created_at::text END AS created_at FROM session_payment_refunds ORDER BY id"},
    {'name': 'session_slot_transfers', 'sql': "SELECT id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, "
     "recipient_club_player_id, recipient_session_player_id, recipient_was_waitlisted, status::text AS status, requested_at, decided_at, amount_due_minor, amount_paid_minor, "
     "prior_waived_minor, waived_minor, currency, (link_token_digest IS NOT NULL) AS via_link, claimed_at FROM session_slot_transfers ORDER BY id"},
    {'name': 'session_drop_out_notices', 'sql': next(x for x in FINISH['snapshot'] if x['name'] == 'session_drop_out_notices')['sql']},
    {'name': 'player_notifications_count', 'sql': 'SELECT count(*)::text AS n FROM player_notifications'},
]
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
used = {c['scenario'] for c in cases}
assert used <= set(SCEN), used - set(SCEN)
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
