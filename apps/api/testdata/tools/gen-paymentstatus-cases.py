#!/usr/bin/env python3
# Writes apps/api/internal/publicreads/testdata/paymentstatus.cases.json: the cases of GET /api/public-sessions/{slug}/payment-status (Share payment status,
# #1010; plays free D-2026-11-27-01; slot transfers #1013; manual refunds #1014), on the seed of the public session page (publicsession.seed.sql).
#   python3 apps/api/testdata/tools/gen-paymentstatus-cases.py apps/api/internal/publicreads/testdata
# Then run capture-paymentstatus.test.mjs to write paymentstatus.golden.json from the real Queue Route Handler. The roster of Open Night (club 1,
# prepared, 4 players per court, courts 1, 2 and 4 live) is entries 1 to 14 in order; 15 and 16 are released, 17 is a no show.
import json
import sys

OUT = sys.argv[1]
SESS = json.load(open(f"{OUT}/publicsession.cases.json"))
uid = lambda prefix, n: f"{prefix}000000-0000-4000-8000-{n:012x}"
CLUB1, SESS1, SESS2, SESS4 = uid("e1", 1), uid("e4", 1), uid("e4", 2), uid("e4", 4)
SP = lambda n: uid("e5", n)
# Open Night's roster entries by club player: two of them carry ids that put them out of the order of the counter (see gen-publicsession-fixtures.py)
EID = lambda cp: 0x41 if cp == 3 else 0x40 if cp == 4 else cp
ENTRY = lambda cp: SP(EID(cp))
CP = lambda n: uid("e3", n)
PLAYER = lambda n: uid("e2", n)
TR = lambda n: uid("e0", n)
FIXED = "TIMESTAMPTZ '2026-11-01 00:00:00+00'"


def estimate(session, club, mode, custom):
    return [("INSERT INTO session_cost_estimates (session_id, club_id, court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode, custom_fee_per_head_minor, updated_at) VALUES "
             f"('{session}', '{club}', 30000, 5000, '{mode}', {custom}, {FIXED})")]


def mark(session, club, entry, amount, op, at="2026-11-01 11:00:00+00"):
    return [("INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id) VALUES "
             f"('{session}', '{entry}', '{club}', {amount}, 'PHP', TIMESTAMPTZ '{at}', '{uid('b0', op)}', '{club}')")]


def sql(*parts):
    return [s for p in parts for s in p]


EST_CUSTOM = estimate(SESS1, CLUB1, 'custom', 90000)
EST_EVEN = estimate(SESS1, CLUB1, 'break_even', 'NULL')
MARKS = sql(mark(SESS1, CLUB1, SP(1), 90000, 1), mark(SESS1, CLUB1, SP(2), 40000, 2), mark(SESS1, CLUB1, ENTRY(3), 120000, 3), mark(SESS1, CLUB1, ENTRY(4), 'NULL', 4))
FREE = lambda *n: [f"UPDATE session_players SET is_free = true WHERE id IN ({', '.join(repr(SP(i)) for i in n)})"]
RELEASE_ALICE = ["UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-01 12:00:00+00', release_reason = 'transferred' WHERE id = '%s'" % SP(1)]
NEW_ENTRY = [("INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present_changed_at, skill_level_id, confirmed_at, joined_at, updated_at) VALUES "
              f"('{SP(90)}', '{CLUB1}', '{SESS1}', '{CP(19)}', NULL, 'Vic Visitor', {FIXED}, 3, TIMESTAMPTZ '2026-11-01 10:00:01+00', TIMESTAMPTZ '2026-11-01 10:00:01+00', {FIXED})")]
APPROVED = [("INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, status, requested_at, decided_at, "
             "recipient_club_player_id, recipient_session_player_id, recipient_was_waitlisted, amount_due_minor, amount_paid_minor, prior_waived_minor, waived_minor, currency) VALUES "
             f"('{TR(1)}', '{CLUB1}', '{SESS1}', '{SP(1)}', '{CP(1)}', '{PLAYER(1)}', '{PLAYER(6)}', 'approved', TIMESTAMPTZ '2026-11-01 11:30:00+00', TIMESTAMPTZ '2026-11-01 12:00:00+00', "
             f"'{CP(19)}', '{SP(90)}', false, 90000, 50000, 0, 40000, 'PHP')")]
REFUND = [("INSERT INTO session_payment_refunds (id, club_id, session_id, session_player_id, reason, amount_minor, refunded_at) VALUES "
           f"('{uid('e8', 1)}', '{CLUB1}', '{SESS1}', '{SP(2)}', 'session_cancelled', 40000, TIMESTAMPTZ '2026-11-01 13:00:00+00')")]

reset = list(SESS['reset']) + [
    "DELETE FROM session_payment_refunds WHERE session_id::text LIKE 'e4000000-%'",
    "DELETE FROM session_slot_transfers WHERE session_id::text LIKE 'e4000000-%'",
    "DELETE FROM session_payment_marks WHERE session_id::text LIKE 'e4000000-%'",
    "DELETE FROM session_players WHERE id = '%s'" % SP(90),
    "UPDATE session_players SET is_free = false WHERE id::text LIKE 'e5000000-%'",
    # internal/rules/collate does not order an emoji the way ICU does (its documented limit), so no case reads one: the emoji guest is renamed
    "UPDATE session_players SET name_snapshot = 'Smile Lee' WHERE id = '%s'" % SP(6),
    "UPDATE session_players SET released_at = NULL, release_reason = NULL WHERE session_id = '%s' AND id NOT IN ('%s', '%s', '%s')" % (SESS1, SP(15), SP(16), SP(17)),
]
scen = {'base': []}
cases = []


