# Generates the cases files of the Admin club writes group: ranking.cases.json, licenses.cases.json,
# clubname.cases.json and clubs.cases.json in apps/api/internal/adminwrites/testdata. The cases are data; the golden
# files next to them are captured from the TypeScript by capture-writes-clubs.test.mjs, never generated here.
# Edit this file, run `python3 apps/api/testdata/tools/gen-writes-admin-clubs-cases.py`, then rerun the capture.
import json
import os
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../internal/adminwrites/testdata")
OWNER = "ad100000-0000-4000-8000-000000000001"
SECOND = "ad100000-0000-4000-8000-000000000002"
FORMER = "ad100000-0000-4000-8000-000000000003"
UNKNOWN = "ad100000-0000-4000-8000-0000000000ff"
NOW = "2026-11-19T04:00:00.000Z"
cmd = lambda n: "c2000000-0000-4000-8000-%012d" % n


class Group:
    def __init__(self, name, snapshot, scenarios=None, now=NOW):
        self.name, self.snapshot, self.now = name, snapshot, now
        self.scenarios = {"base": []}
        self.scenarios.update(scenarios or {})
        self.cases = []

    def case(self, name, steps, scenario="base", redact=None, now=None):
        c = {"name": name, "scenario": scenario, "steps": steps}
        if redact:
            c["redact"] = redact
        if now:
            c["now"] = now
        assert name not in [x["name"] for x in self.cases], name
        self.cases.append(c)

    def write(self):
        doc = {"now": self.now, "app": "admin", "seed": "clubs.seed.sql", "scenarios": self.scenarios,
               "snapshot": self.snapshot, "cases": self.cases}
        with open(os.path.join(OUT, self.name + ".cases.json"), "w") as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(self.name, len(self.cases), "cases")


def step(method, path, body=None, who=OWNER, raw=None, **kw):
    s = {"method": method, "path": path, "who": who}
    if raw is not None:
        s["rawBody"] = raw
    elif body is not None:
        s["body"] = body
    s.update(kw)
    return s


AUDIT_COLS = "id, actor_admin_id, action, target_type, target_id, source_command_id, occurred_at, metadata"


def audit_spec(extra="", redact=("id",)):
    return {"name": "admin_audit_events",
            "sql": "SELECT " + AUDIT_COLS + extra + " FROM admin_audit_events ORDER BY action, target_type, source_command_id NULLS FIRST, occurred_at, metadata::text, target_id",
            "redact": list(redact)}


NOTIFS = {"name": "player_notifications", "sql": "SELECT id FROM player_notifications ORDER BY id", "redact": []}

