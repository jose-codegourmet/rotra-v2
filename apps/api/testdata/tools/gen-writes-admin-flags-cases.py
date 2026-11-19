# Generates apps/api/internal/adminwrites/testdata/flags.cases.json (the feature flag write cases). The cases are
# data; the golden file next to it is captured from the TypeScript by capture-writes-admin.test.mjs, never generated
# here. Edit this file, run `python3 apps/api/testdata/tools/gen-writes-admin-flags-cases.py`, then rerun the capture.
import os
import json
OWNER = "ad100000-0000-4000-8000-000000000001"
SECOND = "ad100000-0000-4000-8000-000000000002"
FORMER = "ad100000-0000-4000-8000-000000000003"
UNKNOWN = "ad100000-0000-4000-8000-0000000000ff"
cmd = lambda n: "c1000000-0000-4000-8000-%012d" % n
DESC = "Shows the estimated cost per player."

cases = []
def case(name, steps, scenario="base", redact=None):
    c = {"name": name, "scenario": scenario, "steps": steps}
    if redact: c["redact"] = redact
    cases.append(c)

def post(body=None, who=OWNER, raw=None, redact=None, **kw):
    s = {"method": "POST", "path": "/api/feature-flags", "who": who}
    if raw is not None: s["rawBody"] = raw
    elif body is not None: s["body"] = body
    if redact is not None: s["redact"] = redact
    s.update(kw)
    return s

def patch(key, body=None, who=OWNER, raw=None, **kw):
    s = {"method": "PATCH", "path": "/api/feature-flags/" + key, "who": who}
    if raw is not None: s["rawBody"] = raw
    elif body is not None: s["body"] = body
    s.update(kw)
    return s

def new(n, **over):
    b = {"commandId": cmd(n), "key": "cost_estimate", "name": "Cost estimate", "description": DESC}
    b.update(over)
    return b

# ---- guards ----
case("post_guard_no_session", [post(new(1), who=None)])
case("post_guard_former_admin", [post(new(1), who=FORMER, goExpects={"status": 401, "code": "unauthenticated"})])
case("post_guard_unknown_subject", [post(new(1), who=UNKNOWN, goExpects={"status": 401, "code": "unauthenticated"})])
case("post_guard_beats_a_bad_body", [post(raw="not json", who=None)])
case("patch_guard_no_session", [patch("sessions_beta", {"on": False, "expectedRevision": "4"}, who=None)])
case("patch_guard_former_admin", [patch("sessions_beta", {"on": False, "expectedRevision": "4"}, who=FORMER, goExpects={"status": 401, "code": "unauthenticated"})])

# ---- POST: success ----
case("post_creates_a_flag_off", [post(new(2))])
case("post_creates_a_flag_on", [post(new(3, on=True))])
case("post_by_the_second_admin", [post(new(4), who=SECOND)])
case("post_trims_the_text", [post(new(5, key="  padded_key\n", name="\t Padded name ", description="  A long enough description.  "))])
case("post_on_must_be_the_boolean_true", [
    post(new(6, key="on_string", name="On string", on="true")),
    post(new(7, key="on_one", name="On one", on=1)),
    post(new(8, key="on_null", name="On null", on=None)),
    post(new(9, key="on_false", name="On false", on=False)),
])
case("post_ignores_unknown_fields", [post(new(10, extra={"a": 1}, value=True, createdByAdminId="x"))])
case("post_name_of_fifty_characters", [post(new(11, name="n" * 50))])
case("post_name_counts_utf16_units", [
    post(new(12, key="emoji_ok", name="😀" * 25)),
    post(new(13, key="emoji_long", name="😀" * 26)),
])
case("post_key_of_forty_characters", [post(new(14, key="k" * 40))])
case("post_a_name_with_accents", [post(new(15, key="creme_brulee", name="Crème brûlée"))])
case("post_the_key_is_exact_but_the_name_is_not", [post(new(16, key="Cafe_Mode"))])

