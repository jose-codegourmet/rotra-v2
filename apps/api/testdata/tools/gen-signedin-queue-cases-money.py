# Cases of the Queue money reads with plays free (D-2026-11-27-01), slot transfers (#1011, #1013) and manual refunds (#1014), task 2.12.
# Included by gen-signedin-queue-cases.py (it runs this file with its names in scope), after every other group, so the cases of the
# earlier groups keep their place. Session 1 (Live Now, Smash, active) has Alice 11, Bob 12, Carla 13, Cory 14, Una 15 and Ned 18
# on the live roster (Erin 16 released, Dan 17 a no show), the amount due is ₱834.00 for six players. Session 9 (Next Friday, Smash,
# prepared) has Alice 21, Bob 22 and Una 23, a custom estimate and Nia on the waitlist.
SP = lambda n: f"a7000000-0000-4000-8000-0000000000{n:02d}"
OPEN = SESSION(1)
S9 = SESSION(9)
GINA_CP, FRANK_CP = "c6000000-0000-4000-8000-000000000031", "c6000000-0000-4000-8000-000000000032"
GINA, FRANK, DAN = "d4000000-0000-4000-8000-000000000007", "d4000000-0000-4000-8000-000000000006", "d4000000-0000-4000-8000-000000000004"
CLUB1 = CLUB[1]


def free_flag(*entries):
    return "UPDATE session_players SET is_free = true WHERE id IN (%s)" % ", ".join("'%s'" % SP(n) for n in entries)


def saved_player(cp, player, name):
    return ("INSERT INTO club_players (id, club_id, player_id, display_name, added_at, revision, updated_at) VALUES ('%s', '%s', '%s', '%s', TIMESTAMPTZ '2026-11-19 00:00:00+00', 1, now())" % (cp, CLUB1, player, name))


def entry(n, cp, player, name, like, session=OPEN):
    """A live roster entry that takes the slot of another entry (same place in the slot order)."""
    return ("INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, updated_at) "
            "SELECT '%s', club_id, session_id, '%s', '%s', '%s', present, present_changed_at, skill_level_id, confirmed_at, joined_at, now() FROM session_players WHERE id = '%s'" % (SP(n), cp, player, name, SP(like)))


def release(n, reason="transferred"):
    # An entry released before Start (its level was never locked), whatever state the session is in now.
    return "UPDATE session_players SET level_locked_at = NULL, assessment_id = NULL, released_at = TIMESTAMPTZ '2026-11-19 02:30:00+00', release_reason = '%s' WHERE id = '%s'" % (reason, SP(n))


def approved(tid, sender, sender_cp, sender_player, recipient_player, recipient_cp, recipient_entry, decided, due, paid, prior, waived, session=OPEN):
    return ("INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, recipient_club_player_id, "
            "recipient_session_player_id, recipient_was_waitlisted, status, requested_at, decided_at, amount_due_minor, amount_paid_minor, prior_waived_minor, waived_minor, currency) VALUES "
            "('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', false, 'approved', TIMESTAMPTZ '2026-11-19 02:10:00+00', TIMESTAMPTZ '%s', %s, %d, %d, %d, 'PHP')" % (
                tid, CLUB1, session, SP(sender), sender_cp, sender_player, recipient_player, recipient_cp, SP(recipient_entry), decided, due, paid, prior, waived))


BOB_CP, BOB = "c6000000-0000-4000-8000-000000000003", "d4000000-0000-4000-8000-000000000002"
T1, T2, T3 = ("a3d00000-0000-4000-8000-00000000000%d" % n for n in (1, 2, 3))

