#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/money.cases.json: the Queue app's money writes (slice 3.1): the club's inventory (add,
edit, stock step, remove), the payment switches (batch, amount received, Mark all paid) and the cost estimate that Create session and Edit
preparation save beside the session.

Run it, then the capture with the server zone fixed, as the servers run (the series dates of a created session read it):
  TZ=UTC ROTRA_CAPTURE_DB_URL=... node .../vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs \\
    apps/api/testdata/tools/capture-writes-queue.test.mjs -t money
Usage: python3 apps/api/testdata/tools/gen-writes-queue-money-cases.py

What is generated and cannot match is named, never hidden by shape: the ids of a shuttle plan line (a version 7 UUID Prisma makes; the
snapshot pins only that its version is 7) and the database's own now() (a column default or the stock step's updated_at; the snapshot says
"database now()" for any time after the cases' clock). Every other time is the fixed clock of the case.
"""
import hashlib
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/money.cases.json')
PREP = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/prep.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
CLUB1, CLUB2, CLUB3 = (f'c9000000-0000-4000-8000-00000000000{n}' for n in (1, 2, 3))
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
CT = lambda n: f'a2c00000-0000-4000-8000-0000000000{n:02d}'
IT = lambda n: f'b1000000-0000-4000-8000-0000000000{n:02d}'
OP = lambda n: f'b0000000-0000-4000-8000-{n:012d}'
V1 = 'a5000000-0000-4000-8000-000000000001'
HAL, IVY, JO, GUS, UNA, OLGA, REX, LARRY = CP(7), CP(8), CP(9), CP(1), CP(5), CP(30), CP(6), CP(20)
HAL3, IVY3, JO3 = SP(4), SP(5), SP(6)  # their entries in S3
UNKNOWN = 'a3000000-0000-4000-8000-0000000000ff'
UNKNOWN_ITEM = 'b1000000-0000-4000-8000-0000000000ff'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
T0 = "TIMESTAMPTZ '2026-11-01 00:00:00+00'"


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


# A 500 the TypeScript answers (Prisma refuses a value, or a TypeError) and Go answers too, as the plan's deviations log lists.
CRASH = {'allow500': True}
# An id of the path or body that no row can have: the TypeScript crashes in Prisma (500), Go answers not found.
MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'

# ---------------------------------------------------------------- scenarios
INV = [
    "INSERT INTO inventory_items (id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, created_at, updated_at, revision) VALUES "
    f"('{IT(1)}', '{CLUB1}', 'Yonex AS-50', 'shuttlecocks', 'tube', 12, 145000, 'PHP', NULL, {T0}, {T0}, 1), "
    f"('{IT(2)}', '{CLUB1}', 'Victor Gold', 'shuttlecocks', 'tube', 6, 115000, 'PHP', NULL, {T0}, {T0}, 3), "
    f"('{IT(3)}', '{CLUB1}', 'Net post', 'equipment', 'piece', 2, 8000, 'PHP', NULL, {T0}, {T0}, 1), "
    f"('{IT(4)}', '{CLUB1}', 'Old shuttles', 'shuttlecocks', 'tube', 3, 100000, 'PHP', TIMESTAMPTZ '2026-11-05 00:00:00+00', {T0}, TIMESTAMPTZ '2026-11-05 00:00:00+00', 2), "
    f"('{IT(5)}', '{CLUB3}', 'Olga Birds', 'shuttlecocks', 'tube', 5, 120000, 'PHP', NULL, {T0}, {T0}, 1), "
    f"('{IT(6)}', '{CLUB1}', 'Empty tube', 'other', 'piece', 0, 0, 'PHP', NULL, {T0}, {T0}, 1)",
]
SCEN = {'base': INV}


def estimate(session, court, entrance, mode, custom, lines, revision=1):
    sql = [
        "INSERT INTO session_cost_estimates (session_id, club_id, court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode, custom_fee_per_head_minor, "
        f"currency, created_at, updated_at, revision) VALUES ('{session}', '{CLUB1}', {court}, {entrance}, '{mode}', {custom}, 'PHP', {T0}, {T0}, {revision})"
    ]
    for pos, (item, tubes) in enumerate(lines):
        sql.append(
            "INSERT INTO session_shuttle_plan_lines (id, club_id, session_id, inventory_item_id, tubes, position) VALUES "
            f"('b3000000-0000-4000-8000-{int(session[-2:]):04d}0000{pos:04d}', '{CLUB1}', '{session}', '{item}', {tubes}, {pos})"
        )
    return sql


def mark(session, entry, amount, op, at="TIMESTAMPTZ '2026-11-19 03:00:00+00'"):
    return [
        "INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id, device_id) VALUES "
        f"('{session}', '{entry}', '{CLUB1}', {amount}, 'PHP', {at}, '{op}', '{CLUB1}', NULL)"
    ]


# S3 (live, 3 players, 2 courts, 4 hours): custom 900 a head, or break-even. S1 (prepared, 1 player, 1 court, 4 hours): break-even court fee.
EST_CUSTOM = estimate(S[3], 35000, 6000, 'custom', 90000, [(IT(1), 4), (IT(2), 2)])
EST_BREAK = estimate(S[3], 35000, 6000, 'break_even', 'NULL', [(IT(1), 4), (IT(2), 2)])
EST_S1 = estimate(S[1], 25000, 'NULL', 'break_even', 'NULL', [(IT(1), 1)])
EST_S1_CUSTOM = estimate(S[1], 25000, 5000, 'custom', 70000, [(IT(2), 3)], 4)
EST_S4 = estimate(S[4], 10000, 'NULL', 'break_even', 'NULL', [])
MARK_HAL = mark(S[3], HAL3, 90000, OP(901))
MARK_JO = mark(S[3], JO3, 50000, OP(902))
MARK_IVY_LEGACY = ["INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id, device_id) VALUES "
                   f"('{S[3]}', '{IVY3}', '{CLUB1}', NULL, 'PHP', TIMESTAMPTZ '2026-11-19 03:00:00+00', '{OP(903)}', '{CLUB1}', NULL)"]
SCEN['custom'] = INV + EST_CUSTOM
SCEN['break_even'] = INV + EST_BREAK
SCEN['custom_marks'] = INV + EST_CUSTOM + MARK_HAL + MARK_JO
SCEN['custom_legacy_mark'] = INV + EST_CUSTOM + MARK_IVY_LEGACY
SCEN['custom_all_marked'] = INV + EST_CUSTOM + MARK_HAL + MARK_JO + mark(S[3], IVY3, 90000, OP(904))
SCEN['no_fee_all_marked'] = INV + MARK_HAL + MARK_JO + mark(S[3], IVY3, 90000, OP(904))
SCEN['no_fee_one_marked'] = INV + MARK_HAL
SCEN['custom_hal_released'] = INV + EST_CUSTOM + [f"UPDATE session_players SET released_at = {NOW}, release_reason = 'removed', level_locked_at = NULL WHERE id = '{HAL3}'"]
SCEN['custom_hal_released_marked'] = INV + EST_CUSTOM + MARK_HAL + [f"UPDATE session_players SET released_at = {NOW}, release_reason = 'removed', level_locked_at = NULL WHERE id = '{HAL3}'"]
SCEN['custom_hal_no_show'] = INV + EST_CUSTOM + [f"UPDATE session_players SET no_show_at = {NOW} WHERE id = '{HAL3}'"]
SCEN['custom_hal_no_show_marked'] = INV + EST_CUSTOM + MARK_HAL + [f"UPDATE session_players SET no_show_at = {NOW} WHERE id = '{HAL3}'"]
SCEN['custom_everyone_released'] = INV + EST_CUSTOM + [f"UPDATE session_players SET released_at = {NOW}, release_reason = 'removed', level_locked_at = NULL WHERE session_id = '{S[3]}'"]
SCEN['s1_estimate'] = INV + EST_S1
SCEN['s1_custom_estimate'] = INV + EST_S1_CUSTOM
SCEN['s1_estimate_marked'] = INV + EST_S1 + mark(S[1], SP(1), 100000, OP(905))
SCEN['s4_estimate'] = INV + EST_S4
SCEN['custom_and_s4_estimates'] = INV + EST_CUSTOM + EST_S4
SCEN['s4_estimate_hal_marked'] = INV + EST_S4 + mark(S[4], SP(7), 20000, OP(906))
for state, extra in (('cancelled', f", started_at = NULL, cancelled_at = {NOW}, cancel_reason = 'Rain'"), ('invalid', ", invalid_reason = 'Wrong night'"), ('finalizing', '')):
    SCEN[f's3_{state}'] = INV + EST_CUSTOM + MARK_HAL + [f"UPDATE queue_sessions SET state = '{state}'{extra} WHERE id = '{S[3]}'"]
SCEN['lapsed_live_with_a_player'] = INV + [
    "INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, created_at, updated_at, revision) VALUES "
    f"('{SP(8)}', '{CLUB2}', '{S[8]}', '{LARRY}', 'Larry Lapsed', true, {NOW}, 3, {NOW}, {NOW}, {NOW}, {NOW}, 1)"]
SCEN['lapsed_prepared_with_a_player'] = INV + [
    "INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, created_at, updated_at, revision) VALUES "
    f"('{SP(9)}', '{CLUB2}', '{S[7]}', '{LARRY}', 'Larry Lapsed', false, {NOW}, 3, {NOW}, {NOW}, {NOW}, {NOW}, 1)"]
SCEN['other_clubs_mark_op'] = INV + EST_CUSTOM + mark(S[3], HAL3, 90000, OP(11))
SCEN['lapsed_club_item'] = INV + [
    "INSERT INTO inventory_items (id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, created_at, updated_at, revision) VALUES "
    f"('{IT(7)}', '{CLUB2}', 'Larry birds', 'shuttlecocks', 'tube', 4, 100000, 'PHP', NULL, {T0}, {T0}, 1)"]


# ---------------------------------------------------------------- the routes
def batch(session, op, marks, who=SMASH, **kw):
    body = {}
    if op is not None:
        body['operationId'] = op
    if marks is not None:
        body['marks'] = marks
    return req('POST', f'/api/sessions/{session}/payments', body, who=who, **kw)


def tick(player, paid=True):
    return {'clubPlayerId': player, 'paid': paid}


def amount(session, op, player, minor, who=SMASH, **kw):
    body = {}
    if op is not None:
        body['operationId'] = op
    if player is not None:
        body['clubPlayerId'] = player
    if minor is not None:
        body['amountMinor'] = minor
    return req('POST', f'/api/sessions/{session}/payments/amount', body, who=who, **kw)


def mark_all(session, op, who=SMASH, **kw):
    return req('POST', f'/api/sessions/{session}/payments/mark-all', {} if op is None else {'operationId': op}, who=who, **kw)


def item_body(**kw):
    b = {'id': IT(10), 'name': 'Aero Sensa', 'category': 'shuttlecocks', 'unit': 'tube', 'stock': 5, 'unitCostMinor': 120000}
    b.update(kw)
    return {k: v for k, v in b.items() if v != '__omit__'}


def inv(body, who=SMASH, **kw):
    return req('POST', '/api/inventory', body, who=who, **kw)


def stock(item, delta, who=SMASH, **kw):
    return req('POST', f'/api/inventory/{item}/stock', {} if delta is None else {'delta': delta}, who=who, **kw)


def remove(item, who=SMASH, **kw):
    return req('DELETE', f'/api/inventory/{item}', who=who, **kw)


# ================================================================ inventory: add and edit
case('inv_signed_out', inv(item_body(), who=None))
case('inv_player_subject_is_not_a_club', inv(item_body(), who=PLAYER_SUBJECT, **NOSUBJECT))
case('inv_body_not_json', req('POST', '/api/inventory', rawBody='nope'))
case('inv_no_body', req('POST', '/api/inventory'))
case('inv_body_a_list', req('POST', '/api/inventory', rawBody='[]'))
case('inv_add', inv(item_body()))
case('inv_add_answers_200_with_the_item', inv(item_body(name='  Spaced  ', unit='  box  ')))
case('inv_add_without_a_unit_is_a_piece', inv(item_body(unit='__omit__')))
case('inv_add_a_unit_of_spaces_is_a_piece', inv(item_body(unit='   ')))
case('inv_add_a_unit_that_is_a_number_is_a_piece', inv(item_body(unit=5)))
case('inv_add_equipment', inv(item_body(category='equipment', unitCostMinor=0, stock=0)))
case('inv_add_other', inv(item_body(category='other')))
case('inv_add_with_an_upper_case_id', inv(item_body(id=IT(10).upper())))
case('inv_add_the_largest_cost_and_stock', inv(item_body(unitCostMinor=2147483600, stock=2147483647)))
case('inv_the_lapsed_club_is_refused_first', inv(item_body(name='', id='x'), who=LAPSED))
case('inv_the_lapsed_club_with_a_good_body', inv(item_body(), who=LAPSED))
case('inv_id_missing', inv(item_body(id='__omit__')))
case('inv_id_not_a_uuid', inv(item_body(id='nope')))
case('inv_id_not_text', inv(item_body(id=7)))
case('inv_name_missing', inv(item_body(name='__omit__')))
case('inv_name_of_spaces', inv(item_body(name='   ')))
case('inv_name_not_text', inv(item_body(name=5)))
case('inv_category_missing', inv(item_body(category='__omit__')))
case('inv_category_unknown', inv(item_body(category='Shuttlecocks')))
case('inv_stock_negative', inv(item_body(stock=-1)))
case('inv_stock_fraction', inv(item_body(stock=1.5)))
case('inv_stock_text', inv(item_body(stock='3')))
case('inv_stock_null', inv(item_body(stock=None)))
case('inv_stock_missing', inv(item_body(stock='__omit__')))
case('inv_stock_beyond_a_32_bit_integer', inv(item_body(stock=2147483648)), **CRASH)
case('inv_stock_a_huge_whole_number', inv(item_body(stock=1e300)), **CRASH)
case('inv_cost_not_whole_pesos', inv(item_body(unitCostMinor=150)))
case('inv_cost_negative', inv(item_body(unitCostMinor=-100)))
case('inv_cost_fraction', inv(item_body(unitCostMinor=100.5)))
case('inv_cost_text', inv(item_body(unitCostMinor='100')))
case('inv_cost_null', inv(item_body(unitCostMinor=None)))
case('inv_cost_missing', inv(item_body(unitCostMinor='__omit__')))
case('inv_cost_beyond_the_safe_integers', inv(item_body(unitCostMinor=9007199254740992)))
case('inv_cost_beyond_a_32_bit_integer', inv(item_body(unitCostMinor=2147483700)), **CRASH)
case('inv_checks_run_in_order_id_before_name', inv(item_body(id='nope', name='', category='x', stock=-1, unitCostMinor=-1)))
case('inv_checks_run_in_order_name_before_category', inv(item_body(name='', category='x', stock=-1, unitCostMinor=-1)))
case('inv_checks_run_in_order_category_before_stock', inv(item_body(category='x', stock=-1, unitCostMinor=-1)))
case('inv_checks_run_in_order_stock_before_cost', inv(item_body(stock=-1, unitCostMinor=-1)))
case('inv_a_retried_add_returns_the_same_item', [inv(item_body()), inv(item_body())])
case('inv_a_retried_add_with_other_fields_returns_the_first', [inv(item_body()), inv(item_body(name='Other', stock=99))])
case('inv_a_retried_add_still_checks_the_fields', [inv(item_body()), inv(item_body(name=''))])
case('inv_edit_an_existing_item_without_a_revision_returns_it_unchanged', inv(item_body(id=IT(1), name='Renamed', stock=1)))
case('inv_edit', inv(item_body(id=IT(1), name='Renamed', stock=1, unitCostMinor=150000, expectedRevision='1')))
case('inv_edit_every_field', inv(item_body(id=IT(2), name='Victor Champion', category='other', unit='box', stock=20, unitCostMinor=99900 - 99900 + 200000, expectedRevision='3')))
case('inv_edit_with_no_unit_resets_it_to_a_piece', inv(item_body(id=IT(1), unit='__omit__', expectedRevision='1')))
case('inv_edit_stale_revision', inv(item_body(id=IT(1), expectedRevision='0')))
case('inv_edit_twice_at_the_same_revision', [inv(item_body(id=IT(1), name='First', expectedRevision='1')), inv(item_body(id=IT(1), name='Second', expectedRevision='1'))])
case('inv_edit_twice_at_the_new_revision', [inv(item_body(id=IT(1), name='First', expectedRevision='1')), inv(item_body(id=IT(1), name='Second', expectedRevision='2'))])
case('inv_edit_a_revision_that_is_not_a_number', inv(item_body(id=IT(1), expectedRevision='five')))
case('inv_edit_a_revision_that_is_not_text_is_ignored', inv(item_body(id=IT(1), name='Ignored', expectedRevision=1)))
case('inv_edit_a_revision_of_text_with_spaces', inv(item_body(id=IT(1), name='Spaced', expectedRevision=' 1 ')))
case('inv_edit_a_removed_item', inv(item_body(id=IT(4), expectedRevision='2')))
case('inv_edit_a_removed_item_without_a_revision', inv(item_body(id=IT(4))))
case('inv_edit_another_clubs_item', inv(item_body(id=IT(5), expectedRevision='1')))
case('inv_edit_another_clubs_item_without_a_revision', inv(item_body(id=IT(5))))
case('inv_edit_validates_before_it_finds_the_item', inv(item_body(id=IT(5), name='')))
case('inv_edit_beyond_a_32_bit_integer', inv(item_body(id=IT(1), stock=2147483648, expectedRevision='1')), **CRASH)
case('inv_a_retried_add_beyond_a_32_bit_integer_still_returns_the_item', [inv(item_body()), inv(item_body(stock=2147483648))])

# ================================================================ inventory: stock step
case('stock_signed_out', stock(IT(1), 1, who=None))
case('stock_body_not_json', req('POST', f'/api/inventory/{IT(1)}/stock', rawBody='nope'))
case('stock_body_not_json_for_a_lapsed_club', req('POST', f'/api/inventory/{IT(1)}/stock', rawBody='nope', who=LAPSED))
case('stock_up', stock(IT(1), 1))
case('stock_down', stock(IT(1), -1))
case('stock_up_then_down', [stock(IT(1), 1, snapshot=True), stock(IT(1), -1)])
case('stock_down_to_zero', stock(IT(3), -1), scenario='stock_one')
SCEN['stock_one'] = INV + [f"UPDATE inventory_items SET stock = 1 WHERE id = '{IT(3)}'"]
case('stock_down_below_zero', stock(IT(6), -1))
case('stock_up_from_zero', stock(IT(6), 1))
case('stock_delta_two', stock(IT(1), 2))
case('stock_delta_zero', stock(IT(1), 0))
case('stock_delta_text', stock(IT(1), '1'))
case('stock_delta_missing', stock(IT(1), None))
case('stock_delta_null', req('POST', f'/api/inventory/{IT(1)}/stock', {'delta': None}))
case('stock_delta_a_fraction', stock(IT(1), 1.5))
case('stock_the_delta_is_checked_before_the_item', stock(UNKNOWN_ITEM, 5))
case('stock_a_lapsed_club_is_refused_before_the_delta', stock(IT(7), 5, who=LAPSED), scenario='lapsed_club_item')
case('stock_a_lapsed_club', stock(IT(7), 1, who=LAPSED), scenario='lapsed_club_item')
case('stock_unknown_item', stock(UNKNOWN_ITEM, 1))
case('stock_item_id_not_a_uuid', stock('nope', 1))
case('stock_upper_case_item_id', stock(IT(1).upper(), 1))
case('stock_a_removed_item', stock(IT(4), 1))
case('stock_a_removed_item_that_would_go_below_zero_is_not_found', stock(IT(4), -1), scenario='stock_removed_empty')
SCEN['stock_removed_empty'] = INV + [f"UPDATE inventory_items SET stock = 0 WHERE id = '{IT(4)}'"]
case('stock_another_clubs_item', stock(IT(5), 1))
case('stock_two_down_at_one_in_stock', {'parallel': [stock(IT(3), -1), stock(IT(3), -1)]}, scenario='stock_one')

# ================================================================ inventory: remove
case('rm_signed_out', remove(IT(1), who=None))
case('rm_item', remove(IT(1)))
case('rm_twice_returns_the_removed_item_again', [remove(IT(1), snapshot=True), remove(IT(1))])
case('rm_a_removed_item', remove(IT(4)))
case('rm_another_clubs_item', remove(IT(5)))
case('rm_unknown_item', remove(UNKNOWN_ITEM))
case('rm_item_id_not_a_uuid', remove('nope'))
case('rm_upper_case_item_id', remove(IT(1).upper()))
case('rm_a_lapsed_club', remove(IT(7), who=LAPSED), scenario='lapsed_club_item')
case('rm_an_item_a_plan_still_uses_keeps_the_estimate', remove(IT(1)), scenario='custom')
case('rm_then_the_stock_step_is_not_found', [remove(IT(1)), stock(IT(1), 1)])
case('rm_two_at_once', {'parallel': [remove(IT(1)), remove(IT(1))]})

# ================================================================ payments: the batch
case('pay_signed_out', batch(S[3], OP(1), [tick(HAL)], who=None), scenario='custom')
case('pay_body_not_json', req('POST', f'/api/sessions/{S[3]}/payments', rawBody='nope'), scenario='custom')
case('pay_marks_missing', batch(S[3], OP(1), None), scenario='custom')
case('pay_marks_not_a_list', req('POST', f'/api/sessions/{S[3]}/payments', {'operationId': OP(1), 'marks': {'a': 1}}), scenario='custom')
case('pay_marks_empty', batch(S[3], OP(1), []), scenario='custom')
case('pay_operation_missing', batch(S[3], None, [tick(HAL)]), scenario='custom')
case('pay_operation_not_a_uuid', batch(S[3], 'nope', [tick(HAL)]), scenario='custom')
case('pay_operation_is_checked_before_the_session', batch(UNKNOWN, 'nope', [tick(HAL)]), scenario='custom')
case('pay_player_id_is_checked_before_the_session', batch(UNKNOWN, OP(1), [tick('nope')]), scenario='custom')
case('pay_a_bad_player_id', batch(S[3], OP(1), [tick(HAL), tick('nope')]), scenario='custom')
case('pay_a_mark_that_is_null', batch(S[3], OP(1), [None]), scenario='custom')
case('pay_a_mark_that_is_a_number', batch(S[3], OP(1), [5]), scenario='custom')
case('pay_a_mark_that_is_a_list', batch(S[3], OP(1), [[HAL]]), scenario='custom')
case('pay_paid_not_a_boolean', batch(S[3], OP(1), [{'clubPlayerId': HAL, 'paid': 'yes'}]), scenario='custom')
case('pay_paid_missing', batch(S[3], OP(1), [{'clubPlayerId': HAL}]), scenario='custom')
case('pay_the_first_bad_mark_wins', batch(S[3], OP(1), [{'clubPlayerId': HAL, 'paid': 'yes'}, tick('nope')]), scenario='custom')
case('pay_a_bad_player_before_a_bad_paid', batch(S[3], OP(1), [tick('nope'), {'clubPlayerId': HAL, 'paid': 'yes'}]), scenario='custom')
case('pay_tick_one', batch(S[3], OP(1), [tick(HAL)]), scenario='custom')
case('pay_tick_two_and_untick_one', batch(S[3], OP(1), [tick(HAL), tick(JO), tick(IVY, False)]), scenario='custom_legacy_mark')
case('pay_tick_all_three', batch(S[3], OP(1), [tick(HAL), tick(IVY), tick(JO)]), scenario='custom')
case('pay_tick_an_already_ticked_player_keeps_the_saved_amount', batch(S[3], OP(2), [tick(HAL), tick(JO)]), scenario='custom_marks')
case('pay_untick', batch(S[3], OP(1), [tick(HAL, False)]), scenario='custom_marks')
case('pay_untick_a_player_with_no_mark', batch(S[3], OP(1), [tick(IVY, False)]), scenario='custom_marks')
case('pay_tick_a_legacy_mark_answers_a_null_amount', batch(S[3], OP(1), [tick(IVY)]), scenario='custom_legacy_mark')
case('pay_the_same_player_twice_keeps_the_last_and_the_first_position', batch(S[3], OP(1), [tick(HAL), tick(JO), tick(HAL, False)]), scenario='custom')
case('pay_the_same_player_twice_in_the_other_order', batch(S[3], OP(1), [tick(HAL, False), tick(JO), tick(HAL)]), scenario='custom')
case('pay_an_upper_case_player_id', batch(S[3], OP(1), [tick(HAL.upper())]), scenario='custom')
case('pay_an_upper_case_player_id_and_the_lower_case_one', batch(S[3], OP(1), [tick(HAL.upper()), tick(HAL)]), scenario='custom')
case('pay_an_upper_case_operation_id', batch(S[3], OP(1).upper(), [tick(HAL)]), scenario='custom')
case('pay_a_retry_returns_the_same_marks', [batch(S[3], OP(1), [tick(HAL), tick(JO)], snapshot=True), batch(S[3], OP(1), [tick(HAL), tick(JO)])], scenario='custom')
case('pay_a_retry_under_a_new_operation_keeps_the_marks', [batch(S[3], OP(1), [tick(HAL)], snapshot=True), batch(S[3], OP(2), [tick(HAL)])], scenario='custom')
case('pay_tick_then_untick_then_tick_again', [batch(S[3], OP(1), [tick(HAL)]), batch(S[3], OP(1), [tick(HAL, False)]), batch(S[3], OP(1), [tick(HAL)])], scenario='custom')
case('pay_break_even_records_the_amount_due_at_that_moment', batch(S[3], OP(1), [tick(HAL), tick(IVY), tick(JO)]), scenario='break_even')
case('pay_no_fee_set_refuses_a_tick', batch(S[1], OP(1), [tick(HAL)]))
case('pay_no_fee_set_allows_an_untick', batch(S[1], OP(1), [tick(HAL, False)]))
case('pay_no_fee_set_returns_a_saved_mark', batch(S[3], OP(1), [tick(HAL), tick(JO)]), scenario='no_fee_one_marked')
case('pay_no_fee_set_refuses_the_whole_batch', batch(S[3], OP(1), [tick(HAL), tick(IVY)]), scenario='no_fee_one_marked')
case('pay_a_player_off_the_roster_is_refused', batch(S[3], OP(1), [tick(HAL)]), scenario='custom_hal_released')
case('pay_a_released_player_can_be_unticked', batch(S[3], OP(1), [tick(HAL, False)]), scenario='custom_hal_released_marked')
case('pay_a_released_player_keeps_a_saved_mark_on_a_tick', batch(S[3], OP(1), [tick(HAL)]), scenario='custom_hal_released_marked')
case('pay_a_no_show_player_is_refused', batch(S[3], OP(1), [tick(HAL)]), scenario='custom_hal_no_show')
case('pay_a_no_show_player_can_be_unticked', batch(S[3], OP(1), [tick(HAL, False)]), scenario='custom_hal_no_show_marked')
case('pay_a_player_of_the_club_who_is_not_in_the_session', batch(S[3], OP(1), [tick(GUS)]), scenario='custom')
case('pay_a_removed_saved_player', batch(S[3], OP(1), [tick(REX)]), scenario='custom')
case('pay_another_clubs_player', batch(S[3], OP(1), [tick(OLGA)]), scenario='custom')
case('pay_the_batch_is_all_or_nothing', batch(S[3], OP(1), [tick(HAL), tick(OLGA)]), scenario='custom')
case('pay_a_prepared_session', batch(S[1], OP(1), [tick(HAL)]), scenario='s1_estimate')
case('pay_a_completed_session', batch(S[4], OP(1), [tick(HAL)]), scenario='s4_estimate')
case('pay_a_completed_session_untick', batch(S[4], OP(1), [tick(HAL, False)]), scenario='s4_estimate_hal_marked')
case('pay_a_cancelled_session', batch(S[3], OP(1), [tick(HAL)]), scenario='s3_cancelled')
case('pay_an_invalid_session', batch(S[3], OP(1), [tick(HAL)]), scenario='s3_invalid')
case('pay_a_finalizing_session', batch(S[3], OP(1), [tick(HAL)]), scenario='s3_finalizing')
case('pay_state_is_checked_before_the_marks_are_looked_up', batch(S[3], OP(1), [tick(OLGA)]), scenario='s3_cancelled')
case('pay_an_empty_batch_on_a_cancelled_session', batch(S[3], OP(1), []), scenario='s3_cancelled')
case('pay_an_unknown_session', batch(UNKNOWN, OP(1), [tick(HAL)]))
case('pay_a_malformed_session', batch('nope', OP(1), [tick(HAL)]), **MALFORMED)
case('pay_another_clubs_session', batch(S[9], OP(1), [tick(OLGA)]))
case('pay_a_lapsed_club_prepared_session', batch(S[7], OP(1), [tick(LARRY)], who=LAPSED), scenario='lapsed_prepared_with_a_player')
case('pay_a_live_session_started_under_a_term_of_a_lapsed_club', batch(S[8], OP(1), [tick(LARRY, False)], who=LAPSED), scenario='lapsed_live_with_a_player')
case('pay_the_derived_operation_id_of_a_batch_clashes_across_sessions_for_the_same_club_player', [batch(S[3], OP(1), [tick(HAL)]), batch(S[4], OP(1), [tick(HAL)])], scenario='custom_and_s4_estimates', **CRASH)
case('pay_two_at_once_the_same_batch', {'parallel': [batch(S[3], OP(1), [tick(HAL), tick(JO)]), batch(S[3], OP(1), [tick(HAL), tick(JO)])]}, scenario='custom')

# ================================================================ payments: the amount received
case('amt_signed_out', amount(S[3], OP(1), HAL, 50000, who=None), scenario='custom')
case('amt_body_not_json', req('POST', f'/api/sessions/{S[3]}/payments/amount', rawBody='nope'), scenario='custom')
case('amt_set', amount(S[3], OP(1), HAL, 50000), scenario='custom')
case('amt_set_with_no_fee', amount(S[1], OP(1), HAL, 50000))
case('amt_more_than_the_due', amount(S[3], OP(1), HAL, 120000), scenario='custom')
case('amt_replaces_a_mark_with_a_new_operation', amount(S[3], OP(2), HAL, 70000), scenario='custom_marks')
case('amt_replaces_a_legacy_mark', amount(S[3], OP(2), IVY, 70000), scenario='custom_legacy_mark')
case('amt_a_retry_returns_the_saved_mark_not_the_new_amount', [amount(S[3], OP(1), HAL, 50000, snapshot=True), amount(S[3], OP(1), HAL, 70000)], scenario='custom')
case('amt_a_retry_with_an_amount_of_zero_keeps_the_mark', [amount(S[3], OP(1), HAL, 50000), amount(S[3], OP(1), HAL, 0)], scenario='custom')
case('amt_a_retry_on_a_legacy_mark_answers_a_null_amount', amount(S[3], OP(903), IVY, 70000), scenario='custom_legacy_mark')
case('amt_zero_removes_the_mark', amount(S[3], OP(2), HAL, 0), scenario='custom_marks')
case('amt_zero_with_no_mark', amount(S[3], OP(2), IVY, 0), scenario='custom_marks')
case('amt_zero_with_no_fee', amount(S[3], OP(2), HAL, 0), scenario='no_fee_one_marked')
case('amt_negative', amount(S[3], OP(1), HAL, -1), scenario='custom')
case('amt_a_fraction', amount(S[3], OP(1), HAL, 100.5), scenario='custom')
case('amt_text', amount(S[3], OP(1), HAL, '500'), scenario='custom')
case('amt_missing', amount(S[3], OP(1), HAL, None), scenario='custom')
case('amt_null', req('POST', f'/api/sessions/{S[3]}/payments/amount', {'operationId': OP(1), 'clubPlayerId': HAL, 'amountMinor': None}), scenario='custom')
case('amt_beyond_the_safe_integers', amount(S[3], OP(1), HAL, 9007199254740992), scenario='custom')
case('amt_beyond_a_32_bit_integer', amount(S[3], OP(1), HAL, 2147483648), scenario='custom', **CRASH)
case('amt_the_largest_32_bit_integer', amount(S[3], OP(1), HAL, 2147483647), scenario='custom')
case('amt_beyond_a_32_bit_integer_but_zero_is_nothing_to_store', amount(S[3], OP(2), HAL, 0), scenario='custom_marks')
case('amt_operation_missing', amount(S[3], None, HAL, 100), scenario='custom')
case('amt_operation_not_a_uuid', amount(S[3], 'nope', HAL, 100), scenario='custom')
case('amt_player_not_a_uuid', amount(S[3], OP(1), 'nope', 100), scenario='custom')
case('amt_player_missing', amount(S[3], OP(1), None, 100), scenario='custom')
case('amt_the_operation_is_checked_before_the_player', amount(S[3], 'nope', 'nope', -1), scenario='custom')
case('amt_the_player_is_checked_before_the_amount', amount(S[3], OP(1), 'nope', -1), scenario='custom')
case('amt_the_amount_is_checked_before_the_session', amount(UNKNOWN, OP(1), HAL, -1), scenario='custom')
case('amt_the_player_is_checked_before_the_session', amount(UNKNOWN, OP(1), 'nope', 100), scenario='custom')
case('amt_an_upper_case_player_id', amount(S[3], OP(1), HAL.upper(), 100), scenario='custom')
case('amt_an_upper_case_operation_id_is_stored_lower_case', amount(S[3], OP(1).upper(), HAL, 100), scenario='custom')
case('amt_an_upper_case_retry_does_not_match_and_replaces_the_mark', [amount(S[3], OP(1), HAL, 100), amount(S[3], OP(1).upper(), HAL, 200)], scenario='custom')
case('amt_the_operation_of_another_players_mark_is_a_conflict_in_the_database', amount(S[3], OP(901), JO, 100), scenario='custom_marks', **CRASH)
case('amt_a_player_off_the_roster_is_refused', amount(S[3], OP(1), HAL, 100), scenario='custom_hal_released')
case('amt_a_player_off_the_roster_with_a_saved_mark_of_this_operation', amount(S[3], OP(901), HAL, 100), scenario='custom_hal_released_marked')
case('amt_a_player_off_the_roster_with_a_saved_mark_and_a_new_operation', amount(S[3], OP(1), HAL, 100), scenario='custom_hal_released_marked')
case('amt_a_no_show_player_is_refused', amount(S[3], OP(1), HAL, 100), scenario='custom_hal_no_show')
case('amt_zero_for_a_player_off_the_roster_is_refused', amount(S[3], OP(1), HAL, 0), scenario='custom_hal_released_marked')
case('amt_a_player_not_in_the_session', amount(S[3], OP(1), GUS, 100), scenario='custom')
case('amt_another_clubs_player', amount(S[3], OP(1), OLGA, 100), scenario='custom')
case('amt_a_prepared_session', amount(S[1], OP(1), HAL, 100), scenario='s1_estimate')
case('amt_a_completed_session', amount(S[4], OP(1), HAL, 100), scenario='s4_estimate')
case('amt_a_cancelled_session', amount(S[3], OP(1), HAL, 100), scenario='s3_cancelled')
case('amt_an_invalid_session', amount(S[3], OP(1), HAL, 100), scenario='s3_invalid')
case('amt_a_finalizing_session', amount(S[3], OP(1), HAL, 100), scenario='s3_finalizing')
case('amt_an_unknown_session', amount(UNKNOWN, OP(1), HAL, 100))
case('amt_a_malformed_session', amount('nope', OP(1), HAL, 100), **MALFORMED)
case('amt_another_clubs_session', amount(S[9], OP(1), OLGA, 100))
case('amt_a_lapsed_club_prepared_session', amount(S[7], OP(1), LARRY, 100, who=LAPSED), scenario='lapsed_prepared_with_a_player')
case('amt_a_live_session_started_under_a_term_of_a_lapsed_club', amount(S[8], OP(1), LARRY, 100, who=LAPSED), scenario='lapsed_live_with_a_player')
case('amt_two_at_once_the_same_operation', {'parallel': [amount(S[3], OP(1), HAL, 50000), amount(S[3], OP(1), HAL, 50000)]}, scenario='custom')

# ================================================================ payments: Mark all paid
case('all_signed_out', mark_all(S[3], OP(1), who=None), scenario='custom')
case('all_body_not_json', req('POST', f'/api/sessions/{S[3]}/payments/mark-all', rawBody='nope'), scenario='custom')
case('all_marks_everyone', mark_all(S[3], OP(1)), scenario='custom')
case('all_marks_only_the_unpaid_and_keeps_saved_amounts', mark_all(S[3], OP(1)), scenario='custom_marks')
case('all_everyone_already_paid', mark_all(S[3], OP(1)), scenario='custom_all_marked')
case('all_everyone_already_paid_with_no_fee_set', mark_all(S[3], OP(1)), scenario='no_fee_all_marked')
case('all_no_fee_set_refuses_while_anyone_is_unpaid', mark_all(S[3], OP(1)), scenario='no_fee_one_marked')
case('all_no_fee_set_on_a_prepared_session', mark_all(S[1], OP(1)))
case('all_break_even', mark_all(S[3], OP(1)), scenario='break_even')
case('all_a_retry_marks_nobody_again', [mark_all(S[3], OP(1), snapshot=True), mark_all(S[3], OP(1))], scenario='custom')
case('all_the_players_off_the_roster_are_left_out', mark_all(S[3], OP(1)), scenario='custom_hal_released')
case('all_the_no_show_players_are_left_out', mark_all(S[3], OP(1)), scenario='custom_hal_no_show')
case('all_a_roster_of_nobody', mark_all(S[3], OP(1)), scenario='custom_everyone_released')
case('all_a_legacy_mark_counts_as_paid', mark_all(S[3], OP(1)), scenario='custom_legacy_mark')
case('all_a_prepared_session', mark_all(S[1], OP(1)), scenario='s1_estimate')
case('all_a_completed_session', mark_all(S[4], OP(1)), scenario='s4_estimate')
case('all_a_cancelled_session', mark_all(S[3], OP(1)), scenario='s3_cancelled')
case('all_an_invalid_session', mark_all(S[3], OP(1)), scenario='s3_invalid')
case('all_a_finalizing_session', mark_all(S[3], OP(1)), scenario='s3_finalizing')
case('all_operation_missing', mark_all(S[3], None), scenario='custom')
case('all_operation_not_a_uuid', mark_all(S[3], 'nope'), scenario='custom')
case('all_operation_not_text', req('POST', f'/api/sessions/{S[3]}/payments/mark-all', {'operationId': 5}), scenario='custom')
case('all_the_operation_is_checked_before_the_session', mark_all(UNKNOWN, 'nope'))
case('all_an_unknown_session', mark_all(UNKNOWN, OP(1)))
case('all_a_malformed_session', mark_all('nope', OP(1)), **MALFORMED)
case('all_another_clubs_session', mark_all(S[9], OP(1)))
case('all_a_lapsed_club_prepared_session', mark_all(S[7], OP(1), who=LAPSED), scenario='lapsed_prepared_with_a_player')
case('all_a_live_session_started_under_a_term_of_a_lapsed_club', mark_all(S[8], OP(1), who=LAPSED), scenario='lapsed_live_with_a_player')
case('all_two_at_once_the_same_operation', {'parallel': [mark_all(S[3], OP(1)), mark_all(S[3], OP(1))]}, scenario='custom')
case('all_the_derived_ids_do_not_clash_between_sessions', [mark_all(S[3], OP(1)), mark_all(S[4], OP(1))], scenario='custom_and_s4_estimates')


# ================================================================ the cost estimate beside a session
START, END = '2026-12-05T01:00:00.000Z', '2026-12-05T05:00:00.000Z'


def form(**kw):
    f = {'title': 'Saturday Smash', 'notes': 'Bring shuttles', 'venueId': V1, 'scheduledStartAt': START, 'scheduledEndAt': END, 'sessionMode': 'fair',
         'allowSingles': True, 'allowDoubles': True, 'minimumGames': 2, 'minimumIsCalculated': False, 'expectedPlayers': None,
         'courts': [{'label': 'Court 1'}, {'label': 'Court 2'}]}
    f.update(kw)
    return f


def cost(court=35000, entrance=6000, mode='custom', custom=90000, shuttles='__default__', **kw):
    c = {'courtFeePerCourtHour': court, 'entranceFeePerHead': entrance, 'paymentMode': mode, 'customFeePerHead': custom,
         'shuttles': [{'inventoryItemId': IT(1), 'tubes': 4}, {'inventoryItemId': IT(2), 'tubes': 2}] if shuttles == '__default__' else shuttles}
    c.update(kw)
    return {k: v for k, v in c.items() if v != '__omit__'}


def create(n, input_, who=SMASH, **kw):
    return req('POST', '/api/sessions', {'commandId': f'cmd-{n}', 'input': input_}, who=who, **kw)


def edit(session, input_, revision, n=1, who=SMASH, **kw):
    return req('PATCH', f'/api/sessions/{session}', {'commandId': f'edit-{n}', 'expectedRevision': revision, 'input': input_}, who=who, **kw)


def s1_form(**kw):
    base = dict(title='Prep Open', notes='', scheduledStartAt='2026-11-20T01:00:00.000Z', scheduledEndAt='2026-11-20T05:00:00.000Z',
                minimumGames=0, minimumIsCalculated=True, playersPerCourt=2, courts=[{'id': CT(1), 'label': 'Court 1'}])
    base.update(kw)
    return form(**base)


# ---- create
case('create_with_an_estimate', create(1, form(costEstimate=cost())))
case('create_with_a_break_even_estimate_of_one_fee', create(1, form(costEstimate=cost(entrance=None, mode='break_even', custom=None, shuttles=[]))))
case('create_with_an_estimate_that_has_no_fee_and_no_lines_saves_none', create(1, form(costEstimate=cost(court=None, entrance=None, mode='break_even', custom=None, shuttles=[]))))
case('create_with_an_estimate_of_zero_fees_keeps_it', create(1, form(costEstimate=cost(court=0, entrance=None, mode='break_even', custom=None, shuttles=[]))))
case('create_with_lines_that_have_no_tubes_or_no_item_saves_none', create(1, form(costEstimate=cost(court=None, entrance=None, mode='break_even', custom=None, shuttles=[{'inventoryItemId': '', 'tubes': 2}, {'inventoryItemId': IT(1), 'tubes': 0}, {'inventoryItemId': IT(1), 'tubes': -3}, {'inventoryItemId': IT(1), 'tubes': 'abc'}, {'inventoryItemId': IT(1), 'tubes': None}, 5, 'x', [], True]))))
case('create_the_lines_keep_their_order_and_the_same_item_twice', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(2), 'tubes': 1}, {'inventoryItemId': IT(1), 'tubes': 2}, {'inventoryItemId': IT(2), 'tubes': 3}, {'inventoryItemId': IT(3), 'tubes': 1}]))))
case('create_a_custom_fee_is_dropped_in_break_even', create(1, form(costEstimate=cost(mode='break_even', custom=70000))))
case('create_without_fee_keys_and_nothing_else_keeps_an_all_empty_estimate', create(1, form(costEstimate={'shuttles': [], 'paymentMode': 'break_even'})))
case('create_without_a_payment_mode_is_break_even', create(1, form(costEstimate=cost(mode='__omit__', custom='__omit__'))))
case('create_without_a_payment_mode_but_a_custom_fee_is_break_even_with_no_custom_fee', create(1, form(costEstimate=cost(mode='__omit__'))))
case('create_the_largest_fees', create(1, form(costEstimate=cost(court=2147483647, entrance=2147483647, custom=2147483647, shuttles=[]))))
case('create_a_series_saves_one_estimate_per_date', create(1, form(repeat='weekly', occurrences=3, costEstimate=cost())))
case('create_a_series_with_a_clashing_date_saves_the_dates_made', create(1, form(repeat='weekly', occurrences=3, scheduledStartAt='2026-11-13T01:00:00.000Z', scheduledEndAt='2026-11-13T05:00:00.000Z', costEstimate=cost())))
case('create_a_retry_keeps_the_first_estimate', [create(1, form(costEstimate=cost()), snapshot=True), create(1, form(costEstimate=cost(court=99900)))])
case('create_a_retry_of_a_series_keeps_the_first_estimates', [create(1, form(repeat='weekly', occurrences=3, costEstimate=cost())), create(1, form(repeat='weekly', occurrences=3, costEstimate=cost(court=99900)))])
case('create_a_retry_with_a_bad_estimate_fails_on_the_estimate', [create(1, form(costEstimate=cost())), create(1, form(costEstimate={'courtFeePerCourtHour': '1', 'shuttles': []}))])
case('create_a_retry_adds_an_estimate_the_first_did_not_have', [create(1, form()), create(1, form(costEstimate=cost()))])
for label, value in (('null', None), ('false', False), ('zero', 0), ('empty_text', '')):
    case(f'create_an_estimate_of_{label}_is_skipped', create(1, form(costEstimate=value)))
for label, value in (('an_empty_object', {}), ('the_old_prototype_shape', {'courtFee': 1}), ('true', True), ('a_number', 5), ('text', 'x'), ('an_empty_list', []), ('a_list_of_objects', [{'inventoryItemId': IT(1), 'tubes': 1}])):
    case(f'create_an_estimate_that_is_{label}_crashes_after_the_sessions_are_saved', create(1, form(costEstimate=value)), **CRASH)
for label, value in (('missing', '__omit__'), ('text', 'abc'), ('null', None), ('an_object', {'a': 1}), ('a_number', 3)):
    case(f'create_shuttles_{label}_crash', create(1, form(costEstimate=cost(shuttles=value))), **CRASH)
case('create_a_line_that_is_null_crashes', create(1, form(costEstimate=cost(shuttles=[None]))), **CRASH)
case('create_a_fee_that_is_text', create(1, form(costEstimate=cost(court='350'))))
case('create_an_entrance_fee_that_is_text', create(1, form(costEstimate=cost(entrance='60'))))
case('create_a_negative_court_fee', create(1, form(costEstimate=cost(court=-1))))
case('create_a_negative_entrance_fee', create(1, form(costEstimate=cost(entrance=-1))))
case('create_a_court_fee_with_centavos_of_a_fraction', create(1, form(costEstimate=cost(court=100.5))))
case('create_a_court_fee_beyond_the_safe_integers', create(1, form(costEstimate=cost(court=9007199254740992))))
case('create_a_court_fee_beyond_a_32_bit_integer', create(1, form(costEstimate=cost(court=2147483648))), **CRASH)
case('create_a_custom_fee_beyond_a_32_bit_integer', create(1, form(costEstimate=cost(custom=2147483648))), **CRASH)
case('create_a_court_fee_that_is_a_boolean', create(1, form(costEstimate=cost(court=True))))
case('create_the_court_fee_is_checked_before_the_entrance_fee', create(1, form(costEstimate=cost(court=-1, entrance=-1, custom=None))))
case('create_custom_without_a_custom_fee', create(1, form(costEstimate=cost(custom=None))))
case('create_custom_with_a_missing_custom_fee', create(1, form(costEstimate=cost(custom='__omit__'))))
case('create_custom_with_a_negative_custom_fee', create(1, form(costEstimate=cost(custom=-1))))
case('create_custom_with_a_zero_fee', create(1, form(costEstimate=cost(custom=0))))
case('create_the_custom_fee_is_checked_after_the_other_fees', create(1, form(costEstimate=cost(court=-1, custom=None))))
case('create_an_unknown_payment_mode', create(1, form(costEstimate=cost(mode='weird'))), **CRASH)
case('create_a_payment_mode_that_is_null', create(1, form(costEstimate=cost(mode=None))), **CRASH)
case('create_a_payment_mode_that_is_a_number', create(1, form(costEstimate=cost(mode=5))), **CRASH)
case('create_tubes_as_text', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(1), 'tubes': '3'}]))))
case('create_tubes_as_a_fraction', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(1), 'tubes': 2.5}]))))
case('create_tubes_as_a_boolean', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(1), 'tubes': True}]))))
case('create_tubes_as_a_list_of_one_number', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(1), 'tubes': [3]}]))))
case('create_tubes_beyond_a_32_bit_integer', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(1), 'tubes': 2147483648}]))), **CRASH)
case('create_a_line_with_an_item_that_is_a_number_crashes', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': 5, 'tubes': 2}]))), **CRASH)
case('create_a_line_with_an_item_that_is_not_a_uuid_crashes', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': 'nope', 'tubes': 2}]))), **CRASH)
case('create_a_line_with_an_unknown_item', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': UNKNOWN_ITEM, 'tubes': 2}]))))
case('create_a_line_with_another_clubs_item', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(5), 'tubes': 2}]))))
case('create_a_line_with_a_removed_item', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(4), 'tubes': 2}]))))
case('create_a_line_with_an_item_in_two_spellings_is_refused', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(1), 'tubes': 2}, {'inventoryItemId': IT(1).upper(), 'tubes': 1}]))))
case('create_a_line_with_an_upper_case_item', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(1).upper(), 'tubes': 2}]))))
case('create_a_line_with_equipment_is_accepted', create(1, form(costEstimate=cost(shuttles=[{'inventoryItemId': IT(3), 'tubes': 2}]))))
case('create_an_estimate_with_extra_fields_ignores_them', create(1, form(costEstimate=cost(notes='private', extra=[1]))))
case('create_the_estimate_of_an_invalid_form_is_never_reached', create(1, form(title='', costEstimate=cost())))
case('create_the_lapsed_club_is_refused_before_the_estimate', create(1, form(costEstimate=cost()), who=LAPSED))

# ---- edit
case('edit_with_an_estimate_saves_it', edit(S[1], s1_form(costEstimate=cost()), '5'))
case('edit_with_an_estimate_replaces_the_one_saved', edit(S[1], s1_form(costEstimate=cost(court=40000, entrance=None, mode='break_even', custom=None, shuttles=[{'inventoryItemId': IT(3), 'tubes': 2}])), '5'), scenario='s1_custom_estimate')
case('edit_with_the_same_estimate_still_bumps_both_revisions', edit(S[1], s1_form(costEstimate=cost(court=25000, entrance=5000, custom=70000, shuttles=[{'inventoryItemId': IT(2), 'tubes': 3}])), '5'), scenario='s1_custom_estimate')
case('edit_with_a_null_estimate_deletes_the_one_saved', edit(S[1], s1_form(costEstimate=None), '5'), scenario='s1_custom_estimate')
case('edit_with_a_null_estimate_and_none_saved', edit(S[1], s1_form(costEstimate=None), '5'))
case('edit_with_an_estimate_of_false_deletes_the_one_saved', edit(S[1], s1_form(costEstimate=False), '5'), scenario='s1_custom_estimate')
case('edit_with_an_estimate_of_zero_deletes_the_one_saved', edit(S[1], s1_form(costEstimate=0), '5'), scenario='s1_custom_estimate')
case('edit_with_an_empty_estimate_deletes_the_one_saved', edit(S[1], s1_form(costEstimate=cost(court=None, entrance=None, mode='break_even', custom=None, shuttles=[])), '5'), scenario='s1_custom_estimate')
case('edit_without_an_estimate_keeps_the_one_saved', edit(S[1], s1_form(), '5'), scenario='s1_custom_estimate')
case('edit_a_missing_court_fee_keeps_the_saved_one', edit(S[1], s1_form(costEstimate=cost(court='__omit__', entrance=None, mode='break_even', custom=None, shuttles=[{'inventoryItemId': IT(1), 'tubes': 1}])), '5'), scenario='s1_custom_estimate')
case('edit_a_null_court_fee_clears_the_saved_one', edit(S[1], s1_form(costEstimate=cost(court=None, entrance=None, mode='break_even', custom=None, shuttles=[{'inventoryItemId': IT(1), 'tubes': 1}])), '5'), scenario='s1_custom_estimate')
case('edit_a_missing_payment_mode_on_a_custom_estimate_is_refused_by_the_database', edit(S[1], s1_form(costEstimate=cost(mode='__omit__', custom='__omit__', shuttles=[{'inventoryItemId': IT(1), 'tubes': 1}])), '5'), scenario='s1_custom_estimate', **CRASH)
case('edit_a_missing_payment_mode_on_a_break_even_estimate_keeps_it', edit(S[1], s1_form(costEstimate=cost(mode='__omit__', custom='__omit__', shuttles=[{'inventoryItemId': IT(1), 'tubes': 1}])), '5'), scenario='s1_estimate')
case('edit_an_estimate_that_is_an_empty_object_crashes_after_the_session_is_saved', edit(S[1], s1_form(costEstimate={}), '5'), **CRASH)
case('edit_an_estimate_of_text_crashes_after_the_session_is_saved', edit(S[1], s1_form(costEstimate='x'), '5'), **CRASH)
case('edit_an_estimate_with_a_bad_fee_is_refused_after_the_session_is_saved', edit(S[1], s1_form(title='Renamed', costEstimate=cost(court=-1)), '5'))
case('edit_an_estimate_with_an_unknown_item_is_refused_after_the_session_is_saved', edit(S[1], s1_form(title='Renamed', costEstimate=cost(shuttles=[{'inventoryItemId': UNKNOWN_ITEM, 'tubes': 1}])), '5'), scenario='s1_custom_estimate')
case('edit_an_estimate_with_a_line_beyond_a_32_bit_integer_rolls_the_estimate_back', edit(S[1], s1_form(title='Renamed', costEstimate=cost(shuttles=[{'inventoryItemId': IT(1), 'tubes': 2147483648}])), '5'), scenario='s1_custom_estimate', **CRASH)
case('edit_with_a_stale_session_revision_never_reaches_the_estimate', edit(S[1], s1_form(costEstimate=cost()), '4'))
case('edit_twice_at_the_same_revision_saves_one_estimate', {'parallel': [edit(S[1], s1_form(costEstimate=cost()), '5', n=1)] * 2})
case('edit_twice_one_after_the_other', [edit(S[1], s1_form(costEstimate=cost()), '5', n=1, snapshot=True), edit(S[1], s1_form(costEstimate=cost(court=40000)), '7', n=2)])
case('edit_a_retry_of_the_same_command_bumps_the_estimate_again', [edit(S[1], s1_form(costEstimate=cost()), '5', n=1), edit(S[1], s1_form(costEstimate=cost()), '7', n=1)])
case('edit_a_live_session_is_refused_before_the_estimate', edit(S[3], s1_form(costEstimate=cost()), '12'))
case('edit_another_clubs_session', edit(S[9], s1_form(costEstimate=cost()), '1'))
case('edit_the_lapsed_club_is_refused_before_the_estimate', edit(S[7], s1_form(costEstimate=cost()), '1', who=LAPSED))


# ================================================================ write the file
SNAPSHOT = [
    next(x for x in PREP['snapshot'] if x['name'] == 'queue_sessions'),
    next(x for x in PREP['snapshot'] if x['name'] == 'session_courts'),
    {'name': 'inventory_items', 'sql': "SELECT id, club_id, name, category::text AS category, unit, stock, unit_cost_minor, currency, removed_at, "
     "CASE WHEN created_at > TIMESTAMPTZ '2026-11-19 12:00:00+00' THEN 'database now()' ELSE created_at::text END AS created_at, "
     "CASE WHEN updated_at > TIMESTAMPTZ '2026-11-19 12:00:00+00' THEN 'database now()' ELSE updated_at::text END AS updated_at, revision::text AS revision "
     "FROM inventory_items ORDER BY id"},
    {'name': 'session_cost_estimates', 'sql': "SELECT session_id, club_id, court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode::text AS payment_mode, "
     "custom_fee_per_head_minor, currency, "
     "CASE WHEN created_at > TIMESTAMPTZ '2026-11-19 12:00:00+00' THEN 'database now()' ELSE created_at::text END AS created_at, updated_at, revision::text AS revision "
     "FROM session_cost_estimates ORDER BY session_id"},
    {'name': 'session_shuttle_plan_lines', 'sql': "SELECT club_id, session_id, inventory_item_id, tubes, position, substring(id::text FROM 15 FOR 1) AS id_version "
     "FROM session_shuttle_plan_lines ORDER BY session_id, position, inventory_item_id"},
    {'name': 'session_payment_marks', 'sql': "SELECT session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id, device_id "
     "FROM session_payment_marks ORDER BY session_id, session_player_id"},
    {'name': 'player_notifications', 'sql': 'SELECT count(*)::text AS n FROM player_notifications'},
    {'name': 'admin_audit_events', 'sql': 'SELECT count(*)::text AS n FROM admin_audit_events'},
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