# ---- POST: validation ----
case("post_empty_object", [post({})])
case("post_wrong_types", [post({"commandId": cmd(20), "key": 5, "name": ["x"], "description": None})])
case("post_name_too_long", [post(new(21, name="n" * 51))])
case("post_description_too_short", [post(new(22, description="Too short"))])
case("post_description_of_ten_characters", [post(new(23, description="0123456789"))])
case("post_key_formats", [post(new(24, key=k)) for k in ["ab", "1abc", "_abc", "Abc", "has-dash", "has space", "a" + "b" * 40, "ábc"]])
case("post_all_fields_wrong", [post(new(25, key="A", name="", description=""))])
case("post_white_space_only", [post(new(26, key="   ", name="﻿", description=" "))])
case("post_format_errors_beat_taken_ones", [post(new(27, key="sessions_beta", description="short"))])

# ---- POST: taken ----
case("post_key_taken", [post(new(30, key="sessions_beta"))])
case("post_name_taken", [post(new(31, name="Sessions beta"))])
case("post_name_taken_ignoring_case_and_accents", [post(new(32, name="CAFÉ MODE")), post(new(33, name="cafe mode")), post(new(34, name="  Cafe Mode  "))])
case("post_both_taken", [post(new(35, key="night_mode", name="NIGHT MODE"))])
case("post_the_seeded_flag_key_is_taken", [post(new(36, key="player_google_sign_in", name="Another"))])
case("post_the_same_flag_twice_with_new_commands", [post(new(37)), post(new(38))])

# ---- POST: the request body ----
for n, raw in [("empty", ""), ("not_json", "not json"), ("array", "[]"), ("null", "null"), ("string", '"x"'), ("number", "5"), ("true", "true"), ("trailing_text", '{"a":1} x'), ("two_objects", '{"a":1}{"b":2}'), ("unfinished", "{")]:
    case("post_body_" + n, [post(raw=raw)])
case("post_body_with_a_byte_order_mark", [post(raw="﻿" + json.dumps(new(40)))])
case("post_body_duplicate_keys_last_wins", [post(raw='{"commandId":"%s","key":"first_key","key":"last_key","name":"Dup","description":"%s"}' % (cmd(41), DESC))])

# ---- POST: the command id ----
case("post_no_command_id", [post({"key": "cost_estimate", "name": "Cost estimate", "description": DESC}, allow500=True, goExpects={"status": 422, "code": "invalid"})])
case("post_command_id_not_a_uuid", [post(new(1, commandId="not-a-uuid"), allow500=True, goExpects={"status": 422, "code": "invalid"})])
case("post_command_id_a_number", [post(new(1, commandId=5), allow500=True, goExpects={"status": 422, "code": "invalid"})])
case("post_command_id_uppercase", [post(new(1, commandId=cmd(42).upper()))])
case("post_command_id_without_hyphens", [post(new(1, commandId=cmd(43).replace("-", "")))])
case("post_command_id_in_braces", [post(new(1, commandId="{" + cmd(44) + "}"))])
case("post_command_id_with_spaces", [post(new(1, commandId=" " + cmd(45) + " "), allow500=True, goExpects={"status": 422, "code": "invalid"})])

# ---- POST: a retry ----
case("post_retry_returns_the_same_flag", [post(new(50)), post(new(50))])
case("post_retry_ignores_a_changed_body", [post(new(51)), post(new(51, key="other_key", name="Other", on=True))])
case("post_retry_with_a_bad_body_is_still_invalid", [post(new(52)), post(new(52, description="short"))])
case("post_retry_of_a_seeded_command", [post(new(1, commandId="c0000000-0000-4000-8000-0000000000a1", key="other_key", name="Other"))])
case("post_command_of_another_audit_event", [post(new(1, commandId="c0000000-0000-4000-8000-0000000000b2"), allow500=True)])