# plays free: the estimate counts the free roster entries, the reads leave out a free player who has no mark
free_two = scenario("money_free_two", free_flag(15, 18))
case("cost-club1-s1-free-two", f"/api/sessions/{OPEN}/cost", club=1, scenario=free_two)
case("payments-club1-s1-free-two", f"/api/sessions/{OPEN}/payments", club=1, scenario=free_two)
free_marked = scenario("money_free_with_a_mark", free_flag(11, 15))
case("cost-club1-s1-free-with-a-mark", f"/api/sessions/{OPEN}/cost", club=1, scenario=free_marked)
case("payments-club1-s1-free-with-a-mark", f"/api/sessions/{OPEN}/payments", club=1, scenario=free_marked)
all_free = scenario("money_all_free", free_flag(11, 12, 13, 14, 15, 18))
case("cost-club1-s1-all-free", f"/api/sessions/{OPEN}/cost", club=1, scenario=all_free)
case("payments-club1-s1-all-free", f"/api/sessions/{OPEN}/payments", club=1, scenario=all_free)
free_custom = scenario("money_free_custom", free_flag(15, 18), "UPDATE session_cost_estimates SET payment_mode = 'custom', custom_fee_per_head_minor = 100000 WHERE session_id = '%s'" % OPEN)
case("cost-club1-s1-free-custom", f"/api/sessions/{OPEN}/cost", club=1, scenario=free_custom)
case("payments-club1-s1-free-custom", f"/api/sessions/{OPEN}/payments", club=1, scenario=free_custom)
free_no_fee = scenario("money_free_no_estimate", free_flag(15), "DELETE FROM session_cost_estimates WHERE session_id = '%s'" % OPEN)
case("payments-club1-s1-free-no-estimate", f"/api/sessions/{OPEN}/payments", club=1, scenario=free_no_fee)
free_expected = scenario("money_free_prepared", "UPDATE session_players SET is_free = true WHERE id = '%s'" % SP(23))
case("cost-club1-s9-free", f"/api/sessions/{S9}/cost", club=1, scenario=free_expected)
case("payments-club1-s9-free", f"/api/sessions/{S9}/payments", club=1, scenario=free_expected)
free_released = scenario("money_free_released", free_flag(16, 17))
case("cost-club1-s1-free-off-roster", f"/api/sessions/{OPEN}/cost", club=1, scenario=free_released)

# slot transfers: Bob (paid ₱400 of ₱834) hands his slot to Gina, who is Paid in Full; Una (nothing paid) too
t_bob = [saved_player(GINA_CP, GINA, "Gina Claimed No Contact"), entry(90, GINA_CP, GINA, "Gina Claimed No Contact", 12), release(12),
         approved(T1, 12, BOB_CP, BOB, GINA, GINA_CP, 90, "2026-11-19 02:20:00+00", 83400, 40000, 0, 43400)]
transfer = scenario("money_transfer_paid_part", *t_bob)
case("payments-club1-s1-transfer-part-paid", f"/api/sessions/{OPEN}/payments", club=1, scenario=transfer)
case("cost-club1-s1-transfer-part-paid", f"/api/sessions/{OPEN}/cost", club=1, scenario=transfer)
transfer_cash = scenario("money_transfer_then_cash", *t_bob, "INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id) VALUES ('%s', '%s', '%s', 10000, 'PHP', TIMESTAMPTZ '2026-11-19 02:40:00+00', 'a3900000-0000-4000-8000-0000000000a1', '%s')" % (OPEN, SP(90), CLUB1, CLUB1))
case("payments-club1-s1-transfer-then-cash", f"/api/sessions/{OPEN}/payments", club=1, scenario=transfer_cash)
CARLA_CP, CARLA = "c6000000-0000-4000-8000-000000000004", "d4000000-0000-4000-8000-000000000003"
transfer_unpaid = scenario("money_transfer_unpaid", "DELETE FROM session_payment_marks WHERE session_player_id = '%s'" % SP(13),
                           saved_player(GINA_CP, GINA, "Gina Claimed No Contact"), entry(90, GINA_CP, GINA, "Gina Claimed No Contact", 13), release(13),
                           approved(T1, 13, CARLA_CP, CARLA, GINA, GINA_CP, 90, "2026-11-19 02:20:00+00", 83400, 0, 0, 83400))
case("payments-club1-s1-transfer-unpaid-slot", f"/api/sessions/{OPEN}/payments", club=1, scenario=transfer_unpaid)
chain = scenario("money_transfer_chain", *t_bob, saved_player(FRANK_CP, FRANK, "Frank No Id"), entry(91, FRANK_CP, FRANK, "Frank No Id", 90),
                 "UPDATE session_players SET level_locked_at = NULL, assessment_id = NULL, released_at = TIMESTAMPTZ '2026-11-19 02:50:00+00', release_reason = 'transferred' WHERE id = '%s'" % SP(90),
                 approved(T2, 90, GINA_CP, GINA, FRANK, FRANK_CP, 91, "2026-11-19 02:45:00+00", 83400, 40000, 43400, 0))
case("payments-club1-s1-transfer-chain", f"/api/sessions/{OPEN}/payments", club=1, scenario=chain)
transfer_fee_rises = scenario("money_transfer_fee_rose", *t_bob, "UPDATE session_cost_estimates SET court_fee_per_court_hour_minor = 30000 WHERE session_id = '%s'" % OPEN)
case("payments-club1-s1-transfer-fee-rose", f"/api/sessions/{OPEN}/payments", club=1, scenario=transfer_fee_rises)
case("cost-club1-s1-transfer-fee-rose", f"/api/sessions/{OPEN}/cost", club=1, scenario=transfer_fee_rises)