def case(name, slug, *statements):
    scen[name] = sql(*statements) if statements else []
    cases.append({'name': name, 'scenario': name, 'path': f'/api/public-sessions/{slug}/payment-status'})


case('open_night_no_estimate_no_marks', 'open-night')
case('open_night_no_estimate_with_marks', 'open-night', MARKS)
case('open_night_custom_fee_with_marks', 'open-night', EST_CUSTOM, MARKS)
case('open_night_break_even_with_marks', 'open-night', EST_EVEN, MARKS)
case('open_night_a_marks_of_a_released_and_a_no_show_are_not_listed', 'open-night', EST_CUSTOM, mark(SESS1, CLUB1, SP(15), 90000, 5), mark(SESS1, CLUB1, SP(17), 90000, 6))
case('open_night_free_players_are_left_out', 'open-night', EST_CUSTOM, MARKS, FREE(EID(5), EID(6)))
case('open_night_a_free_player_with_a_mark_is_listed', 'open-night', EST_CUSTOM, MARKS, FREE(EID(1), EID(5)))
case('open_night_break_even_leaves_free_players_out_of_the_split', 'open-night', EST_EVEN, MARKS, FREE(EID(5), EID(6), EID(7)))
case('open_night_everyone_free', 'open-night', EST_EVEN, FREE(*[EID(n) for n in range(1, 15)]))
case('open_night_a_slot_that_came_by_transfer_counts_its_carried_cash', 'open-night', EST_CUSTOM, mark(SESS1, CLUB1, SP(1), 50000, 1), RELEASE_ALICE, NEW_ENTRY, APPROVED)
case('open_night_a_slot_that_came_by_transfer_adds_the_holders_own_cash', 'open-night', EST_CUSTOM, mark(SESS1, CLUB1, SP(1), 50000, 1), RELEASE_ALICE, NEW_ENTRY, APPROVED, mark(SESS1, CLUB1, SP(90), 10000, 7, "2026-11-01 12:30:00+00"))
case('open_night_a_slot_that_came_by_transfer_with_nothing_paid', 'open-night', EST_CUSTOM, RELEASE_ALICE, NEW_ENTRY, APPROVED)
case('open_night_a_refund_comes_off_the_cash_kept', 'open-night', EST_CUSTOM, MARKS, REFUND)
case('open_night_a_refund_without_a_fee_set', 'open-night', MARKS, REFUND)
case('open_night_a_refunded_legacy_mark', 'open-night', EST_CUSTOM, MARKS, ["INSERT INTO session_payment_refunds (id, club_id, session_id, session_player_id, reason, amount_minor, refunded_at) VALUES "
                                                                       f"('{uid('e8', 2)}', '{CLUB1}', '{SESS1}', '{ENTRY(4)}', 'session_cancelled', 90000, TIMESTAMPTZ '2026-11-01 13:00:00+00')"])
case('open_night_a_record_with_no_one_on_the_roster', 'open-night', EST_CUSTOM, ["UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-03 00:00:00+00', release_reason = 'removed' WHERE session_id = '%s' AND released_at IS NULL AND no_show_at IS NULL" % SESS1])
case('open_night_the_estimate_follows_the_slots_when_the_roster_is_empty', 'open-night', EST_EVEN, ["UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-03 00:00:00+00', release_reason = 'removed' WHERE session_id = '%s' AND released_at IS NULL AND no_show_at IS NULL" % SESS1])
case('active_night', 'active-night', estimate(SESS2, uid('e1', 2), 'custom', 50000), mark(SESS2, uid('e1', 2), SP(18), 50000, 8), mark(SESS2, uid('e1', 2), SP(19), 'NULL', 9))
case('active_night_no_marks', 'active-night')
case('done_and_published', 'done-published')
case('done_and_published_with_marks', 'done-published', estimate(SESS4, uid('e1', 14), 'custom', 30000), mark(SESS4, uid('e1', 14), SP(24), 30000, 10), mark(SESS4, uid('e1', 14), SP(25), 5000, 11))
case('cancelled_night_reveals_nothing', 'cancelled-night')
case('invalid_night_reveals_nothing', 'invalid-night')
case('empty_session', 'empty-session')
case('done_page_removed_is_not_found', 'done-deleted-page')
case('unknown_slug_is_not_found', 'no-such-session')
case('uppercase_slug_is_not_found', 'OPEN-NIGHT')
case('slug_too_short_is_not_found', 'abc')
case('slug_with_a_quote_is_not_found', 'x%27%3B%20DROP')

json.dump({'reset': reset, 'scenarios': scen, 'cases': cases}, open(f"{OUT}/paymentstatus.cases.json", 'w'), indent=1, ensure_ascii=False)
open(f"{OUT}/paymentstatus.cases.json", 'a').write('\n')
print(len(cases), 'cases')