# ---- POST: two at once ----
# Who wins a race is not decided, so what shows the winner is redacted by name: the answer's fields and the columns.
# Only races whose answers do not depend on timing are captured. A same-name race (the loser answers a taken name
# or a taken key, by timing) and a same-command race (the loser is a retry or a conflict, by timing) are not: the Go
# test internal/adminwrites/flags_race_test.go checks what always holds for them.
case("post_race_same_key", [{"redact": ["flag.name"], "parallel": [
    post(new(62, name="Zeta one")), post(new(63, name="Zeta two"))]}],
     redact={"feature_flags": ["name"], "admin_audit_events": ["source_command_id"]})
case("post_no_race_for_other_flags", [{"parallel": [
    post(new(68, key="zeta_one", name="Zeta one")), post(new(69, key="zeta_two", name="Zeta two"))]}])
case("post_command_id_as_a_urn", [post(new(1, commandId="urn:uuid:" + cmd(46)), allow500=True, goExpects={"status": 422, "code": "invalid"})])
case("post_command_id_in_braces_without_hyphens", [post(new(1, commandId="{" + cmd(47).replace("-", "") + "}"))])
case("post_command_id_with_some_hyphens", [post(new(1, commandId=cmd(48)[:8] + cmd(48)[9:]))])
case("post_command_id_with_a_bad_digit", [post(new(1, commandId="g" + cmd(49)[1:]), allow500=True, goExpects={"status": 422, "code": "invalid"})])
case("post_command_id_a_nil_uuid", [post(new(1, commandId="00000000-0000-0000-0000-000000000000"))])

# ---- PATCH: success ----
OK = {"on": True, "expectedRevision": "9007199254740993"}
case("patch_turns_a_flag_on", [patch("night_mode", OK)])
case("patch_turns_a_flag_off", [patch("sessions_beta", {"on": False, "expectedRevision": "4"})])
case("patch_a_seeded_flag_gets_an_admin", [patch("player_google_sign_in", {"on": True, "expectedRevision": "1"})])
case("patch_by_the_second_admin", [patch("cafe_mode", {"on": True, "expectedRevision": "1"}, who=SECOND)])
case("patch_to_the_same_value_writes_nothing", [patch("sessions_beta", {"on": True, "expectedRevision": "4"})])
case("patch_there_and_back", [
    patch("sessions_beta", {"on": False, "expectedRevision": "4"}),
    patch("sessions_beta", {"on": True, "expectedRevision": "5"}),
    patch("sessions_beta", {"on": True, "expectedRevision": "6"}),
])
case("patch_ignores_unknown_fields", [patch("sessions_beta", {"on": False, "expectedRevision": "4", "name": "Renamed", "value": True, "key": "x"})])
case("patch_key_is_percent_decoded", [patch("sessions%5Fbeta", {"on": False, "expectedRevision": "4"})])

# ---- PATCH: stale ----
case("patch_stale_revision", [patch("sessions_beta", {"on": False, "expectedRevision": "3"})])
case("patch_stale_revision_with_the_same_value", [patch("sessions_beta", {"on": True, "expectedRevision": "3"})])
case("patch_a_second_change_with_the_old_revision", [
    patch("sessions_beta", {"on": False, "expectedRevision": "4"}),
    patch("sessions_beta", {"on": True, "expectedRevision": "4"}),
    patch("sessions_beta", {"on": False, "expectedRevision": "4"}),
])
case("patch_revision_beyond_2_53_off_by_one", [patch("night_mode", {"on": True, "expectedRevision": "9007199254740992"})])

# ---- PATCH: how the revision is read ----
for n, rev in [("absent", "__absent__"), ("number", 4), ("empty", ""), ("null", None), ("padded", " 4 "), ("hex", "0x4"), ("hex_upper", "0X4"), ("octal", "0o4"), ("binary", "0b100"), ("plus_sign", "+4"), ("leading_zeros", "004"), ("zero", "0"), ("minus_one", "-1"), ("twenty_digits", "99999999999999999999"), ("decimal_point", "4.0"), ("exponent", "4e0"), ("letters", "abc"), ("separator", "1_0"), ("signed_hex", "-0x4"), ("bare_prefix", "0x"), ("two_numbers", "4 4"), ("boolean", True), ("array", ["4"]), ("tab_padded", "\t4\n"), ("byte_order_mark", "﻿4")]:
    body = {"on": False}
    if rev != "__absent__": body["expectedRevision"] = rev
    case("patch_revision_" + n, [patch("sessions_beta", body)])