# =====================================================================================================================
# ranking settings: POST /api/ranking-settings
# =====================================================================================================================
def ranking():
    g = Group("ranking", [
        {"name": "ranking_policy_versions",
         "sql": "SELECT version, effective_at, assessment_weight_bp, performance_weight_bp, recent_standard_match_threshold, algorithm_version, created_by_admin_id, change_note, created_at FROM ranking_policy_versions ORDER BY version",
         "redact": []},
        audit_spec(", EXISTS (SELECT 1 FROM ranking_policy_versions v WHERE v.id::text = target_id) AS target_is_a_version", ("id", "target_id")),
        NOTIFS,
    ], {"empty": ["DELETE FROM ranking_policy_versions"]})
    P = "/api/ranking-settings"

    def post(body=None, who=OWNER, raw=None, **kw):
        return step("POST", P, body, who, raw, **kw)

    def new(n=1, **over):
        b = {"commandId": cmd(n), "expectedVersion": 2, "assessmentWeightBp": 7000, "performanceWeightBp": 3000,
             "recentStandardMatchThreshold": 10, "changeNote": "Back to the original split"}
        b.update(over)
        return b

    def without(b, *keys):
        return {k: v for k, v in b.items() if k not in keys}

    R = ["version.id"]
    # ---- guards ----
    g.case("guard_no_session", [post(new(), who=None)])
    g.case("guard_former_admin", [post(new(), who=FORMER, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_unknown_subject", [post(new(), who=UNKNOWN, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_beats_a_bad_body", [post(raw="not json", who=None)])
    # ---- success ----
    g.case("saves_the_next_version", [post(new(), redact=R)])
    g.case("by_the_second_admin", [post(new(2), who=SECOND, redact=R)])
    g.case("carries_the_algorithm_forward", [post(new(3), redact=R)])
    g.case("trims_the_change_note", [post(new(4, changeNote="  \t Tighten the weights \n"), redact=R)])
    g.case("empty_change_note_is_none", [post(new(5, changeNote=""), redact=R)])
    g.case("blank_change_note_is_none", [post(new(6, changeNote="   ﻿ "), redact=R)])
    g.case("missing_change_note_is_none", [post(without(new(7), "changeNote"), redact=R)])
    g.case("non_string_change_note_is_none", [post(new(8, changeNote=12), redact=R)])
    g.case("unicode_change_note_kept", [post(new(9, changeNote="Mas mataas na timbang – café \U0001F3F8"), redact=R)])
    g.case("ignores_unknown_fields", [post(new(10, effectiveAt="2030-01-01T00:00:00Z", algorithmVersion="hacked", createdByAdminId="x", version=9, performanceWeightPct=1), redact=R)])
    g.case("assessment_zero", [post(new(11, assessmentWeightBp=0, performanceWeightBp=10000), redact=R)])
    g.case("assessment_all", [post(new(12, assessmentWeightBp=10000, performanceWeightBp=0), redact=R)])
    g.case("threshold_one", [post(new(13, recentStandardMatchThreshold=1), redact=R)])
    g.case("threshold_forty", [post(new(14, recentStandardMatchThreshold=40), redact=R)])
    g.case("numbers_written_as_floats", [post(raw='{"commandId":"%s","expectedVersion":2.0,"assessmentWeightBp":7e3,"performanceWeightBp":3000.0,"recentStandardMatchThreshold":1E1}' % cmd(15), redact=R)])
    g.case("numbers_one_ulp_from_whole", [post(raw='{"commandId":"%s","expectedVersion":2,"assessmentWeightBp":7000.0000000000001,"performanceWeightBp":3000,"recentStandardMatchThreshold":10}' % cmd(16), redact=R)])
    g.case("first_version_of_an_empty_table", [post(new(17, expectedVersion=None), redact=R)], scenario="empty")
    g.case("first_version_expected_missing", [post(without(new(18), "expectedVersion"), redact=R)], scenario="empty")
    g.case("first_version_expected_zero_conflicts", [post(new(19, expectedVersion=0))], scenario="empty")
    g.case("first_version_expected_one_conflicts", [post(new(20, expectedVersion=1))], scenario="empty")
    g.case("empty_table_carries_unapproved", [post(new(21, expectedVersion=None), redact=R)], scenario="empty")
    # ---- the body ----
    g.case("body_not_json", [post(raw="not json")])
    g.case("body_empty", [post(raw="")])
    g.case("body_array", [post(raw="[1]")])
    g.case("body_null", [post(raw="null")])
    g.case("body_string", [post(raw='"x"')])
    g.case("body_trailing_text", [post(raw='{"a":1} x')])
    g.case("body_with_a_byte_order_mark", [post(raw="﻿" + json.dumps(new(22)), redact=R)])
    g.case("body_empty_object_is_invalid", [post({})])
    # ---- the rules (invalid, fields keyed like the form) ----
    g.case("assessment_missing", [post(without(new(23), "assessmentWeightBp"))])
    g.case("assessment_string", [post(new(24, assessmentWeightBp="7000"))])
    g.case("assessment_null", [post(new(25, assessmentWeightBp=None))])
    g.case("assessment_negative", [post(new(26, assessmentWeightBp=-1, performanceWeightBp=10001))])
    g.case("assessment_above_ten_thousand", [post(new(27, assessmentWeightBp=10001, performanceWeightBp=-1))])
    g.case("assessment_fraction", [post(new(28, assessmentWeightBp=7000.5))])
    g.case("assessment_huge", [post(new(29, assessmentWeightBp=1e300))])
    g.case("assessment_overflows_a_double", [post(raw='{"commandId":"%s","expectedVersion":2,"assessmentWeightBp":1e999,"performanceWeightBp":3000,"recentStandardMatchThreshold":10}' % cmd(30))])
    g.case("performance_missing_is_invalid", [post(without(new(31), "performanceWeightBp"))])
    g.case("performance_string", [post(new(32, performanceWeightBp="3000"))])
    g.case("performance_negative", [post(new(33, performanceWeightBp=-3000, assessmentWeightBp=13000))])
    g.case("performance_fraction", [post(new(34, performanceWeightBp=2999.5))])
    g.case("total_short", [post(new(35, performanceWeightBp=2999))])
    g.case("total_short_by_a_hundredth_of_a_point", [post(new(36, assessmentWeightBp=3333, performanceWeightBp=6666))])
    g.case("total_over", [post(new(37, performanceWeightBp=3001))])
    g.case("total_far_under", [post(new(38, assessmentWeightBp=5000, performanceWeightBp=4000))])
    g.case("total_zero", [post(new(39, assessmentWeightBp=0, performanceWeightBp=0))])
    g.case("total_twenty_thousand", [post(new(40, assessmentWeightBp=10000, performanceWeightBp=10000))])
    g.case("total_tiny", [post(new(41, assessmentWeightBp=1, performanceWeightBp=1))])
    g.case("total_with_odd_float_text", [post(new(42, assessmentWeightBp=1234, performanceWeightBp=5678))])
    g.case("total_not_shown_when_a_weight_is_invalid", [post(new(43, assessmentWeightBp=-5, performanceWeightBp=3000))])
    g.case("threshold_missing", [post(without(new(44), "recentStandardMatchThreshold"))])
    g.case("threshold_string", [post(new(45, recentStandardMatchThreshold="10"))])
    g.case("threshold_zero", [post(new(46, recentStandardMatchThreshold=0))])
    g.case("threshold_forty_one", [post(new(47, recentStandardMatchThreshold=41))])
    g.case("threshold_fraction", [post(new(48, recentStandardMatchThreshold=10.5))])
    g.case("threshold_negative", [post(new(49, recentStandardMatchThreshold=-3))])
    g.case("every_field_wrong_at_once", [post(new(50, assessmentWeightBp="a", performanceWeightBp=None, recentStandardMatchThreshold=99))])
    g.case("weights_and_threshold_wrong", [post(new(51, assessmentWeightBp=9000, performanceWeightBp=9000, recentStandardMatchThreshold=0))])
    g.case("invalid_comes_before_a_stale_version", [post(new(52, expectedVersion=1, recentStandardMatchThreshold=0))])
    g.case("invalid_comes_before_the_command", [post(new(53, recentStandardMatchThreshold=0, commandId="not-a-uuid"))])
    # ---- the expected version ----
    g.case("stale_version", [post(new(54, expectedVersion=1))])
    g.case("future_version", [post(new(55, expectedVersion=3))])
    g.case("version_missing_conflicts", [post(without(new(56), "expectedVersion"))])
    g.case("version_null_conflicts", [post(new(57, expectedVersion=None))])
    g.case("version_string_conflicts", [post(new(58, expectedVersion="2"))])
    g.case("version_fraction_conflicts", [post(new(59, expectedVersion=2.5))])
    g.case("version_negative_conflicts", [post(new(60, expectedVersion=-1))])
    g.case("version_bool_conflicts", [post(new(61, expectedVersion=True))])
    g.case("stale_version_writes_nothing_then_a_fresh_save_works", [post(new(62, expectedVersion=1)), post(new(63), redact=R)])
    g.case("two_saves_in_a_row", [post(new(64), redact=R), post(new(65, expectedVersion=3, assessmentWeightBp=5000, performanceWeightBp=5000, changeNote="Even split"), redact=R)])
    g.case("second_save_with_the_old_version_conflicts", [post(new(66), redact=R), post(new(67))])
    # ---- the command ----
    g.case("retry_returns_the_same_version", [post(new(68), redact=R), post(new(68), redact=R)])
    g.case("retry_with_other_values_returns_the_first", [post(new(69), redact=R), post(new(69, assessmentWeightBp=5000, performanceWeightBp=5000, changeNote="Other"), redact=R)])
    g.case("retry_after_another_save_still_returns_the_first", [post(new(70), redact=R), post(new(71, expectedVersion=3, assessmentWeightBp=5000, performanceWeightBp=5000), redact=R), post(new(70), redact=R)])
    g.case("retry_by_the_other_admin", [post(new(72), redact=R), post(new(72), who=SECOND, redact=R)])
    g.case("retry_with_the_stale_version_is_still_answered", [post(new(73), redact=R), post(new(73, expectedVersion=1), redact=R)])
    g.case("retry_with_an_upper_case_command", [post(new(74), redact=R), post(new(74, commandId=cmd(74).upper()), redact=R)])
    g.case("retry_with_an_invalid_body_is_invalid", [post(new(75), redact=R), post(new(75, recentStandardMatchThreshold=0))])
    g.case("command_of_a_flag_event_is_unexpected", [post(new(76, commandId="c0000000-0000-4000-8000-0000000000a1"), allow500=True)])
    g.case("command_of_a_club_event_is_unexpected", [post(new(77, commandId="c0000000-0000-4000-8000-0000000000b2"), allow500=True)])
    g.case("command_missing", [post(without(new(78), "commandId"), allow500=True, goExpects={"status": 422, "code": "invalid"})])
    g.case("command_not_a_uuid", [post(new(79, commandId="not-a-uuid"), allow500=True, goExpects={"status": 422, "code": "invalid"})])
    g.case("command_a_number", [post(new(80, commandId=5), allow500=True, goExpects={"status": 422, "code": "invalid"})])
    g.case("command_in_braces_is_accepted", [post(new(81, commandId="{" + cmd(81) + "}"), redact=R)])
    # ---- races ----
    # Two saves of one command at once are not a case here: whether the second finds the first's event (201, the
    # same version) or loses the version check (409) depends on timing in the TypeScript. internal/adminwrites
    # ranking_race_test.go tests what always holds.
    g.case("race_two_saves_two_commands", [{"parallel": [post(new(83), redact=R), post(new(84), who=SECOND, redact=R)], "redact": R + ["version.createdByDisplayName"]}],
           redact={"admin_audit_events": ["source_command_id", "actor_admin_id"], "ranking_policy_versions": ["created_by_admin_id"]})
    g.write()


# =====================================================================================================================
# licenses: POST /api/clubs/{clubId}/licenses
# =====================================================================================================================
C1, C2, C3, C4, C5, C6, C7 = ("d1000000-0000-4000-8000-00000000000%d" % n for n in range(1, 8))
NOTFOUND = "d1000000-0000-4000-8000-0000000000ff"


def licenses():
    g = Group("licenses", [
        {"name": "club_license_terms",
         "sql": "SELECT c.name AS club, t.payment_reference, t.plan::text AS plan, t.starts_at, t.ends_at, t.activated_by_admin_id, t.activated_at, t.source_command_id, t.pricing_at_activation::text AS pricing_at_activation, t.paid_on::text AS paid_on, t.amount_minor, t.currency, t.notes, t.created_at FROM club_license_terms t JOIN clubs c ON c.id = t.club_id ORDER BY t.payment_reference, t.source_command_id",
         "redact": []},
        {"name": "club_entitlements",
         "sql": "SELECT c.name AS club, e.effective_access_ends_at, e.refreshed_at, e.updated_at, e.revision::text AS revision, (SELECT t.payment_reference FROM club_license_terms t WHERE t.id = e.effective_term_id) AS effective_term_reference, e.effective_term_id IS NULL AS no_effective_term, (SELECT x.expired_at FROM club_expiry_cycles x WHERE x.id = e.current_expiry_cycle_id) AS cycle_expired_at, e.current_expiry_cycle_id IS NOT NULL AS has_cycle FROM club_entitlements e JOIN clubs c ON c.id = e.club_id ORDER BY c.name",
         "redact": []},
        {"name": "club_expiry_cycles",
         "sql": "SELECT c.name AS club, x.expired_at, x.delete_public_pages_after, x.cancelled_at, (SELECT t.payment_reference FROM club_license_terms t WHERE t.id = x.cancellation_term_id) AS cancellation_term_reference, x.state::text AS state, x.created_at, x.updated_at, x.revision::text AS revision FROM club_expiry_cycles x JOIN clubs c ON c.id = x.club_id ORDER BY c.name, x.expired_at",
         "redact": []},
        {"name": "session_publications",
         "sql": "SELECT p.public_key, p.state::text AS state, p.revision::text AS revision, p.updated_at, (SELECT x.expired_at FROM club_expiry_cycles x WHERE x.id = p.expiry_cycle_id) AS retained_under_cycle_expired_at, p.expiry_cycle_id IS NOT NULL AS retained FROM session_publications p ORDER BY p.public_key",
         "redact": []},
        {"name": "clubs",
         "sql": "SELECT name, license_pricing::text AS license_pricing, license_monthly_minor, license_yearly_minor, currency, revision::text AS revision, updated_at FROM clubs ORDER BY name",
         "redact": []},
        {"name": "admin_audit_events",
         "sql": "SELECT a.id, a.actor_admin_id, a.action, a.target_type, a.target_id, a.source_command_id, a.occurred_at, a.metadata - 'termId' AS metadata, (SELECT t.payment_reference FROM club_license_terms t WHERE t.id::text = a.metadata ->> 'termId') AS term_reference FROM admin_audit_events a ORDER BY a.action, a.target_type, a.source_command_id NULLS FIRST, a.occurred_at, a.metadata::text, a.target_id",
         "redact": ["id"]},
        NOTIFS,
    ], {"reference_gap": ["UPDATE club_license_terms SET payment_reference = 'LIC-0005' WHERE payment_reference = 'LIC-0003'"]})

    def path(club):
        return "/api/clubs/%s/licenses" % club

    def post(club, body=None, who=OWNER, raw=None, **kw):
        return step("POST", path(club), body, who, raw, **kw)

    def new(n=1, **over):
        b = {"sourceCommandId": cmd(n), "plan": "Monthly", "amountMinor": 180000, "paidOn": "2026-11-19", "reference": "GCash 0001"}
        b.update(over)
        return b

    def without(b, *keys):
        return {k: v for k, v in b.items() if k not in keys}

    R = ["term.id"]
    # ---- guards ----
    g.case("guard_no_session", [post(C4, new(), who=None)])
    g.case("guard_former_admin", [post(C4, new(), who=FORMER, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_unknown_subject", [post(C4, new(), who=UNKNOWN, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_beats_a_bad_body", [post(C4, raw="not json", who=None)])
    # ---- first licenses ----
    g.case("activates_a_never_licensed_club", [post(C4, new(), redact=R)])
    g.case("activates_a_club_with_no_entitlement_row", [post(C5, new(2, amountMinor=150000), redact=R)])
    g.case("activates_yearly", [post(C4, new(3, plan="Yearly", amountMinor=1800000), redact=R)])
    g.case("activates_by_the_second_admin", [post(C4, new(4), who=SECOND, redact=R)])
    g.case("custom_amount_is_kept", [post(C4, new(5, amountMinor=99999), redact=R)])
    g.case("amount_of_one_centavo", [post(C4, new(6, amountMinor=1), redact=R)])
    g.case("amount_as_a_float_written_whole", [post(C4, raw='{"sourceCommandId":"%s","plan":"Monthly","amountMinor":180000.0,"paidOn":"2026-11-19"}' % cmd(7), redact=R)])
    g.case("largest_amount_a_column_holds", [post(C4, new(8, amountMinor=2147483647), redact=R)])
    g.case("amount_beyond_the_column_is_unexpected", [post(C4, new(9, amountMinor=2147483648), allow500=True)])
    g.case("amount_beyond_a_safe_integer_is_invalid", [post(C4, new(10, amountMinor=9007199254740992))])
    g.case("largest_safe_integer_amount_is_unexpected", [post(C4, new(11, amountMinor=9007199254740991), allow500=True)])
    g.case("amount_zero_for_a_paid_club_is_unexpected", [post(C4, new(12, amountMinor=0), allow500=True)])
    g.case("amount_missing_is_invalid_for_a_paid_club", [post(C4, without(new(13), "amountMinor"))])
    g.case("amount_null_is_invalid", [post(C4, new(14, amountMinor=None))])
    g.case("amount_string_is_invalid", [post(C4, new(15, amountMinor="1800"))])
    g.case("amount_negative_is_invalid", [post(C4, new(16, amountMinor=-1))])
    g.case("amount_fraction_is_invalid", [post(C4, new(17, amountMinor=1800.5))])
    g.case("amount_overflowing_a_double_is_invalid", [post(C4, raw='{"sourceCommandId":"%s","plan":"Monthly","amountMinor":1e999,"paidOn":"2026-11-19"}' % cmd(18))])
    # ---- paid on ----
    g.case("paid_on_missing_is_invalid", [post(C4, without(new(20), "paidOn"))])
    g.case("paid_on_null_is_invalid", [post(C4, new(21, paidOn=None))])
    g.case("paid_on_empty_is_invalid", [post(C4, new(22, paidOn=""))])
    g.case("paid_on_a_number_is_invalid", [post(C4, new(23, paidOn=20261119))])
    GO422 = {"status": 422, "code": "invalid"}
    # (name, value, what the TypeScript did): "ok" is a term, "crash" is a 500 that Go answers 422 invalid. A date
    # string the legacy JavaScript parser accepts but ISO does not ("2026-11-19" followed by a NUL) is not here: see
    # internal/rules/license for the parser Go has and what it refuses.
    for i, (name, value, kind) in enumerate([
        ("far_future", "2099-12-31", "ok"), ("year_one", "0001-01-01", "ok"), ("a_leap_day", "2028-02-29", "ok"),
        ("a_rollover_date", "2026-02-30", "ok"), ("a_leap_day_in_a_common_year", "2027-02-29", "ok"),
        ("day_thirty_one_of_a_short_month", "2026-04-31", "ok"), ("an_expanded_year", "+002026-11-19", "ok"),
        ("garbage", "yesterday", "crash"), ("with_a_time", "2026-11-19T10:00:00", "crash"), ("one_digit_parts", "2026-1-5", "crash"),
        ("without_dashes", "20261119", "crash"), ("with_a_leading_space", " 2026-11-19", "crash"), ("with_a_trailing_space", "2026-11-19 ", "crash"),
        ("month_zero", "2026-00-10", "crash"), ("day_thirty_two", "2026-01-32", "crash"), ("day_zero", "2026-01-00", "crash"),
        ("month_thirteen", "2026-13-01", "crash"), ("year_zero", "0000-01-01", "crash"), ("negative_expanded_year", "-000001-01-01", "crash"),
        ("negative_zero_year", "-000000-01-01", "crash"), ("expanded_year_above_ten_thousand", "+012026-11-19", "crash"),
        ("last_year_a_date_has", "+275760-09-13", "crash"), ("one_day_after_the_last_date", "+275760-09-14", "crash"),
        ("expanded_year_too_short", "+02026-11-19", "crash"), ("two_digit_year", "26-11-19", "crash"), ("slashes", "2026/11/19", "crash"),
        ("lower_case_t_text", "2026-11-19t", "crash"), ("with_a_zone", "2026-11-19Z", "crash"), ("full_width_digits", "\uff12\uff10\uff12\uff16-11-19", "crash"),
        ("eastern_arabic_digits", "\u0662\u0660\u0662\u0666-11-19", "crash"), ("with_a_newline", "2026-11-19\n", "crash"),
    ]):
        extra = {"redact": R} if kind == "ok" else {"allow500": True, "goExpects": GO422}
        g.case("paid_on_" + name, [post(C4, new(200 + i, paidOn=value), **extra)])
    # ---- plan ----
    g.case("plan_lower_case_is_invalid", [post(C4, new(40, plan="monthly"))])
    g.case("plan_yearly_lower_case_is_invalid", [post(C4, new(41, plan="yearly"))])
    g.case("plan_missing_is_invalid", [post(C4, without(new(42), "plan"))])
    g.case("plan_null_is_invalid", [post(C4, new(43, plan=None))])
    g.case("plan_other_text_is_invalid", [post(C4, new(44, plan="Weekly"))])
    g.case("plan_with_a_space_is_invalid", [post(C4, new(45, plan="Monthly "))])
    # ---- reference (the notes) ----
    g.case("reference_is_trimmed", [post(C4, new(50, reference="  \t GCash 12345 \n"), redact=R)])
    g.case("reference_empty_is_none", [post(C4, new(51, reference=""), redact=R)])
    g.case("reference_blank_is_none", [post(C4, new(52, reference=" \u00a0\u2003\ufeff "), redact=R)])
    g.case("reference_missing_is_none", [post(C4, without(new(53), "reference"), redact=R)])
    g.case("reference_a_number_is_none", [post(C4, new(54, reference=12), redact=R)])
    g.case("reference_unicode_kept", [post(C4, new(55, reference="Bayad sa caf\u00e9 \U0001F3F8"), redact=R)])
    g.case("ignores_unknown_fields", [post(C4, new(56, clubId=C1, price=1, activatedByAdminId="x", endsAt="2030-01-01", paymentReference="LIC-9999", currency="USD"), redact=R)])
    # ---- the start is computed, never sent ----
    g.case("starts_on_is_refused", [post(C4, new(60, startsOn="2026-12-01"))])
    g.case("starts_at_is_refused", [post(C4, new(61, startsAt="2026-12-01T00:00:00Z"))])
    g.case("starts_on_null_is_refused", [post(C4, new(62, startsOn=None))])
    g.case("starts_at_null_is_refused", [post(C4, new(63, startsAt=None))])
    g.case("starts_on_empty_is_refused", [post(C4, new(64, startsOn=""))])
    g.case("starts_on_is_refused_before_the_plan", [post(C4, new(65, startsOn="x", plan="nope"))])
    g.case("starts_on_is_refused_before_the_club", [post(NOTFOUND, new(66, startsOn="x"))])
    g.case("plan_is_checked_before_the_club", [post(NOTFOUND, new(67, plan="nope"))])
    # ---- the club ----
    g.case("unknown_club", [post(NOTFOUND, new(70))])
    g.case("club_id_not_a_uuid_is_unexpected", [post("abc", new(71), allow500=True, goExpects={"status": 404, "code": "not_found"})])
    g.case("club_id_of_thirty_six_dashes_is_unexpected", [post("-" * 36, new(72), allow500=True, goExpects={"status": 404, "code": "not_found"})])
    g.case("club_id_in_upper_case", [post(C4.upper().replace("D1000000", "D1000000"), new(73), redact=R)])
    g.case("the_club_is_checked_before_the_command", [post(NOTFOUND, new(74, sourceCommandId="not-a-uuid"))])
    # ---- renewal stacks after the current term ----
    g.case("renews_after_the_current_term", [post(C1, new(80), redact=R)])
    g.case("renews_yearly_after_the_current_term", [post(C1, new(81, plan="Yearly", amountMinor=1500000), redact=R)])
    g.case("renewal_keeps_the_club_price", [post(C1, new(82, amountMinor=1), redact=R)])
    g.case("renewal_after_a_renewal", [post(C1, new(83), redact=R), post(C1, new(84, plan="Yearly", amountMinor=1500000), redact=R)])
    g.case("two_activations_of_a_new_club_stack", [post(C4, new(85), redact=R), post(C4, new(86), redact=R)])
    g.case("renews_when_the_access_end_has_microseconds", [post(C7, new(87, amountMinor=150000), redact=R)])
    # ---- a lapsed club: the running cycle is cancelled ----
    g.case("activates_a_lapsed_club_and_cancels_its_cycle", [post(C3, new(90, amountMinor=120000), redact=R)])
    g.case("activates_a_lapsed_club_yearly", [post(C3, new(91, plan="Yearly", amountMinor=1200000), redact=R)])
    # ---- free clubs ----
    g.case("free_club_records_zero", [post(C2, new(95), redact=R)])
    g.case("free_club_ignores_amount_and_paid_on", [post(C2, new(96, amountMinor="x", paidOn="nope"), redact=R)])
    g.case("free_club_with_no_amount_or_date", [post(C2, {"sourceCommandId": cmd(97), "plan": "Yearly"}, redact=R)])
    g.case("free_club_keeps_its_kept_price", [post(C2, new(98), redact=R), post(C2, new(99), redact=R)])
    # ---- a projection that disagrees with the terms ----
    g.case("stale_projection_starts_a_cycle_and_retains_the_pages", [post(C6, new(100), redact=R)])
    # ---- the command ----
    g.case("retry_returns_the_same_term", [post(C4, new(110), redact=R), post(C4, new(110), redact=R)])
    g.case("retry_with_other_values_returns_the_first", [post(C4, new(111), redact=R), post(C4, new(111, plan="Yearly", amountMinor=5, paidOn="2020-01-01", reference="other"), redact=R)])
    g.case("retry_with_an_invalid_body_is_invalid", [post(C4, new(112), redact=R), post(C4, new(112, plan="nope"))])
    g.case("retry_by_the_other_admin", [post(C4, new(113), redact=R), post(C4, new(113), who=SECOND, redact=R)])
    g.case("retry_for_another_club_conflicts", [post(C4, new(114), redact=R), post(C5, new(114))])
    g.case("retry_in_upper_case", [post(C4, new(115), redact=R), post(C4, new(115, sourceCommandId=cmd(115).upper()), redact=R)])
    g.case("command_of_a_seeded_term_for_its_club", [post(C1, new(116, sourceCommandId="c3000000-0000-4000-8000-000000000001"), redact=R)])
    g.case("command_of_a_seeded_term_for_another_club", [post(C4, new(117, sourceCommandId="c3000000-0000-4000-8000-000000000001"))])
    g.case("command_of_an_audit_event_writes_the_term_and_no_event", [post(C4, new(118, sourceCommandId="c0000000-0000-4000-8000-0000000000a1"), redact=R)])
    g.case("command_missing", [post(C4, without(new(119), "sourceCommandId"), allow500=True, goExpects={"status": 422, "code": "invalid"})])
    g.case("command_not_a_uuid", [post(C4, new(120, sourceCommandId="not-a-uuid"), allow500=True, goExpects={"status": 422, "code": "invalid"})])
    g.case("command_a_number", [post(C4, new(121, sourceCommandId=5), allow500=True, goExpects={"status": 422, "code": "invalid"})])
    g.case("command_in_braces", [post(C4, new(122, sourceCommandId="{" + cmd(122) + "}"), redact=R)])
    g.case("reference_number_taken_is_unexpected", [post(C4, new(123), allow500=True)], scenario="reference_gap")
    # ---- the body ----
    g.case("body_not_json", [post(C4, raw="not json")])
    g.case("body_empty", [post(C4, raw="")])
    g.case("body_array", [post(C4, raw="[1]")])
    g.case("body_null", [post(C4, raw="null")])
    g.case("body_with_a_byte_order_mark", [post(C4, raw="\ufeff" + json.dumps(new(130)), redact=R)])
    g.case("body_empty_object_is_invalid", [post(C4, {})])
    # ---- month ends: the service adds months the way setUTCMonth does, which overflows ----
    g.case("monthly_from_the_thirty_first", [post(C4, new(140), redact=R)], now="2027-01-31T04:00:00.000Z")
    g.case("monthly_from_the_thirty_first_of_august", [post(C4, new(141), redact=R)], now="2026-08-31T04:00:00.000Z")
    g.case("monthly_from_the_thirtieth_of_january", [post(C4, new(142), redact=R)], now="2026-01-30T04:00:00.000Z")
    g.case("monthly_from_the_twenty_ninth_of_january", [post(C4, new(143), redact=R)], now="2027-01-29T04:00:00.000Z")
    g.case("monthly_from_the_twenty_ninth_of_january_leap_year", [post(C4, new(144), redact=R)], now="2028-01-29T04:00:00.000Z")
    g.case("yearly_from_a_leap_day", [post(C4, new(145, plan="Yearly", amountMinor=1800000), redact=R)], now="2028-02-29T04:00:00.000Z")
    g.case("monthly_across_a_year_end", [post(C4, new(146), redact=R)], now="2026-12-31T04:00:00.000Z")
    g.case("monthly_from_the_thirty_first_of_december", [post(C4, new(147), redact=R)], now="2026-12-31T23:59:59.999Z")
    g.case("renewal_from_a_month_end_access", [post(C4, new(148), redact=R), post(C4, new(149), redact=R)], now="2026-10-31T04:00:00.000Z")
    # ---- races ----
    g.case("race_two_activations_of_one_club", [{"parallel": [post(C4, new(150), redact=R), post(C4, new(151), redact=R)], "redact": R}],
           redact={"club_license_terms": ["source_command_id"], "admin_audit_events": ["source_command_id"]})
    g.case("race_one_command_twice", [{"parallel": [post(C4, new(152), redact=R), post(C4, new(152), redact=R)], "redact": R}])
    g.write()


# =====================================================================================================================
# club name review: PATCH /api/clubs/{clubId}
# =====================================================================================================================
R1, R2, R3, R4, R5 = ("e5000000-0000-4000-8000-00000000000%d" % n for n in range(1, 6))


def clubname():
    g = Group("clubname", [
        {"name": "clubs",
         "sql": "SELECT id, name, name_key, license_pricing::text AS license_pricing, license_monthly_minor, license_yearly_minor, revision::text AS revision, created_at, updated_at FROM clubs ORDER BY id",
         "redact": []},
        {"name": "club_name_change_requests",
         "sql": "SELECT id, club_id, requested_name, requested_name_key, requested_at, state::text AS state, reviewed_by_admin_id, reviewed_at, source_command_id, created_at, updated_at, revision::text AS revision FROM club_name_change_requests ORDER BY id",
         "redact": []},
        audit_spec(),
        NOTIFS,
    ], {
        # club 4 also asks for the name club 2 asks for
        "same_name_pending": ["INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at, state, source_command_id, created_at, updated_at, revision) VALUES ('e5000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000004', 'Free Birds Collective', 'free birds collective', TIMESTAMPTZ '2026-11-18 08:00:00+00', 'pending', 'c3000000-0000-4000-8000-000000000016', TIMESTAMPTZ '2026-11-18 08:00:00+00', TIMESTAMPTZ '2026-11-18 08:00:00+00', 1)"],
        # the request asks for a name key with a different case and spacing than the name
        "request_for_own_name": ["UPDATE club_name_change_requests SET requested_name = 'LAHUG SMASHERS', requested_name_key = 'lahug smashers' WHERE id = 'e5000000-0000-4000-8000-000000000001'"],
    })

    def path(club):
        return "/api/clubs/%s" % club

    def patch(club, body=None, who=OWNER, raw=None, **kw):
        return step("PATCH", path(club), body, who, raw, **kw)

    def decide(request, decision="approved", **over):
        b = {"requestId": request, "decision": decision}
        b.update(over)
        return b

    # ---- guards ----
    g.case("guard_no_session", [patch(C1, decide(R1), who=None)])
    g.case("guard_former_admin", [patch(C1, decide(R1), who=FORMER, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_unknown_subject", [patch(C1, decide(R1), who=UNKNOWN, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_beats_a_bad_body", [patch(C1, raw="not json", who=None)])
    g.case("guard_beats_a_bad_club_id", [patch("zz", decide(R1), who=None)])
    # ---- approve ----
    g.case("approves_a_name_change", [patch(C1, decide(R1))])
    g.case("approves_by_the_second_admin", [patch(C2, decide(R2), who=SECOND)])
    g.case("rejects_a_name_change", [patch(C1, decide(R1, "rejected"))])
    g.case("rejects_by_the_second_admin", [patch(C2, decide(R2, "rejected"), who=SECOND)])
    g.case("approves_in_upper_case_club_id", [patch(C1.upper(), decide(R1))])
    g.case("approves_with_a_name_of_other_case", [patch(C1, decide(R1))], scenario="request_for_own_name")
    g.case("ignores_unknown_fields", [patch(C1, decide(R1, name="Hacked", clubId=C2, reviewedByAdminId="x", state="approved"))])
    g.case("approval_of_a_taken_name_conflicts", [patch(C3, decide(R3))])
    g.case("rejection_of_a_taken_name_works", [patch(C3, decide(R3, "rejected"))])
    g.case("approving_the_same_name_twice_in_two_clubs_conflicts", [patch(C2, decide(R2)), patch(C4, decide("e5000000-0000-4000-8000-000000000006"))], scenario="same_name_pending")
    g.case("rejecting_one_of_two_clubs_asking_for_a_name_then_the_other_approves", [patch(C2, decide(R2, "rejected")), patch(C4, decide("e5000000-0000-4000-8000-000000000006"))], scenario="same_name_pending")
    # ---- the decision ----
    g.case("decision_missing_is_invalid", [patch(C1, {"requestId": R1})])
    g.case("decision_other_text_is_invalid", [patch(C1, decide(R1, "approve"))])
    g.case("decision_in_upper_case_is_invalid", [patch(C1, decide(R1, "APPROVED"))])
    g.case("decision_cancelled_is_invalid", [patch(C1, decide(R1, "cancelled"))])
    g.case("decision_a_number_is_invalid", [patch(C1, decide(R1, 1))])
    g.case("decision_null_is_invalid", [patch(C1, decide(R1, None))])
    g.case("decision_is_checked_before_the_club", [patch(NOTFOUND, decide(R1, "x"))])
    g.case("decision_with_a_space_is_invalid", [patch(C1, decide(R1, "approved "))])
    # ---- the request ----
    g.case("request_of_another_club_conflicts", [patch(C1, decide(R2))])
    g.case("request_missing_conflicts", [patch(C1, {"decision": "approved"})])
    g.case("request_empty_conflicts", [patch(C1, decide("", "approved"))])
    g.case("request_a_number_conflicts", [patch(C1, decide(5, "approved"))])
    g.case("request_in_upper_case_conflicts", [patch(C1, decide(R1.upper(), "approved"))])
    g.case("request_unknown_conflicts", [patch(C1, decide("e5000000-0000-4000-8000-0000000000ff", "approved"))])
    g.case("request_not_a_uuid_conflicts", [patch(C1, decide("not-a-uuid", "approved"))])
    g.case("request_already_approved_conflicts", [patch(C1, decide(R4))])
    g.case("request_already_rejected_conflicts", [patch(C4, decide(R5, "rejected"))])
    g.case("club_without_requests_conflicts", [patch(C5, decide(R1))])
    g.case("approve_twice_conflicts", [patch(C1, decide(R1)), patch(C1, decide(R1))])
    g.case("approve_then_reject_conflicts", [patch(C1, decide(R1)), patch(C1, decide(R1, "rejected"))])
    g.case("reject_then_approve_conflicts", [patch(C1, decide(R1, "rejected")), patch(C1, decide(R1))])
    g.case("both_clubs_in_a_row", [patch(C1, decide(R1)), patch(C2, decide(R2, "rejected"))])
    # ---- the club ----
    g.case("unknown_club_conflicts", [patch(NOTFOUND, decide(R1))])
    g.case("club_id_not_hex_is_not_found", [patch("zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", decide(R1))])
    g.case("club_id_too_short_is_not_found", [patch("abc", decide(R1))])
    g.case("club_id_of_thirty_six_dashes_is_unexpected", [patch("-" * 36, decide(R1), allow500=True, goExpects={"status": 404, "code": "not_found"})])
    g.case("club_id_of_thirty_six_hex_digits_is_unexpected", [patch("a" * 36, decide(R1), allow500=True, goExpects={"status": 404, "code": "not_found"})])
    g.case("club_id_with_a_not_found_check_before_the_body", [patch("zz", raw="not json")])
    # ---- the body ----
    g.case("body_not_json", [patch(C1, raw="not json")])
    g.case("body_empty", [patch(C1, raw="")])
    g.case("body_array", [patch(C1, raw="[1]")])
    g.case("body_null", [patch(C1, raw="null")])
    g.case("body_with_a_byte_order_mark", [patch(C1, raw="\ufeff" + json.dumps(decide(R1)))])
    g.case("body_empty_object_is_invalid", [patch(C1, {})])
    g.write()


# =====================================================================================================================
# Add club: POST /api/clubs
# =====================================================================================================================
def clubs():
    club_cols = ("(SELECT l.country_code || '-' || l.city_code FROM location_codes l WHERE l.id = c.founding_location_code_id) AS city_code, "
                 "founding_address, license_pricing::text AS license_pricing, license_monthly_minor, license_yearly_minor, currency, "
                 "default_players_per_court, default_entrance_fee_minor, description, court_rules, post_template, logo_ref, self_check_in_enabled, "
                 "source_command_id, invite_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$' AS invite_code_is_ten_unambiguous_characters, "
                 "created_at, updated_at, revision::text AS revision")
    g = Group("clubs", [
        {"name": "clubs", "sql": "SELECT name, name_key, " + club_cols + " FROM clubs c ORDER BY name, source_command_id", "redact": []},
        {"name": "club_accounts",
         "sql": "SELECT (SELECT c.name FROM clubs c WHERE c.id = a.club_id) AS club, username, auth_subject IS NOT NULL AS has_subject, (provisioned_at IS NOT NULL) = (auth_subject IS NOT NULL) AS provisioned_with_a_subject, provisioned_at, disabled_at, created_at, updated_at, revision::text AS revision FROM club_accounts a ORDER BY username",
         "redact": []},
        {"name": "club_entitlements",
         "sql": "SELECT (SELECT c.name FROM clubs c WHERE c.id = e.club_id) AS club, effective_term_id IS NULL AS no_term, effective_access_ends_at, current_expiry_cycle_id IS NULL AS no_cycle, refreshed_at, updated_at, revision::text AS revision FROM club_entitlements e ORDER BY 1",
         "redact": []},
        {"name": "club_license_terms", "sql": "SELECT count(*)::int AS terms FROM club_license_terms", "redact": []},
        {"name": "admin_audit_events",
         "sql": "SELECT a.id, a.actor_admin_id, a.action, a.target_type, a.target_id, a.source_command_id, a.occurred_at, a.metadata, (SELECT c.name FROM clubs c WHERE c.id::text = a.target_id) AS target_club FROM admin_audit_events a ORDER BY a.action, a.target_type, a.source_command_id NULLS FIRST, a.occurred_at, a.metadata::text, 9",
         "redact": ["id", "target_id"]},
        NOTIFS,
    ])
    P = "/api/clubs"

    def post(body=None, who=OWNER, raw=None, **kw):
        return step("POST", P, body, who, raw, **kw)

    def new(n=1, **over):
        b = {"sourceCommandId": cmd(n), "name": "Banilad Birdies", "cityCode": "PH-CEB", "foundingAddress": "Hall 9, Banilad, Cebu City",
             "username": "banilad.birdies", "password": "correct horse", "price": {"pricing": "paid", "monthly": 180000, "yearly": 1800000}}
        b.update(over)
        return b

    def without(b, *keys):
        return {k: v for k, v in b.items() if k not in keys}

    def price(**kw):
        return {"price": kw}

    R = ["clubId"]
    GO422 = {"status": 422, "code": "invalid"}
    # ---- guards ----
    g.case("guard_no_session", [post(new(), who=None)])
    g.case("guard_former_admin", [post(new(), who=FORMER, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_unknown_subject", [post(new(), who=UNKNOWN, goExpects={"status": 401, "code": "unauthenticated"})])
    g.case("guard_beats_a_bad_body", [post(raw="not json", who=None)])
    # ---- success ----
    g.case("creates_a_paid_club", [post(new(), redact=R)])
    g.case("creates_a_free_club", [post(new(2, **price(pricing="free")), redact=R)])
    g.case("free_club_stores_no_amounts", [post(new(3, **price(pricing="free", monthly=150000, yearly=1500000)), redact=R)])
    g.case("by_the_second_admin", [post(new(4), who=SECOND, redact=R)])
    g.case("in_manila", [post(new(5, cityCode="PH-MNL"), redact=R)])
    g.case("city_code_with_a_third_part_is_ignored", [post(new(6, cityCode="PH-CEB-extra"), redact=R)])
    g.case("name_and_address_are_trimmed", [post(new(7, name="  \t Banilad  Birdies \n", foundingAddress="  Hall 9  \n"), redact=R)])
    g.case("name_inner_spaces_are_kept_in_the_name", [post(new(8, name="Banilad   Birdies   Club"), redact=R)])
    g.case("username_is_trimmed_and_lower_cased", [post(new(9, username="  Banilad.BIRDIES \t"), redact=R)])
    g.case("ignores_unknown_fields", [post(new(10, id=C1, clubId=C1, logoRef="x", inviteCode="AAAAAAAAAA", revision=9, accountState="ready", authSubject="x"), redact=R)])
    g.case("password_of_eight_characters", [post(new(11, password="12345678"), redact=R)])
    g.case("password_of_four_astral_characters_is_eight_units", [post(new(12, password="\U0001F3F8\U0001F3F8\U0001F3F8\U0001F3F8"), redact=R)])
    g.case("password_with_spaces_and_accents", [post(new(13, password="  p\u00e4ssw\u00f6rd  "), redact=R)])
    g.case("monthly_of_one_centavo_and_yearly_below_twelve", [post(new(14, **price(pricing="paid", monthly=1, yearly=11)), redact=R)])
    g.case("amounts_written_as_floats", [post(new(15, price={"pricing": "paid", "monthly": 150000.0, "yearly": 1.5e6}), redact=R)])
    g.case("pricing_free_ignores_bad_amounts", [post(new(16, **price(pricing="free", monthly="x", yearly=-5)), redact=R)])
    # ---- the name of the club, compared by its key (NFKC, trimmed, collapsed, lower case) ----
    for i, (name, value) in enumerate([
        ("decomposed_accents", "A\u030angstro\u0308m Club"), ("ligature_and_full_width", "\ufb01ne \uff26\uff55\uff4c\uff4c Club"),
        ("dotted_capital_i", "\u0130stanbul Smash"), ("final_sigma", "\u03a3\u038a\u03a3\u03a5\u03a6\u039f\u03a3 Club"),
        ("kelvin_sign", "\u212a Club"), ("titlecase_digraph", "\u01c5ungla Club"), ("capital_sharp_s", "Stra\u1e9ee Club"),
        ("roman_numeral", "\u2167 Club"), ("odd_white_space", " \u00a0Spaced\u2003 Out\ufeff Club \u3000"), ("emoji", "\U0001F3F8 Smash"),
        ("greek_capital_sigma_inside", "\u0391\u03a3\u0391 Club"), ("final_sigma_before_a_dot", "\u039f\u0394\u039f\u03a3. Club"),
        ("superscripts_and_fractions", "\u00b2\u00bd Club"), ("angstrom_sign", "\u212b Club"), ("long_s", "\u017fmash Club"),
    ]):
        g.case("name_key_" + name, [post(new(20 + i, name=value, username="key.%02d" % i), redact=R)])
    # ---- usernames ----
    for i, (name, value) in enumerate([("ntilde_upper", "\u00d1AND\u00da"), ("dotted_capital_i", "\u0130ZM\u0130R"), ("capital_sigma", "\u03a3\u038a\u03a3\u03a5\u03a6\u039f\u03a3"),
                                       ("with_inner_space", "ban ilad"), ("with_symbols", "b@n!lad+/x"), ("long", "u" * 300), ("single_char", "x"), ("nbsp_around", "\u00a0banilad\u00a0")]):
        g.case("username_" + name, [post(new(40 + i, username=value), redact=R)])
    # ---- the body ----
    g.case("body_not_json", [post(raw="not json")])
    g.case("body_empty", [post(raw="")])
    g.case("body_array", [post(raw="[1]")])
    g.case("body_null", [post(raw="null")])
    g.case("body_with_a_byte_order_mark", [post(raw="\ufeff" + json.dumps(new(50)), redact=R)])
    g.case("body_empty_object_is_invalid", [post({})])
    # ---- the password (8 UTF-16 units) ----
    g.case("password_missing", [post(without(new(60), "password"))])
    g.case("password_of_seven", [post(new(61, password="1234567"))])
    g.case("password_of_three_astral_characters_is_six_units", [post(new(62, password="\U0001F3F8\U0001F3F8\U0001F3F8"))])
    g.case("password_empty", [post(new(63, password=""))])
    g.case("password_a_number", [post(new(64, password=12345678))])
    g.case("password_null", [post(new(65, password=None))])
    g.case("password_is_checked_before_the_city", [post(new(66, password="x", cityCode="zz"))])
    g.case("password_is_checked_before_the_name", [post(new(67, password="x", name=""))])
    # A password of 1025 characters is not a case here: the Route Handler accepts it (it has no limit), Go refuses it (the
    # hash limit of internal/auth/password), so the rows differ. clubs_test.go tests the refusal.
    g.case("password_at_the_hash_limit", [post(new(69, password="p" * 1024), redact=R)])
    # ---- the city ----
    for i, (name, value) in enumerate([("missing", None), ("empty", ""), ("lower_case", "ph-ceb"), ("country_only", "PH"), ("no_city", "PH-"), ("no_country", "-CEB"),
                                       ("unknown_city", "PH-XXX"), ("unknown_country", "US-CEB"), ("no_dash", "PHCEB"), ("trailing_space", "PH-CEB "), ("leading_space", " PH-CEB"),
                                       ("double_dash", "PH--CEB"), ("a_number", 5), ("underscore", "PH_CEB")]):
        b = without(new(80 + i), "cityCode") if value is None else new(80 + i, cityCode=value)
        g.case("city_" + name, [post(b)])
    g.case("city_is_checked_before_the_name", [post(new(95, cityCode="zz", name=""))])
    # ---- name, address, username ----
    for i, (name, over) in enumerate([("name_missing", {"name": None}), ("name_empty", {"name": ""}), ("name_blank", {"name": " \u00a0\u2003 "}), ("name_a_number", {"name": 5}),
                                      ("address_missing", {"foundingAddress": None}), ("address_blank", {"foundingAddress": "  \t"}), ("username_missing", {"username": None}),
                                      ("username_blank", {"username": "   "}), ("username_a_number", {"username": 5}), ("all_three_missing", {"name": "", "foundingAddress": "", "username": ""})]):
        b = new(100 + i)
        for k, v in over.items():
            if v is None:
                b.pop(k)
            else:
                b[k] = v
        g.case("club_" + name, [post(b)])
    g.case("club_fields_are_checked_before_the_price", [post(new(110, name="", **price(pricing="paid")))])
    # ---- the price ----
    for i, (name, p) in enumerate([
        ("monthly_missing", {"pricing": "paid", "yearly": 1800000}), ("yearly_missing", {"pricing": "paid", "monthly": 180000}), ("both_missing", {"pricing": "paid"}),
        ("pricing_missing", {"monthly": 180000, "yearly": 1800000}), ("pricing_other_text", {"pricing": "Free", "monthly": 180000, "yearly": 1800000}),
        ("monthly_zero", {"pricing": "paid", "monthly": 0, "yearly": 5}), ("yearly_zero", {"pricing": "paid", "monthly": 5, "yearly": 0}), ("monthly_negative", {"pricing": "paid", "monthly": -1, "yearly": 5}),
        ("monthly_fraction", {"pricing": "paid", "monthly": 1500.5, "yearly": 1800000}), ("yearly_fraction", {"pricing": "paid", "monthly": 180000, "yearly": 1799999.5}),
        ("monthly_string", {"pricing": "paid", "monthly": "180000", "yearly": 1800000}), ("yearly_string", {"pricing": "paid", "monthly": 180000, "yearly": "1800000"}),
        ("monthly_null", {"pricing": "paid", "monthly": None, "yearly": 1800000}), ("yearly_twelve_months", {"pricing": "paid", "monthly": 150000, "yearly": 1800000}),
        ("yearly_above_twelve_months", {"pricing": "paid", "monthly": 150000, "yearly": 1800001}), ("yearly_one_below_twelve_months", {"pricing": "paid", "monthly": 150000, "yearly": 1799999}),
        ("amounts_above_a_safe_integer", {"pricing": "paid", "monthly": 9007199254740992, "yearly": 9007199254740992}), ("amount_overflowing_a_double", None),
    ]):
        if p is None:
            g.case("price_" + name, [post(raw=json.dumps(new(120 + i)).replace('"price": {"pricing": "paid", "monthly": 180000, "yearly": 1800000}', '"price": {"pricing": "paid", "monthly": 1e999, "yearly": 5}'))])
            continue
        g.case("price_" + name, [post(new(120 + i, price=p), redact=R if name in ("yearly_one_below_twelve_months", "pricing_missing", "pricing_other_text") else None)])
    g.case("price_missing_is_invalid", [post(without(new(140), "price"))])
    g.case("price_null_is_invalid", [post(new(141, price=None))])
    g.case("price_a_string_is_invalid", [post(new(142, price="free"))])
    g.case("price_an_array_is_invalid", [post(new(143, price=["free"]))])
    g.case("price_free_inside_an_array_is_invalid", [post(new(144, price=[{"pricing": "free"}]))])
    g.case("price_beyond_the_column_is_unexpected", [post(new(145, price={"pricing": "paid", "monthly": 3000000000, "yearly": 35000000000}), allow500=True)])
    g.case("price_at_the_column_limit", [post(new(146, price={"pricing": "paid", "monthly": 2147483647, "yearly": 2147483647}), redact=R)])
    # ---- taken names and usernames ----
    g.case("name_taken", [post(new(150, name="Lahug Smashers"))])
    g.case("name_taken_in_other_case_and_spaces", [post(new(151, name="  LAHUG   smashers "))])
    g.case("name_with_a_combining_accent_is_another_name", [post(new(152, name="Lahu\u0301g Smashers"), redact=R)])
    g.case("name_taken_by_a_full_width_variant", [post(new(153, name="\uff2c\uff41\uff48\uff55\uff47 Smashers"))])
    g.case("username_taken", [post(new(154, username="lahug.smash"))])
    g.case("username_taken_in_other_case", [post(new(155, username="LAHUG.SMASH"))])
    g.case("username_of_a_staged_club_is_taken", [post(new(156, username="freshstart"))])
    g.case("name_of_a_pending_rename_is_free", [post(new(157, name="Lahug Smash Club"), redact=R)])
    g.case("conflict_writes_nothing_then_a_free_name_works", [post(new(158, name="Lahug Smashers")), post(new(159, name="Lahug Smashers Two"), redact=R)])
    # ---- the command ----
    g.case("retry_returns_the_same_club", [post(new(170), redact=R), post(new(170), redact=R)])
    g.case("retry_with_other_values_returns_the_first", [post(new(171), redact=R), post(new(171, name="Other Name", username="other.user", password="another one", **price(pricing="free")), redact=R)])
    g.case("retry_with_an_invalid_body_is_invalid", [post(new(172), redact=R), post(new(172, password="x"))])
    g.case("retry_by_the_other_admin", [post(new(173), redact=R), post(new(173), who=SECOND, redact=R)])
    g.case("retry_in_upper_case", [post(new(174), redact=R), post(new(174, sourceCommandId=cmd(174).upper()), redact=R)])
    g.case("retry_resumes_a_staged_club", [post(new(175, sourceCommandId="c3000000-0000-4000-8000-0000000000c4", name="Whatever", username="whatever"), redact=R)])
    g.case("retry_of_a_provisioned_seeded_club", [post(new(176, sourceCommandId="c3000000-0000-4000-8000-0000000000c1"), redact=R)])
    g.case("command_of_an_old_audit_event_creates_the_club_without_an_event", [post(new(177, sourceCommandId="c0000000-0000-4000-8000-0000000000b2"), redact=R)])
    g.case("command_missing", [post(without(new(178), "sourceCommandId"), allow500=True, goExpects=GO422)])
    g.case("command_not_a_uuid", [post(new(179, sourceCommandId="not-a-uuid"), allow500=True, goExpects=GO422)])
    g.case("command_a_number", [post(new(180, sourceCommandId=5), allow500=True, goExpects=GO422)])
    g.case("command_in_braces", [post(new(181, sourceCommandId="{" + cmd(181) + "}"), redact=R)])
    g.case("command_is_checked_after_the_price", [post(new(182, sourceCommandId="x", **price(pricing="paid")))])
    # ---- races ----
    g.case("race_one_name_two_commands", [{"parallel": [post(new(190, username="race.a"), redact=R), post(new(191, username="race.b"), redact=R)], "redact": R}],
           redact={"clubs": ["source_command_id"], "admin_audit_events": ["source_command_id"], "club_accounts": ["username"]})
    g.case("race_one_username_two_commands", [{"parallel": [post(new(192, name="Race One"), redact=R), post(new(193, name="Race Two"), redact=R)], "redact": R + ["name"]}],
           redact={"clubs": ["name", "name_key", "source_command_id"], "admin_audit_events": ["source_command_id", "target_club"], "club_accounts": ["club"], "club_entitlements": ["club"]})
    g.write()


if __name__ == "__main__":
    which = sys.argv[1:] or ["ranking"]
    for w in which:
        globals()[w]()