# manual refunds: a cancelled session keeps its roster and marks; the refund comes off the cash the club keeps
def mark9(n, amount, op):
    return ("INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id) VALUES "
            "('%s', '%s', '%s', %s, 'PHP', TIMESTAMPTZ '2026-11-19 01:00:00+00', 'a3900000-0000-4000-8000-0000000000%s', '%s')" % (S9, SP(n), CLUB1, amount, op, CLUB1))


cancelled = ["UPDATE queue_sessions SET state = 'cancelled', cancelled_at = TIMESTAMPTZ '2026-11-19 01:30:00+00', cancel_reason = 'Rain' WHERE id = '%s'" % S9]
refund = lambda rid, n, amount: ("INSERT INTO session_payment_refunds (id, club_id, session_id, session_player_id, reason, amount_minor, refunded_at) VALUES "
                                 "('%s', '%s', '%s', '%s', 'session_cancelled', %d, TIMESTAMPTZ '2026-11-19 02:00:00+00')" % (rid, CLUB1, S9, SP(n), amount))
refunded = scenario("money_refund_cancelled", mark9(21, 70000, "b1"), mark9(22, 30000, "b2"), *cancelled, refund("a3e00000-0000-4000-8000-000000000001", 21, 70000))
case("payments-club1-s9-cancelled-refunded", f"/api/sessions/{S9}/payments", club=1, scenario=refunded)
case("cost-club1-s9-cancelled-refunded", f"/api/sessions/{S9}/cost", club=1, scenario=refunded)
refunded_all = scenario("money_refund_everyone", mark9(21, 70000, "b1"), mark9(22, 30000, "b2"), *cancelled, refund("a3e00000-0000-4000-8000-000000000001", 21, 70000), refund("a3e00000-0000-4000-8000-000000000002", 22, 30000))
case("payments-club1-s9-cancelled-all-refunded", f"/api/sessions/{S9}/payments", club=1, scenario=refunded_all)
cancelled_marks = scenario("money_cancelled_with_marks", mark9(21, 70000, "b1"), mark9(22, 30000, "b2"), *cancelled)
case("payments-club1-s9-cancelled-not-refunded", f"/api/sessions/{S9}/payments", club=1, scenario=cancelled_marks)

# Requests: the pending slot transfers a Queue Master can decide (Next Friday is prepared)
def pending(tid, sender, scp, splayer, rplayer, link=False, claimed=False, session=S9):
    digest = ", decode('%s', 'hex')" % ("0a" * 32) if link else ", NULL"
    return ("INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, link_token_digest, claimed_at, status, requested_at) VALUES "
            "('%s', '%s', '%s', '%s', '%s', '%s', %s%s, %s, 'pending', TIMESTAMPTZ '2026-11-19 0%d:00:00+00')" % (
                tid, CLUB1, session, SP(sender), scp, splayer, "'%s'" % rplayer if rplayer else "NULL", digest, "TIMESTAMPTZ '2026-11-19 03:30:00+00'" if claimed else "NULL", 1 if link else 2))


ALICE_CP, ALICE = "c6000000-0000-4000-8000-000000000001", "d4000000-0000-4000-8000-000000000001"
nia_is_dan = "UPDATE club_players SET player_id = '%s' WHERE id = 'c6000000-0000-4000-8000-000000000025'" % DAN
pend = scenario("money_transfers_pending", pending(T1, 21, ALICE_CP, ALICE, GINA), mark9(21, 30000, "b1"))
case("requests-club1-s9-transfers-pending", f"/api/sessions/{S9}/requests", club=1, scenario=pend)
pend2 = scenario("money_transfers_pending_link", pending(T1, 21, ALICE_CP, ALICE, GINA), pending(T2, 22, BOB_CP, BOB, DAN, link=True, claimed=True), nia_is_dan, mark9(22, 83400, "b2"))
case("requests-club1-s9-transfers-pending-link-waitlisted", f"/api/sessions/{S9}/requests", club=1, scenario=pend2)
pend_unclaimed = scenario("money_transfers_unclaimed_link", pending(T1, 21, ALICE_CP, ALICE, None, link=True))
case("requests-club1-s9-unclaimed-link-not-listed", f"/api/sessions/{S9}/requests", club=1, scenario=pend_unclaimed)
# a transfer still pending in a session that started (Start expires them; a read lists none)
pend_active = scenario("money_transfers_after_start", pending(T1, 11, ALICE_CP, ALICE, GINA, session=OPEN))
case("requests-club1-s1-transfers-after-start", f"/api/sessions/{OPEN}/requests", club=1, scenario=pend_active)
pend_gone = scenario("money_transfers_sender_released", pending(T1, 21, ALICE_CP, ALICE, GINA), "UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-19 00:00:00+00', release_reason = 'removed' WHERE id = '%s'" % SP(21))
case("requests-club1-s9-transfer-sender-released", f"/api/sessions/{S9}/requests", club=1, scenario=pend_gone)