case("patch_bad_revision_beats_the_same_value", [patch("sessions_beta", {"on": True, "expectedRevision": "abc"})])

# ---- PATCH: the value, the flag, the body ----
for n, on in [("absent", "__absent__"), ("string", "true"), ("null", None), ("number", 1), ("object", {})]:
    body = {"expectedRevision": "4"}
    if on != "__absent__": body["on"] = on
    case("patch_on_" + n, [patch("sessions_beta", body)])
case("patch_unknown_flag", [patch("nope_flag", {"on": True, "expectedRevision": "1"})])
case("patch_unknown_flag_beats_a_bad_revision", [patch("nope_flag", {"on": True, "expectedRevision": "abc"})])
case("patch_a_bad_value_beats_an_unknown_flag", [patch("nope_flag", {"expectedRevision": "1"})])
case("patch_key_is_exact", [patch("Sessions_Beta", {"on": False, "expectedRevision": "4"})])
case("patch_key_with_a_space", [patch("sessions%20beta", {"on": False, "expectedRevision": "4"})])
for n, raw in [("empty", ""), ("not_json", "not json"), ("array", "[]"), ("null", "null"), ("trailing_text", '{"on":true} x')]:
    case("patch_body_" + n, [patch("sessions_beta", raw=raw)])
case("patch_a_bad_body_beats_an_unknown_flag", [patch("nope_flag", raw="not json")])

# ---- PATCH: two at once ----
case("patch_race_same_revision", [{"parallel": [
    patch("sessions_beta", {"on": False, "expectedRevision": "4"}),
    patch("sessions_beta", {"on": False, "expectedRevision": "4"})]}])
case("patch_race_two_admins", [{"redact": ["flag.updatedByDisplayName"], "parallel": [
    patch("sessions_beta", {"on": False, "expectedRevision": "4"}),
    patch("sessions_beta", {"on": False, "expectedRevision": "4"}, who=SECOND)]}],
     redact={"feature_flags": ["updated_by_admin_id"], "admin_audit_events": ["actor_admin_id"]})
case("patch_race_on_the_huge_revision", [{"parallel": [patch("night_mode", OK), patch("night_mode", OK)]}])
case("patch_race_three_at_once", [{"parallel": [
    patch("cafe_mode", {"on": True, "expectedRevision": "1"}),
    patch("cafe_mode", {"on": True, "expectedRevision": "1"}),
    patch("cafe_mode", {"on": True, "expectedRevision": "1"})]}])
case("patch_no_race_for_other_flags", [{"parallel": [
    patch("night_mode", OK), patch("cafe_mode", {"on": True, "expectedRevision": "1"}, who=SECOND)]}])
case("patch_race_with_adding_a_flag", [{"parallel": [
    patch("cafe_mode", {"on": True, "expectedRevision": "1"}),
    post(new(70, key="zeta_one", name="Zeta one"))]}])

out = {
    "now": "2026-11-19T04:00:00.000Z",
    "app": "admin",
    "seed": "admin.seed.sql",
    "scenarios": {"base": []},
    "snapshot": [
        {"name": "feature_flags", "sql": "SELECT key, name, description, value, created_by_admin_id, updated_by_admin_id, created_at, updated_at, revision::text AS revision FROM feature_flags ORDER BY key", "redact": []},
        {"name": "admin_audit_events", "sql": "SELECT id, actor_admin_id, action, target_type, target_id, source_command_id, occurred_at, metadata FROM admin_audit_events ORDER BY action, target_id, source_command_id NULLS FIRST, metadata::text", "redact": ["id"]},
        {"name": "player_notifications", "sql": "SELECT id FROM player_notifications ORDER BY id", "redact": []},
    ],
    "cases": cases,
}
print(len(cases), "cases")
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../internal/adminwrites/testdata/flags.cases.json")
with open(path, "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
    f.write("\n")
