# Generates apps/api/internal/adminwrites/testdata/players.seed.sql and the cases files of the Admin player writes:
#   playerverify.cases.json   PATCH /api/players/{playerId}/verification
#   playercreate.cases.json   POST  /api/players
#   playeredit.cases.json     PATCH /api/players/{playerId}
# The cases are data; the *.golden.json files are captured from the TypeScript by capture-writes-players.test.mjs, never
# generated here. Edit this file, run `python3 apps/api/testdata/tools/gen-writes-admin-players-cases.py`, then rerun
# the capture. The seed is cut from the Admin reads' seed (internal/signedin/testdata/admin.seed.sql, whose rows
# already satisfy the directory read) and extended here.
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "../../internal/adminwrites/testdata")
SRC = os.path.join(HERE, "../../internal/signedin/testdata/admin.seed.sql")

OWNER = "ad100000-0000-4000-8000-000000000001"
SECOND = "ad100000-0000-4000-8000-000000000002"
FORMER = "ad100000-0000-4000-8000-000000000003"
UNKNOWN = "ad100000-0000-4000-8000-0000000000ff"

P = lambda n: "d4000000-0000-4000-8000-%012d" % n      # players
ALICE, BOB, CARLA, DAN, ERIN, FRANK, GINA, HANA, IVAN, JUNE = [P(n) for n in range(1, 11)]
E = lambda n: "a6000000-0000-4000-8000-%012d" % n      # shared entries
CP = lambda n: "c6000000-0000-4000-8000-%012d" % n     # club records
SMASH = "c9000000-0000-4000-8000-000000000001"
BIRDIE = "c9000000-0000-4000-8000-000000000002"
NINJAS = "c9000000-0000-4000-8000-000000000003"
NOACC = "c9000000-0000-4000-8000-000000000004"
TS = "TIMESTAMPTZ '2026-11-01 00:00:00+00'"

# ---------------------------------------------------------------- seed
src = open(SRC).read().split("\n")


def lines(first, last, starts):
    chunk = src[first - 1:last]
    assert chunk[0].startswith(starts), (first, chunk[0][:60])
    return "\n".join(chunk)


def fixed(text):
    # the reads' seed stamps updated_at with the real now(): pin it, so the rows can be compared
    return text.replace("now()", TS)


seed = [
    "-- Fictional admins, clubs, players, shared entries, club records and contact-change requests for the Admin player",
    "-- writes characterization (POST /api/players, PATCH /api/players/{id}, PATCH /api/players/{id}/verification).",
    "-- Applied on top of the Prisma migrations. Cut from internal/signedin/testdata/admin.seed.sql and extended by",
    "-- apps/api/testdata/tools/gen-writes-admin-players-cases.py: edit that, not this. Admin accounts are linked with",
    "-- auth_provider 'supabase' (the Go test relinks them); the player accounts are already 'rotra' with a sign-in identity",
    "-- (auth_identities, id = the account's auth_subject, login key = the contact email) because the TypeScript side",
    "-- mocks the provider and the Go side has none. Foreign key checks and triggers are off for this load. The file is",
    "-- also the reset between cases, so it removes what it inserts.",
    "BEGIN;",
    "SET LOCAL session_replication_role = replica;",
    "",
    "DELETE FROM player_notifications; DELETE FROM admin_audit_events; DELETE FROM admin_player_email_edits;",
    "DELETE FROM player_social_links; DELETE FROM player_contact_change_requests; DELETE FROM player_password_reset_requests;",
    "DELETE FROM club_player_private_inputs; DELETE FROM club_players; DELETE FROM shared_player_entries;",
    "DELETE FROM player_accounts; DELETE FROM player_private_contacts; DELETE FROM player_id_allocations; DELETE FROM player_id_counters;",
    "DELETE FROM players; DELETE FROM club_accounts; DELETE FROM clubs; DELETE FROM admin_accounts;",
    "DELETE FROM auth_events WHERE audience = 'player'; DELETE FROM auth_sessions WHERE audience = 'player'; DELETE FROM auth_identities WHERE audience = 'player';",
    "",
    fixed(lines(29, 33, "INSERT INTO admin_accounts")),
    "",
    fixed(lines(52, 60, "INSERT INTO clubs")),
    "",
    fixed(lines(95, 161, "INSERT INTO player_id_counters")),
    "",
    fixed(lines(190, 205, "INSERT INTO player_contact_change_requests")),
    "",
    "-- ---- more registered players: Hana (a clean player in Cebu), Ivan (Manila, number 4: the CEB number 4 is Dan's),",
    "--      June (private, a club record in two clubs); their club records, contacts and accounts ----",
    "INSERT INTO players (id, full_name, nickname, avatar_ref, profile_visibility, profile_state, hide_phone_from_clubs, revision, updated_at) VALUES",
    "  ('%s', 'Hana Ocampo', NULL, NULL, 'public', 'claimed', false, 4, %s)," % (HANA, TS),
    "  ('%s', 'Ivan Cruz', 'Iv', 'https://example.test/ivan.png', 'private', 'claimed', false, 1, %s)," % (IVAN, TS),
    "  ('%s', 'June Tan', NULL, NULL, 'always_private', 'claimed', true, 2, %s);" % (JUNE, TS),
    "INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence) VALUES",
    "  ('%s', 'RTR-PH-CEB-102926-0014', '%s', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 14)," % (HANA, SMASH),
    "  ('%s', 'RTR-PH-MNL-102926-0004', '%s', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'PH', 'MNL', DATE '2026-10-29', 4)," % (IVAN, BIRDIE),
    "  ('%s', 'RTR-PH-CEB-102926-0016', '%s', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 16);" % (JUNE, SMASH),
    "INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ((SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), DATE '2026-10-29', 5);",
    "INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES",
    "  ('%s', '+639175550008', 'hana@example.test', %s)," % (HANA, TS),
    "  ('%s', '+639175550009', 'ivan@example.test', %s)," % (IVAN, TS),
    "  ('%s', '+639175550010', 'june@example.test', %s);" % (JUNE, TS),
    "INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, updated_at) VALUES",
    "  ('%s', 'supabase', 'f4000000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-10-05 00:00:00+00', 1, NULL, NULL, %s)," % (HANA, TS),
    "  ('%s', 'supabase', 'f4000000-0000-4000-8000-000000000009', TIMESTAMPTZ '2026-10-06 00:00:00+00', 1, NULL, NULL, %s)," % (IVAN, TS),
    "  ('%s', 'supabase', 'f4000000-0000-4000-8000-000000000010', TIMESTAMPTZ '2026-10-07 00:00:00+00', 1, 'june@gmail.test', TIMESTAMPTZ '2026-11-10 00:00:00+00', %s);" % (JUNE, TS),
    "INSERT INTO club_players (id, club_id, player_id, display_name, nickname, shared_entry_id, added_at, removed_at, revision, updated_at) VALUES",
    "  ('%s', '%s', '%s', 'Hana Ocampo', NULL, NULL, TIMESTAMPTZ '2026-10-06 00:00:00+00', NULL, 1, %s)," % (CP(31), SMASH, HANA, TS),
    "  ('%s', '%s', '%s', 'Ivan Cruz', 'Iv', NULL, TIMESTAMPTZ '2026-10-07 00:00:00+00', NULL, 1, %s)," % (CP(32), BIRDIE, IVAN, TS),
    "  ('%s', '%s', '%s', 'June Tan', NULL, NULL, TIMESTAMPTZ '2026-10-08 00:00:00+00', NULL, 1, %s)," % (CP(33), SMASH, JUNE, TS),
    "  ('%s', '%s', '%s', 'June T.', 'JT', NULL, TIMESTAMPTZ '2026-10-09 00:00:00+00', NULL, 1, %s);" % (CP(34), BIRDIE, JUNE, TS),
    "",
    "-- Hana registered from an entry: it is claimed, has no email, and holds the RTR ID Hana has (an Admin RTR ID change moves both)",
    "INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, claimed_player_id, claimed_at, retired_at, revision, updated_at) VALUES",
    "  ('a6000000-0000-4000-8000-000000000013', NULL, 'RTR-PH-CEB-102926-0014', '%s', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 14, TIMESTAMPTZ '2026-10-29 08:00:00+00', '%s', TIMESTAMPTZ '2026-10-05 00:00:00+00', NULL, 3, %s);" % (SMASH, HANA, TS),
    "",
    "-- ---- social links (Alice has two) ----",
    "INSERT INTO player_social_links (id, player_id, provider, url, updated_at) VALUES",
    "  ('5a000000-0000-4000-8000-000000000001', '%s', 'facebook', 'https://facebook.com/alice', %s)," % (ALICE, TS),
    "  ('5a000000-0000-4000-8000-000000000002', '%s', 'youtube', 'https://youtube.com/@alice', %s);" % (ALICE, TS),
    "",
    "-- ---- sign-in identities of the player accounts (login key = the contact email), and one that is nobody's ----",
    "UPDATE player_accounts SET auth_provider = 'rotra';",
    "INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision)",
    "SELECT a.auth_subject, 'player', lower(coalesce(c.email, 'login-' || a.player_id::text)), 'fake-hash-for-tests', 'argon2id', %s, %s, %s, 1" % (TS, TS, TS),
    "FROM player_accounts a LEFT JOIN player_private_contacts c ON c.player_id = a.player_id;",
    "INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision) VALUES",
    "  ('f5000000-0000-4000-8000-000000000001', 'player', 'taken@example.test', 'fake-hash-for-tests', 'argon2id', %s, %s, %s, 1);" % (TS, TS, TS),
    "",
    "COMMIT;",
    "",
]
open(os.path.join(OUT, "players.seed.sql"), "w").write("\n".join(seed))

# ---------------------------------------------------------------- what every case pins
CHANGED = "updated_at"
SNAPSHOT = [
    {"name": "players", "sql": "SELECT id, full_name, nickname, avatar_ref, avatar_previous_ref, profile_state, hide_phone_from_clubs, profile_visibility, show_profile_stats, banner_id, experience_months, experience_recorded_at, personal_details, details_version, updated_at, revision::text AS revision, verification_override, verification_override_by, verification_override_at FROM players ORDER BY id", "redact": []},
    {"name": "player_private_contacts", "sql": "SELECT player_id, phone_e164, email, phone_verified_at, email_verified_at, updated_at, revision::text AS revision FROM player_private_contacts ORDER BY player_id", "redact": []},
    {"name": "player_accounts", "sql": "SELECT player_id, contact_sync_status, contact_sync_version::text AS contact_sync_version, disabled_at, google_email, verification_reminder_read_at, updated_at, revision::text AS revision FROM player_accounts ORDER BY player_id", "redact": []},
    {"name": "player_social_links", "sql": "SELECT player_id, provider, url, updated_at FROM player_social_links ORDER BY player_id, provider", "redact": []},
    {"name": "player_id_allocations", "sql": "SELECT player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date::text AS sync_date, sequence FROM player_id_allocations ORDER BY player_id", "redact": []},
    {"name": "player_id_counters", "sql": "SELECT location_code_id, sync_date::text AS sync_date, last_sequence FROM player_id_counters ORDER BY location_code_id, sync_date", "redact": []},
    {"name": "shared_player_entries", "sql": "SELECT id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date::text AS sync_date, sequence, claimed_player_id, retired_at, updated_at, revision::text AS revision FROM shared_player_entries ORDER BY id", "redact": []},
    {"name": "club_players", "sql": "SELECT id, club_id, player_id, shared_entry_id, display_name, nickname, added_at, removed_at, updated_at, revision::text AS revision, EXISTS (SELECT 1 FROM admin_audit_events a WHERE a.action = 'player.created' AND a.target_id = club_players.id::text) AS audited, EXISTS (SELECT 1 FROM club_player_private_inputs i WHERE i.club_player_id = club_players.id AND i.club_id = club_players.club_id) AS has_input FROM club_players ORDER BY club_id, display_name, added_at, id", "redact": ["id"]},
    {"name": "club_player_private_inputs", "sql": "SELECT club_player_id, club_id, phone_e164, email, preset_fields, captured_at, state, resolved_player_id, resolved_at, updated_at, revision::text AS revision FROM club_player_private_inputs ORDER BY club_id, phone_e164, captured_at, club_player_id", "redact": ["club_player_id"]},
    {"name": "player_contact_change_requests", "sql": "SELECT id, player_id, field, status, proposed_value, reviewed_by_admin_id, reviewed_at, rejected_at, superseded_at, resolution_note, updated_at, revision::text AS revision FROM player_contact_change_requests ORDER BY id", "redact": []},
    {"name": "admin_player_email_edits", "sql": "SELECT id, player_id, admin_id, original_email, proposed_email, contact_revision::text AS contact_revision, state, updated_at FROM admin_player_email_edits ORDER BY player_id, proposed_email, state, id", "redact": ["id"]},
    {"name": "admin_audit_events", "sql": "SELECT id, actor_admin_id, action, target_type, target_id, source_command_id, occurred_at, metadata - 'operationId' AS metadata, (metadata ? 'operationId') AS has_operation FROM admin_audit_events ORDER BY action, occurred_at, metadata::text, target_id", "redact": ["id"]},
    {"name": "audit_operations", "sql": "SELECT count(*) AS events, count(DISTINCT metadata->>'operationId') AS operations FROM admin_audit_events WHERE metadata ? 'operationId'", "redact": []},
    {"name": "player_notifications", "sql": "SELECT id, player_id, kind, title, body, target, source_type, (source_id IN (SELECT id FROM admin_audit_events)) AS source_is_audit, read_at FROM player_notifications ORDER BY player_id, kind, source_type, title", "redact": ["id"]},
]
NOW = "2026-11-19T04:00:00.000Z"


def write_cases(name, cases, scenarios=None):
    out = {
        "now": NOW,
        "app": "admin",
        "seed": "players.seed.sql",
        "scenarios": {"base": [], **(scenarios or {})},
        "snapshot": SNAPSHOT,
        "cases": cases,
    }
    with open(os.path.join(OUT, name + ".cases.json"), "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")


class Cases:
    def __init__(self):
        self.list = []

    def __call__(self, name, steps, scenario="base", redact=None):
        c = {"name": name, "scenario": scenario, "steps": steps}
        if redact:
            c["redact"] = redact
        self.list.append(c)


def step(method, path, body=None, who=OWNER, raw=None, **kw):
    s = {"method": method, "path": path, "who": who}
    if raw is not None:
        s["rawBody"] = raw
    elif body is not None:
        s["body"] = body
    s.update(kw)
    return s


UNAUTH = {"status": 401, "code": "unauthenticated"}


def guards(case, mk, label):
    """The pass check comes before the body, the ID and the database."""
    case("guard_no_session_" + label, [mk(None)])
    case("guard_former_admin_" + label, [mk(FORMER, goExpects=UNAUTH)])
    case("guard_unknown_subject_" + label, [mk(UNKNOWN, goExpects=UNAUTH)])


# ================================================================ PATCH /api/players/{id}/verification
vp = lambda i: "/api/players/%s/verification" % i
verify = lambda i, rev, flag="__absent__", reason="Checked the ID in person", who=OWNER, **kw: step(
    "PATCH", vp(i), {k: v for k, v in {"revision": rev, "verifiedByAdmin": flag, "reason": reason}.items() if v != "__absent__"}, who=who, **kw)

v = Cases()
guards(v, lambda w, **kw: verify(ALICE, "3", True, who=w, **kw), "set")
v("guard_beats_a_bad_body", [step("PATCH", vp(ALICE), raw="not json", who=None)])
v("set_verified", [verify(ALICE, "3", True)])
v("set_verified_by_the_second_admin", [verify(ALICE, "3", True, who=SECOND)])
v("set_verified_trims_the_reason", [verify(ALICE, "3", True, reason="  spaced out \n")])
v("set_verified_with_a_long_reason", [verify(ALICE, "3", True, reason="x" * 1000)])
v("set_verified_a_player_with_google_and_all_steps", [verify(JUNE, "2", True)])
v("set_verified_then_clear", [verify(ALICE, "3", True), verify(ALICE, "4", False, reason="Mistake")])
v("set_verified_twice_with_the_old_revision", [verify(ALICE, "3", True), verify(ALICE, "3", True)])
v("set_verified_twice_with_the_new_revision_changes_nothing", [verify(ALICE, "3", True), verify(ALICE, "4", True, reason="Again")])
v("set_verified_when_already_verified_changes_nothing", [verify(BOB, "9007199254740993", True)])
v("clear_the_override", [verify(BOB, "9007199254740993", False, reason="Rescinded")])
v("clear_when_not_overridden_changes_nothing", [verify(ALICE, "3", False)])
v("clear_then_set_again", [verify(BOB, "9007199254740993", False), verify(BOB, "9007199254740994", True, reason="Back")])
v("player_without_an_account_gets_no_notification", [verify(GINA, "1", True)])
v("stale_revision", [verify(ALICE, "2", True)])
v("stale_revision_is_checked_before_the_value", [verify(BOB, "1", True)])
v("revision_too_big", [verify(ALICE, "99999999999999999999999", True)])
v("revision_precision", [verify(BOB, "9007199254740992", True), verify(BOB, "9007199254740993", False, reason="Exact")])
for n, rev in [("empty", ""), ("zero", "0"), ("negative", "-1"), ("leading_zero", "03"), ("text", "abc"), ("decimal", "3.0"), ("plus", "+3"), ("spaces", " 3 "), ("hex", "0x3")]:
    v("revision_" + n, [verify(ALICE, rev, True)])
v("revision_absent", [verify(ALICE, "__absent__", True)])
v("revision_is_a_number_not_text", [step("PATCH", vp(ALICE), {"revision": 3, "verifiedByAdmin": True, "reason": "r"})])
for n, flag in [("absent", "__absent__"), ("string", "true"), ("null", None), ("number", 1), ("object", {}), ("array", [True])]:
    v("verified_by_admin_" + n, [verify(ALICE, "3", flag)])
for n, reason in [("empty", ""), ("spaces", "   "), ("absent", "__absent__"), ("number", 5), ("null", None)]:
    v("reason_" + n, [verify(ALICE, "3", True, reason=reason)])
v("reason_is_checked_before_the_flag", [verify(ALICE, "3", "yes", reason="")])
v("flag_is_checked_before_the_revision", [verify(ALICE, "x", "yes")])
v("player_unknown", [verify(P(99), "1", True)])
v("player_unclaimed", [verify(DAN, "1", True), verify(ERIN, "2", True)])
v("player_not_registered_id_a_shared_entry", [verify(E(7), "1", True)])
v("player_claimed_without_an_account", [verify(FRANK, "1", True)])
v("player_id_is_not_a_uuid", [verify("not-a-uuid", "1", True), verify("D4000000-0000-4000-8000-000000000001", "3", True)])
v("id_is_checked_before_the_reason", [verify("nope", "1", True, reason="")])
for n, raw in [("empty", ""), ("not_json", "not json"), ("array", "[]"), ("null", "null"), ("trailing_text", '{"revision":"3"} x')]:
    v("body_" + n, [step("PATCH", vp(ALICE), raw=raw)])
v("ignores_unknown_fields", [step("PATCH", vp(ALICE), {"revision": "3", "verifiedByAdmin": True, "reason": "r", "playerId": BOB, "verified": False})])
v("race_two_sets_with_one_revision", [{"parallel": [verify(ALICE, "3", True), verify(ALICE, "3", True, reason="Second")]}],
  redact={"admin_audit_events": ["metadata"]})
v("race_two_players", [{"parallel": [verify(ALICE, "3", True), verify(HANA, "4", True)]}])
write_cases("playerverify", v.list)

# ================================================================ POST /api/players (Add player)
PP = "/api/players"
good = lambda **kw: {**{"name": "Nina Park", "nickname": "", "phone": "0917 555 0199", "email": "", "place": "CEB", "clubId": SMASH, "allowDuplicate": False}, **kw}
create = lambda body, who=OWNER, **kw: step("POST", PP, body, who=who, **kw)
without = lambda key, **kw: {k: v for k, v in good(**kw).items() if k != key}
# the new club record's ID (the response's player ID, the audit event's target) is generated
NEWID = ["player.id"]
NEWRED = {"admin_audit_events": ["target_id"]}
c = Cases()


def add(name, steps, **kw):
    c(name, steps, redact={**NEWRED, **kw.pop("redact", {})}, **kw)


guards(add, lambda w, **kw: create(good(), who=w, **kw), "add")
add("guard_beats_a_bad_body", [step("POST", PP, raw="not json", who=None)])
add("add_with_a_phone_only", [create(good(), redact=NEWID)])
add("add_by_the_second_admin", [create(good(), who=SECOND, redact=NEWID)])
add("add_with_a_nickname_and_an_email", [create(good(nickname="Nin", email="nina@example.test"), redact=NEWID)])
add("add_trims_the_name_and_the_nickname", [create(good(name="  Nina   Park \n", nickname="  Nin\t"), redact=NEWID)])
add("add_lowercases_the_email", [create(good(email="  Nina.Park+Club@Example.TEST "), redact=NEWID)])
add("add_an_email_in_the_private_input_only_may_repeat", [create(good(email="una@example.test"), redact=NEWID)])
add("add_in_manila", [create(good(place="MNL", clubId=BIRDIE), redact=NEWID)])
add("add_in_davao", [create(good(place="DVO", clubId=NINJAS), redact=NEWID)])
add("add_to_a_club_with_no_account", [create(good(clubId=NOACC), redact=NEWID)])
add("add_ignores_allow_duplicate", [create(good(allowDuplicate=True), redact=NEWID)])
add("add_ignores_unknown_fields", [create({**good(), "rtrId": "RTR-PH-CEB-102926-0099", "playerId": ALICE}, redact=NEWID)])
add("add_a_unicode_name", [create(good(name="Zoë Ångström 😀"), redact=NEWID)])
add("add_a_name_of_60_characters", [create(good(name="n" * 60), redact=NEWID)])
add("add_a_nickname_of_60_characters", [create(good(nickname="k" * 60), redact=NEWID)])
add("add_the_number_of_a_removed_record_is_free", [create(good(phone="+639175550923"), redact=NEWID)])
add("add_the_number_of_a_record_of_another_club_is_free", [create(good(phone="+639175550912"), redact=NEWID)])
add("add_two_players_in_one_club", [create(good(), redact=NEWID), create(good(name="Omar Diaz", phone="0917 555 0198", email="omar@example.test"), redact=NEWID)])
for n, phone in [("plus_63", "+63 917 555 0199"), ("63", "639175550199"), ("hyphens", "0917-555-0199"), ("e164", "+639175550199"), ("padded", "  09175550199  ")]:
    add("add_phone_" + n, [create(good(phone=phone), redact=NEWID)])
add("add_the_same_number_twice", [create(good(), redact=NEWID), create(good(name="Other Nina"))])
add("add_the_same_number_in_another_form_twice", [create(good(), redact=NEWID), create(good(name="Other Nina", phone="+63 917 555 0199"))])
add("add_a_number_a_club_record_has", [create(good(phone="0917 555 0921"))])
add("add_a_number_a_club_record_has_in_the_other_club", [create(good(phone="+639175550912", clubId=SMASH), redact=NEWID)])
add("add_a_number_a_registered_player_has", [create(good(phone="0917 555 0001"))])
add("add_a_number_an_unclaimed_player_has", [create(good(phone="+639175550004"))])
add("add_an_email_a_registered_player_has", [create(good(email="alice@example.test"))])
add("add_an_email_in_another_case_a_registered_player_has", [create(good(email="BOB@Example.Test"))])
add("add_an_email_an_unclaimed_player_has", [create(good(email="dan@example.test"))])
add("add_a_number_registered_comes_before_the_saved_one", [create(good(phone="+639175550001", email="dan@example.test"))])
add("add_the_registered_email_beats_the_saved_number", [create(good(phone="+639175550921", email="alice@example.test"))])
add("add_the_place_is_not_the_clubs", [create(good(place="MNL"))])
add("add_the_place_is_not_the_clubs_in_davao", [create(good(place="CEB", clubId=NINJAS))])
add("add_a_place_from_the_list_but_not_the_clubs", [create(good(place="TAG", clubId=BIRDIE))])
add("add_the_place_is_checked_before_the_phone", [create(good(place="MNL", phone="+639175550001"))])
add("add_unknown_club", [create(good(clubId="c9000000-0000-4000-8000-0000000000ff"))])
add("add_club_id_is_not_a_uuid", [create(good(clubId="not-a-club"), goExpects={"status": 422, "code": "invalid"}, allow500=True)])
add("add_club_id_in_upper_case", [create(good(clubId=SMASH.upper()), redact=NEWID)])
add("add_club_id_empty", [create(good(clubId=""))])
add("add_club_id_spaces", [create(good(clubId="  "), goExpects={"status": 422, "code": "invalid"}, allow500=True)])
add("add_club_comes_before_the_phone", [create(good(clubId="", phone=""))])
add("add_phone_empty", [create(good(phone=""))])
add("add_phone_empty_with_an_unknown_club", [create(good(phone="", clubId="c9000000-0000-4000-8000-0000000000ff"))])
add("add_phone_spaces", [create(good(phone="   "))])
for n, phone in [("short", "0917 555 019"), ("long", "0917 555 01999"), ("no_zero", "917 555 0199"), ("us", "+1 917 555 0142"), ("letters", "0917 555 0O99"), ("landline", "02 8555 0199"), ("dots", "0917.555.0199"), ("plus_in_the_middle", "09+175550199")]:
    add("add_phone_" + n + "_is_refused", [create(good(phone=phone))])
for n, email in [("no_at", "nina.example.test"), ("no_domain_dot", "nina@example"), ("spaces_inside", "ni na@example.test"), ("two_ats", "a@b@example.test"), ("trailing_dot_domain", "nina@example."), ("leading_dot", ".nina@example.test"), ("double_dot", "ni..na@example.test"), ("tld_of_one", "nina@example.t"), ("unicode_local", "nín@example.test")]:
    add("add_email_" + n + "_is_refused", [create(good(email=email))])
add("add_email_with_an_apostrophe_and_a_plus", [create(good(email="o'neil+club@example.test"), redact=NEWID)])
add("add_email_of_a_subdomain", [create(good(email="nina@mail.example.co.ph"), redact=NEWID)])
for n, place in [("lower_case", "ceb"), ("unknown", "XYZ"), ("empty", ""), ("padded", " CEB "), ("number", 1), ("null", None)]:
    add("add_place_" + n + "_is_refused", [create(good(place=place))])
for n, name in [("empty", ""), ("spaces", "   "), ("61_characters", "n" * 61), ("a_non_breaking_space", "\u00a0")]:
    add("add_name_" + n, [create(good(name=name))])
add("add_name_zero_width_space_is_not_white_space", [create(good(name="\u200b"), redact=NEWID)])
add("add_name_of_61_characters_after_trimming_is_60", [create(good(name=" " + "n" * 60 + " "), redact=NEWID)])
add("add_name_of_60_emoji", [create(good(name="😀" * 60), redact=NEWID)])
add("add_name_of_61_emoji", [create(good(name="😀" * 61))])
add("add_email_spaces_is_refused_as_an_email", [create(good(email="   "))])
add("add_name_of_30_emoji", [create(good(name="😀" * 30), redact=NEWID)])
add("add_nickname_of_61_characters", [create(good(nickname="k" * 61))])
add("add_nickname_spaces_is_empty", [create(good(nickname="   "), redact=NEWID)])
for key in ["name", "nickname", "phone", "email", "place", "clubId", "allowDuplicate"]:
    add("add_missing_" + key, [create(without(key))])
for key, bad in [("name", 5), ("name", None), ("name", ["x"]), ("nickname", 5), ("nickname", None), ("phone", 917), ("phone", None), ("phone", True), ("email", 5), ("email", None), ("clubId", 5), ("clubId", None), ("allowDuplicate", "no"), ("allowDuplicate", None), ("allowDuplicate", 0), ("place", {}), ("name", {"a": 1})]:
    add("add_%s_of_the_wrong_type_%s" % (key, type(bad).__name__), [create(good(**{key: bad}))])
add("add_everything_wrong_names_the_first_message_of_each_field", [create({"name": "", "nickname": "k" * 61, "phone": "x", "email": "x", "place": "x", "clubId": 1, "allowDuplicate": 1})])
add("add_the_schema_is_checked_before_the_club", [create(good(name="", clubId=""))])
for n, raw in [("empty", ""), ("not_json", "not json"), ("array", "[]"), ("null", "null"), ("string", '"x"'), ("trailing_text", "{} x")]:
    add("add_body_" + n, [step("POST", PP, raw=raw)])
add("add_no_body", [step("POST", PP)])
write_cases("playercreate", c.list)

# ================================================================ PATCH /api/players/{id} (Edit)
ep = lambda i: "/api/players/%s" % i
# what the Edit form holds for a player as loaded (so changing one key is one change); `rev` is the loaded revision
BASE = {"picture": None, "name": "", "nickname": "", "playingStyle": "", "experienceYears": "", "experienceMonths": "", "facebook": "", "instagram": "",
        "youtube": "", "linkedin": "", "profilePrivate": False, "phoneHidden": False, "phone": "", "email": "", "password": "", "reason": "",
        "registrationPlace": "", "registrationDate": ""}
PLAYERS = {
    HANA: ("4", {"name": "Hana Ocampo", "phone": "+639175550008", "email": "hana@example.test", "registrationPlace": "PH-CEB", "registrationDate": "2026-10-29"}),
    ALICE: ("3", {"name": "Alice Reyes", "nickname": "Ace", "playingStyle": "Aggressive net player", "experienceYears": "3", "experienceMonths": "0",
                  "facebook": "https://facebook.com/alice", "youtube": "https://youtube.com/@alice", "picture": "https://example.test/alice.png",
                  "phone": "+639175550001", "email": "alice@example.test", "registrationPlace": "PH-CEB", "registrationDate": "2026-10-29"}),
    BOB: ("9007199254740993", {"name": "Bob Santos", "experienceYears": "0", "experienceMonths": "5", "profilePrivate": True, "phoneHidden": True,
                               "phone": "+639175550002", "email": "bob@example.test", "registrationPlace": "PH-CEB", "registrationDate": "2026-10-29"}),
    CARLA: ("1", {"name": "Carla Dizon", "nickname": "CD", "picture": "character:a", "profilePrivate": True, "phoneHidden": True,
                  "phone": "+639175550003", "registrationPlace": "PH-CEB", "registrationDate": "2026-10-29"}),
    GINA: ("1", {"name": "Gina Claimed No Contact", "registrationPlace": "PH-CEB", "registrationDate": "2026-10-29"}),
    IVAN: ("1", {"name": "Ivan Cruz", "nickname": "Iv", "picture": "https://example.test/ivan.png", "profilePrivate": True,
                 "phone": "+639175550009", "email": "ivan@example.test", "registrationPlace": "PH-MNL", "registrationDate": "2026-10-29"}),
    JUNE: ("2", {"name": "June Tan", "profilePrivate": True, "phoneHidden": True, "phone": "+639175550010", "email": "june@example.test",
                 "registrationPlace": "PH-CEB", "registrationDate": "2026-10-29"}),
}


def vals(player, **kw):
    return {**BASE, **PLAYERS[player][1], **kw}


def edit(player, rev=None, who=OWNER, values="__v__", **kw):
    """One PATCH of `player` with the form as loaded and `kw` changed (the reason is given with it)."""
    body = {"revision": PLAYERS[player][0] if rev is None else rev, "values": vals(player, **kw) if values == "__v__" else values}
    return step("PATCH", ep(player), body, who=who)


def edit_raw(player, body, who=OWNER, **kw):
    return step("PATCH", ep(player), body, who=who, **kw)


e = Cases()
guards(e, lambda w, **kw: {**edit(HANA, name="Hana O.", reason="r", who=w), **kw}, "edit")
e("guard_beats_a_bad_body", [step("PATCH", ep(HANA), raw="not json", who=None)])
R = "Corrected on request"

# ---- nothing changed, and the profile fields ----
e("nothing_changed", [edit(HANA)])
e("nothing_changed_with_a_reason_and_a_typed_phone", [edit(HANA, phone="0917 555 0008", reason="no need")])
e("nothing_changed_for_every_registered_player", [edit(p) for p in [ALICE, BOB, CARLA, JUNE, IVAN]])
e("nothing_changed_compares_the_experience_as_it_is_now", [edit(ALICE, experienceYears="3", experienceMonths="0")])
e("rename", [edit(HANA, name="Hana Ocampo-Lim", reason=R)])
e("rename_by_the_second_admin", [edit(HANA, name="Hana Ocampo-Lim", reason=R, who=SECOND)])
e("rename_trims_name_nickname_and_reason", [edit(HANA, name="  Hana  Lim ", nickname="  Han ", reason="  " + R + " \n")])
e("nickname_set_and_cleared", [edit(HANA, nickname="Han", reason=R), edit(HANA, rev="5", nickname="", reason=R)])
e("nickname_cleared", [edit(ALICE, nickname="", reason=R)])
e("playing_style", [edit(HANA, playingStyle="  Defensive  ", reason=R)])
e("playing_style_cleared", [edit(ALICE, playingStyle="", reason=R)])
e("experience_set", [edit(HANA, experienceYears="2", experienceMonths="3", reason=R)])
e("experience_years_only", [edit(HANA, experienceYears="4", reason=R)])
e("experience_months_only", [edit(HANA, experienceMonths="7", reason=R)])
e("experience_cleared", [edit(ALICE, experienceYears="", experienceMonths="", reason=R)])
e("experience_changed_records_now", [edit(ALICE, experienceYears="5", experienceMonths="1", reason=R)])
e("experience_to_the_same_total_keeps_the_record", [edit(ALICE, experienceYears="2", experienceMonths="12", reason=R)])
e("experience_of_a_player_with_none_and_the_same", [edit(HANA, experienceYears="0", experienceMonths="0", reason=R)])
e("profile_private_on_and_off", [edit(HANA, profilePrivate=True, reason=R), edit(HANA, rev="5", profilePrivate=False, reason=R)])
e("profile_private_off_for_a_private_player", [edit(IVAN, profilePrivate=False, reason=R)])
e("profile_private_off_for_an_always_private_player", [edit(JUNE, profilePrivate=False, reason=R)])
e("always_private_stays_when_still_private_and_something_else_changes", [edit(JUNE, name="June T.", reason=R)])
e("phone_privacy", [edit(HANA, phoneHidden=True, reason=R)])
e("phone_privacy_off", [edit(BOB, phoneHidden=False, reason=R)])
e("every_profile_field_at_once", [edit(HANA, name="Hana H.", nickname="H", playingStyle="Smash", experienceYears="1", experienceMonths="1",
                                        profilePrivate=True, phoneHidden=True, facebook="https://facebook.com/hana", instagram="https://www.instagram.com/hana",
                                        youtube="https://youtu.be/xyz", linkedin="https://linkedin.com/in/hana", reason=R)])
e("a_reason_of_300_characters", [edit(HANA, name="Hana L.", reason="r" * 300)])
e("a_reason_of_301_characters", [edit(HANA, name="Hana L.", reason="r" * 301)])
e("no_reason_when_something_changed", [edit(HANA, name="Hana L.")])
e("no_reason_when_something_changed_spaces", [edit(HANA, name="Hana L.", reason="   ")])
e("the_reason_is_checked_after_the_revision", [edit(HANA, rev="1", name="Hana L.")])
# ---- links ----
for prov, url in [("facebook", "https://facebook.com/hana"), ("instagram", "https://instagram.com/hana"), ("youtube", "https://youtube.com/@hana"), ("linkedin", "https://linkedin.com/in/hana")]:
    e("link_" + prov + "_added", [edit(HANA, reason=R, **{prov: url})])
e("link_replaced", [edit(ALICE, reason=R, facebook="https://m.facebook.com/alice2")])
e("link_removed", [edit(ALICE, reason=R, facebook="", youtube="")])
e("link_trimmed", [edit(HANA, reason=R, facebook="  https://fb.com/hana  ")])
e("link_an_upper_case_scheme_is_valid_but_the_table_refuses_it", [{**edit(HANA, reason=R, facebook="HTTPS://facebook.com/hana"), "goExpects": {"status": 422, "code": "invalid"}, "allow500": True}])
e("link_hosts_are_provider_or_subdomain", [edit(HANA, reason=R, facebook="https://web.facebook.com/hana", instagram="https://INSTAGRAM.com/hana", youtube="https://music.youtube.com/x")])
for n, url in [("other_site", "https://example.com/hana"), ("lookalike", "https://facebook.com.evil.example/hana"), ("no_scheme", "facebook.com/hana"), ("ftp", "ftp://facebook.com/hana"), ("spaces", "https://facebook.com/ha na"), ("userinfo", "https://user@facebook.com/hana"), ("port", "https://facebook.com:8443/hana"), ("single_slash", "https:/facebook.com/hana"), ("no_slashes", "https:facebook.com/hana"), ("backslashes", "https:\\\\facebook.com\\hana")]:
    e("link_" + n, [{**edit(HANA, reason=R, facebook=url), **({"goExpects": {"status": 422, "code": "invalid"}, "allow500": True} if n in ("single_slash", "no_slashes", "backslashes") else {})}])
for n, url in [("percent_encoded_host", "https://%66acebook.com/hana"), ("tab_inside_the_host", "https://face\tbook.com/hana"), ("backslash_after_the_host", "https://facebook.com\\hana"), ("empty_port", "https://facebook.com:/hana"), ("big_port", "https://facebook.com:99999/hana"), ("trailing_dot_host", "https://facebook.com./hana"), ("query_only", "https://facebook.com?x=1"), ("fullwidth_host", "https://\uff46acebook.com/hana"), ("userinfo_lookalike", "https://facebook.com@evil.example/hana"), ("uppercase_host", "https://FACEBOOK.COM/hana"), ("empty_host", "https:///hana"), ("ipv6_host", "https://[::1]/hana")]:
    e("link_" + n, [{**edit(HANA, reason=R, facebook=url), **({"goExpects": {"status": 422, "code": "invalid"}, "allow500": True} if False else {})}])
e("link_http_passes_the_form_and_the_table_refuses_it", [{**edit(HANA, reason=R, facebook="http://facebook.com/hana"), "goExpects": {"status": 422, "code": "invalid"}, "allow500": True}])
e("link_the_wrong_provider", [edit(HANA, reason=R, instagram="https://facebook.com/hana")])
# ---- pictures ----
e("picture_a_character", [edit(HANA, reason=R, picture="character:a")])
e("picture_changed_twice", [edit(HANA, reason=R, picture="character:a"), edit(HANA, rev="5", reason=R, picture="character:c")])
e("picture_back_to_the_previous_one", [edit(ALICE, reason=R, picture="https://example.test/alice-old.png")])
e("picture_back_to_the_previous_one_swaps_them", [edit(ALICE, reason=R, picture="https://example.test/alice-old.png"), edit(ALICE, rev="4", reason=R, picture="https://example.test/alice.png")])
e("picture_cleared", [edit(ALICE, reason=R, picture=None)])
e("picture_a_character_that_is_hidden", [edit(HANA, reason=R, picture="character:b")], scenario="character_b_hidden")
e("picture_a_character_that_is_deleted", [edit(HANA, reason=R, picture="character:b")], scenario="character_b_deleted")
e("picture_a_character_that_is_not_there", [edit(HANA, reason=R, picture="character:zzz")])
e("picture_the_previous_character_is_allowed_even_when_hidden", [edit(HANA, reason=R, picture="character:a"), edit(HANA, rev="5", reason=R, picture="character:c")], scenario="character_a_hidden_after")
e("picture_a_link_that_was_never_the_players", [edit(HANA, reason=R, picture="https://elsewhere.example/p.png")])
e("picture_not_a_picture", [edit(HANA, reason=R, picture="p.png")])
e("picture_empty_text", [edit(HANA, reason=R, picture="")])
e("picture_unchanged_is_not_checked", [edit(ALICE, name="Alice R.", reason=R)], scenario="alice_picture_not_a_link")
e("picture_an_upload_that_is_not_an_image", [edit(HANA, reason=R, picture="data:image/png;base64,AAAA")])
e("picture_an_upload_with_the_wrong_type", [edit(HANA, reason=R, picture="data:image/gif;base64,R0lGODlhAQABAAAAACw=")])
e("picture_an_upload_that_is_not_base64", [edit(HANA, reason=R, picture="data:image/png;base64,@@@@")])
# a 192 x 192 PNG header (the rest does not matter to the byte checks) and a JPEG start, both of at least 24 bytes
PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADA"
JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAAAAAAAAAAAAAAAAAAAAAA="
e("picture_a_png_upload_that_the_store_would_take", [edit(HANA, reason=R, picture=PNG)])
e("picture_a_jpeg_upload_that_the_store_would_take", [edit(HANA, reason=R, picture=JPG)])
e("picture_a_png_of_the_wrong_size", [edit(HANA, reason=R, picture="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAAgAAAAAAAAAAAAAAAAAAAAAAAAA")])
# ---- phone ----
e("phone_changed", [edit(HANA, reason=R, phone="0917 555 0100")])
e("phone_changed_in_e164", [edit(HANA, reason=R, phone="+639175550100")])
e("phone_typed_another_way_is_no_change", [edit(HANA, reason=R, phone="0917-555-0008")])
e("phone_changed_makes_the_account_resync", [edit(ALICE, reason=R, phone="0917 555 0100")])
e("phone_changed_supersedes_the_pending_request", [edit(ALICE, reason=R, phone="0917 555 0100")])
e("phone_changed_leaves_a_failed_sync_alone", [edit(HANA, reason=R, phone="0917 555 0100")], scenario="hana_sync_failed")
e("phone_another_players_number", [edit(HANA, reason=R, phone="0917 555 0001")])
e("phone_an_unclaimed_players_number", [edit(HANA, reason=R, phone="0917 555 0004")])
e("phone_a_club_records_number_is_not_checked", [edit(HANA, reason=R, phone="0917 555 0921")])
e("phone_with_an_active_request", [edit(BOB, reason=R, phone="0917 555 0100")])
e("phone_with_an_approved_request", [edit(HANA, reason=R, phone="0917 555 0100")], scenario="hana_approved_request")
e("phone_with_a_failed_request", [edit(HANA, reason=R, phone="0917 555 0100")], scenario="hana_failed_request")
e("phone_with_a_pending_email_request_only", [edit(CARLA, reason=R, phone="0917 555 0100")])
e("phone_cleared", [edit(HANA, reason=R, phone="")])
e("phone_of_a_player_with_no_contact", [edit(GINA, reason=R, phone="0917 555 0100")])
e("phone_a_bad_number", [edit(HANA, reason=R, phone="0917 555")])
e("phone_the_check_comes_after_the_other_fields_saved_nothing", [edit(HANA, reason=R, name="Hana X.", phone="0917 555 0001")])
# ---- revision ----
e("stale_revision", [edit(HANA, rev="3", reason=R, name="Hana L.")])
e("stale_revision_with_nothing_changed", [edit(HANA, rev="3")])
e("revision_after_a_save", [edit(HANA, reason=R, name="Hana L."), edit(HANA, rev="4", reason=R, name="Hana M."), edit(HANA, rev="5", reason=R, name="Hana M.")])
e("revision_a_big_one", [edit(BOB, reason=R, name="Bob S.")])
for n, rev in [("empty", ""), ("text", "abc"), ("decimal", "4.0"), ("negative", "-4"), ("spaces", " 4 "), ("hex", "0x4"), ("plus", "+4"), ("leading_zeros", "004")]:
    e("revision_" + n, [edit(HANA, rev=rev, reason=R, name="Hana L.")])
e("revision_absent", [edit_raw(HANA, {"values": vals(HANA, name="Hana L.", reason=R)})])
e("revision_a_number", [edit_raw(HANA, {"revision": 4, "values": vals(HANA, name="Hana L.", reason=R)})])
# ---- who can be edited ----
e("player_unknown", [edit(HANA, reason=R, name="x") | {"path": ep(P(99))}])
e("player_not_a_uuid", [edit(HANA, reason=R, name="x") | {"path": ep("not-a-uuid"), "goExpects": {"status": 404, "code": "not_found"}, "allow500": True}])
e("player_unclaimed", [edit(HANA, reason=R, name="x") | {"path": ep(ERIN)}])
e("player_unclaimed_with_an_entry_open_for_registration", [edit(HANA, reason=R, name="x") | {"path": ep(DAN)}])
e("player_claimed_without_an_id", [edit(HANA, reason=R, name="x") | {"path": ep(FRANK)}])
e("player_in_upper_case", [edit(HANA, reason=R, name="Hana L.") | {"path": ep(HANA.upper())}])
e("player_a_club_only_record", [edit(HANA, reason=R, name="x") | {"path": ep(CP(21))}])
e("player_with_no_contact_nothing_changed", [edit(GINA)])
e("player_with_no_contact_renamed", [edit(GINA, reason=R, name="Gina C.")])
# ---- the form: Zod ----
e("values_missing", [edit_raw(HANA, {"revision": "4"}, goExpects={"status": 422, "code": "invalid"}, allow500=True)])
e("values_null", [edit_raw(HANA, {"revision": "4", "values": None}, goExpects={"status": 422, "code": "invalid"}, allow500=True)])
for n, val in [("a_string", "x"), ("a_number", 5), ("an_array", []), ("an_object_with_nothing", {}), ("true", True)]:
    e("values_" + n, [edit_raw(HANA, {"revision": "4", "values": val})])
e("values_not_an_object_for_an_unclaimed_player", [edit_raw(ERIN, {"revision": "2", "values": None})])
for key in ["picture", "name", "nickname", "playingStyle", "experienceYears", "experienceMonths", "facebook", "instagram", "youtube", "linkedin", "profilePrivate", "phoneHidden", "phone", "email", "password", "reason"]:  # gitleaks:allow (a field name, not a secret)
    e("values_missing_" + key, [edit_raw(HANA, {"revision": "4", "values": {k: v for k, v in vals(HANA, reason=R).items() if k != key}})])
for key, bad in [("name", 5), ("name", None), ("nickname", 5), ("playingStyle", None), ("experienceYears", 3), ("experienceMonths", None), ("facebook", 5), ("profilePrivate", "yes"), ("phoneHidden", None), ("phone", 5), ("email", None), ("password", 5), ("reason", 5), ("picture", 5), ("registrationPlace", 5), ("registrationDate", 5)]:
    e("values_%s_of_the_wrong_type_%s" % (key, type(bad).__name__), [edit(HANA, **{"reason": R, key: bad})])
for key in ["registrationPlace", "registrationDate"]:
    e("values_" + key + "_absent", [edit_raw(HANA, {"revision": "4", "values": {k: v for k, v in vals(HANA, name="Hana L.", reason=R).items() if k != key}})])
e("name_empty", [edit(HANA, name="")])
e("name_spaces", [edit(HANA, name="   ", reason=R)])
e("name_61_characters", [edit(HANA, name="n" * 61, reason=R)])
e("name_60_characters", [edit(HANA, name="n" * 60, reason=R)])
e("nickname_31_characters", [edit(HANA, nickname="k" * 31, reason=R)])
e("nickname_30_characters", [edit(HANA, nickname="k" * 30, reason=R)])
e("playing_style_281_characters", [edit(HANA, playingStyle="s" * 281, reason=R)])
e("playing_style_280_characters", [edit(HANA, playingStyle="s" * 280, reason=R)])
for key, bad in [("experienceYears", "81"), ("experienceYears", "1.5"), ("experienceYears", "-1"), ("experienceYears", "x"), ("experienceYears", "80"), ("experienceMonths", "12"), ("experienceMonths", "11"), ("experienceMonths", "-1"), ("experienceMonths", "1e1"), ("experienceYears", "٣")]:
    e("experience_%s_%s" % (key, bad), [edit(HANA, reason=R, **{key: bad})])
e("email_blank_for_a_registered_player", [edit(HANA, reason=R, email="")])
e("email_blank_for_a_registered_player_who_never_had_one", [edit(CARLA, reason=R, name="Carla D.")])
e("email_blank_for_a_player_with_no_account", [edit(GINA, reason=R, name="Gina C.")])
e("email_not_an_email", [edit(HANA, reason=R, email="not-an-email")])
e("password_for_a_registered_player", [edit(HANA, reason=R, password="a-new-password")])
e("password_of_7_characters", [edit(HANA, reason=R, password="1234567")])
e("password_of_8_characters", [edit(HANA, reason=R, password="12345678")])
e("password_is_not_trimmed", [edit(HANA, reason=R, password="  1234567  ")])
e("password_of_8_emoji_is_16_units", [edit(HANA, reason=R, password="😀" * 4)])
e("password_with_no_reason", [edit(HANA, password="a-new-password")])
e("password_and_other_changes", [edit(HANA, reason=R, password="a-new-password", name="Hana P.", nickname="HP")])
e("password_for_a_player_with_no_contact", [edit(GINA, reason=R, password="a-new-password")])
e("password_when_the_account_is_gone", [edit(HANA, reason=R, password="a-new-password")], scenario="hana_no_account")
e("password_twice", [edit(HANA, reason=R, password="a-new-password"), edit(HANA, rev="5", reason=R, password="another-password")])
e("password_for_an_unclaimed_player", [edit_raw(ERIN, {"revision": "2", "values": vals(HANA, password="a-new-password", reason=R)})])
e("nothing_validates_before_the_player_is_claimed", [edit_raw(ERIN, {"revision": "2", "values": {}})])
e("the_first_message_of_a_failing_form_is_the_last_per_field", [edit(HANA, name="", nickname="k" * 31, playingStyle="s" * 281, experienceYears="x", experienceMonths="x",
                                                                   facebook="x", instagram="x", youtube="x", linkedin="x", phone="x", email="x", password="x", reason="r" * 301)])
e("a_failing_form_beats_the_reason", [edit(HANA, name="n" * 61)])
e("a_failing_form_beats_the_revision", [edit(HANA, rev="1", name="n" * 61)])
e("the_revision_beats_a_failing_form", [edit(HANA, rev="1", name="n" * 61)])
e("the_wrong_revision_text_beats_a_failing_form", [edit(HANA, rev="x", name="n" * 61)])
# ---- registration place and date: the RTR ID and every record that holds it ----
e("rtr_place_changed", [edit(HANA, reason=R, registrationPlace="PH-MNL")])
e("rtr_date_changed", [edit(HANA, reason=R, registrationDate="2026-10-30")])
e("rtr_place_and_date_changed", [edit(HANA, reason=R, registrationPlace="PH-DVO", registrationDate="2026-11-02")])
e("rtr_changed_with_a_profile_change", [edit(HANA, reason=R, registrationPlace="PH-MNL", name="Hana M.")])
e("rtr_changed_with_a_profile_change_and_the_new_revision", [edit(HANA, reason=R, registrationDate="2026-10-30", name="Hana M."), edit(HANA, rev="6", reason=R, registrationDate="2026-10-31")])
e("rtr_changed_with_an_email_change", [edit(HANA, reason=R, registrationPlace="PH-MNL", email="hana.new@example.test")])
e("rtr_changed_with_an_email_and_a_profile_change", [edit(HANA, reason=R, registrationPlace="PH-MNL", email="hana.new@example.test", name="Hana M.")])
e("rtr_changed_with_a_password", [edit(HANA, reason=R, registrationPlace="PH-MNL", password="a-new-password")])
e("rtr_changed_with_everything", [edit(HANA, reason=R, registrationPlace="PH-MNL", registrationDate="2026-10-30", email="hana.new@example.test", password="a-new-password", name="Hana M.", phone="0917 555 0100")])
e("rtr_changed_with_no_reason", [edit(HANA, registrationPlace="PH-MNL")])
e("rtr_changed_with_a_blank_reason", [edit(HANA, registrationPlace="PH-MNL", reason="  ")])
e("rtr_changed_with_a_stale_revision", [edit(HANA, rev="3", reason=R, registrationPlace="PH-MNL")])
e("rtr_the_new_id_is_taken_by_an_allocation", [edit(IVAN, reason=R, registrationPlace="PH-CEB")])
e("rtr_the_new_id_is_taken_by_an_entry", [edit(HANA, reason=R, registrationDate="2026-10-30")], scenario="entry_has_hanas_new_id")
e("rtr_the_new_number_is_taken_in_the_place_and_day", [edit(HANA, reason=R, registrationPlace="PH-MNL", registrationDate="2026-10-29")], scenario="manila_14_taken")
e("rtr_the_taken_check_comes_before_the_profile_fields", [edit(IVAN, reason=R, registrationPlace="PH-CEB", name="Ivan X.")])
e("rtr_date_cleared", [edit(HANA, reason=R, registrationDate="")])
e("rtr_date_spaces", [edit(HANA, reason=R, registrationDate="   ")])
e("rtr_date_not_a_date", [edit(HANA, reason=R, registrationDate="tomorrow")])
e("rtr_date_not_on_the_calendar", [edit(HANA, reason=R, registrationDate="2026-02-30")])
e("rtr_date_a_leap_day", [edit(HANA, reason=R, registrationDate="2028-02-29")])
e("rtr_date_not_a_leap_day", [edit(HANA, reason=R, registrationDate="2026-02-29")])
e("rtr_date_in_another_century", [edit(HANA, reason=R, registrationDate="2126-10-29")])
e("rtr_date_old", [edit(HANA, reason=R, registrationDate="2001-01-01")])
e("rtr_date_with_a_time", [edit(HANA, reason=R, registrationDate="2026-10-30T00:00:00Z")])
e("rtr_date_padded", [edit(HANA, reason=R, registrationDate=" 2026-10-30 ")])
e("rtr_place_empty", [edit(HANA, reason=R, registrationPlace="")])
e("rtr_place_unknown", [edit(HANA, reason=R, registrationPlace="PH-XYZ")])
e("rtr_place_unknown_with_a_profile_change", [edit(HANA, reason=R, registrationPlace="PH-XYZ", name="Hana M.")])
e("rtr_place_in_another_country", [edit(HANA, reason=R, registrationPlace="US-NYC")])
e("rtr_place_lower_case", [edit(HANA, reason=R, registrationPlace="ph-mnl")])
e("rtr_place_with_a_long_city_code", [edit(HANA, reason=R, registrationPlace="PH-CEBU")])
e("rtr_place_with_no_dash", [edit(HANA, reason=R, registrationPlace="MNL")])
e("rtr_place_the_same_with_another_date", [edit(HANA, reason=R, registrationPlace="PH-CEB", registrationDate="2026-10-30")])
e("rtr_change_moves_the_counter_up_only", [edit(HANA, reason=R, registrationPlace="PH-MNL", registrationDate="2026-10-29")])
e("rtr_change_to_a_day_with_a_counter_ahead", [edit(HANA, reason=R, registrationDate="2026-10-29", registrationPlace="PH-CEB")], scenario="cebu_counter_ahead")
e("rtr_registration_place_and_date_absent_keep_the_id", [edit_raw(HANA, {"revision": "4", "values": {k: v for k, v in vals(HANA, name="Hana L.", reason=R).items() if k not in ("registrationPlace", "registrationDate")}})])
e("rtr_player_changed_under_the_form", [edit(HANA, reason=R, registrationPlace="PH-MNL")], scenario="hana_rtr_moved")
# ---- email ----
e("email_changed", [edit(HANA, reason=R, email="hana.new@example.test")])
e("email_changed_is_lowercased_and_trimmed", [edit(HANA, reason=R, email="  Hana.New@Example.TEST ")])
e("email_changed_only_in_case_is_a_change_that_changes_nothing", [edit(HANA, reason=R, email="HANA@example.test")])
e("email_changed_and_a_profile_field", [edit(HANA, reason=R, email="hana.new@example.test", name="Hana E.")])
e("email_changed_twice", [edit(HANA, reason=R, email="hana.new@example.test"), edit(HANA, rev="6", reason=R, email="hana.newer@example.test")])
e("email_changed_with_no_reason", [edit(HANA, email="hana.new@example.test")])
e("email_changed_with_a_stale_revision", [edit(HANA, rev="3", reason=R, email="hana.new@example.test")])
e("email_supersedes_the_pending_request", [edit(HANA, reason=R, email="hana.new@example.test")], scenario="hana_pending_email_request")
e("phone_supersedes_the_pending_requests_of_hana", [edit(HANA, reason=R, phone="0917 555 0100")], scenario="hana_pending_email_request")
e("email_for_a_player_with_no_email_cannot_be_staged", [edit(CARLA, reason=R, email="carla.new@example.test")])
e("email_another_players_email", [edit(HANA, reason=R, email="alice@example.test")])
e("email_another_players_email_with_a_profile_change", [edit(HANA, reason=R, email="alice@example.test", name="Hana E.")])
e("email_an_unclaimed_players_email", [edit(HANA, reason=R, email="dan@example.test")])
e("email_a_googles_email_is_not_checked", [edit(HANA, reason=R, email="carla@gmail.test")])
e("email_a_shared_entrys_email_is_not_checked", [edit(HANA, reason=R, email="una@example.test")])
e("email_the_login_has_it_already", [edit(HANA, reason=R, email="taken@example.test")])
e("email_the_login_has_it_already_with_a_profile_change", [edit(HANA, reason=R, email="taken@example.test", name="Hana E.")])
e("email_with_an_active_request", [edit(BOB, reason=R, email="bob.new@example.test")])
e("email_with_an_active_request_and_a_profile_change", [edit(BOB, reason=R, email="bob.new@example.test", name="Bob E.")])
e("email_with_a_failed_sync", [edit(HANA, reason=R, email="hana.new@example.test")], scenario="hana_sync_failed")
e("email_with_an_edit_pending_for_the_same_address", [edit(HANA, reason=R, email="hana.new@example.test")], scenario="hana_email_edit_pending")
e("email_with_an_edit_pending_for_another_address", [edit(HANA, reason=R, email="hana.other@example.test")], scenario="hana_email_edit_pending")
e("email_with_no_contact_row", [edit(HANA, reason=R, email="hana.new@example.test")], scenario="hana_no_contact")
e("email_with_no_account_row", [edit(HANA, reason=R, email="hana.new@example.test")], scenario="hana_no_account")
e("email_changed_after_the_phone_changed", [edit(HANA, reason=R, phone="0917 555 0100", email="hana.new@example.test")])
e("email_with_the_phone_and_the_name", [edit(ALICE, reason=R, phone="0917 555 0100", email="alice.new@example.test", name="Alice R.")])
e("email_for_a_player_with_a_google_account", [edit(JUNE, reason=R, email="june.new@example.test")])
# ---- two writes at once ----
e("race_two_profile_edits_with_one_revision", [{"parallel": [edit(HANA, reason=R, name="Hana A."), edit(HANA, reason=R, name="Hana B.")], "redact": ["player.name", "message"]}],
  redact={"admin_audit_events": ["metadata"], "players": ["full_name"]})
e("race_two_profile_edits_of_two_players", [{"parallel": [edit(HANA, reason=R, name="Hana A."), edit(JUNE, reason=R, name="June A.")]}])
# race_two_identical_profile_edits was removed: its answers depend on timing; TestRaceOfTwoProfileSavesOfOneRevision covers the race
# ---- unclaimed people saved with an email: the shared entry ----
SE = lambda eid, rev, **kw: step("PATCH", ep(eid), {"revision": rev, "values": {**BASE, "name": kw.pop("name", "Una Alonzo"), "nickname": kw.pop("nickname", "Uni"), "email": kw.pop("email", "una@example.test"),
                                                                              "phone": kw.pop("phone", "+639175550911"), "registrationPlace": kw.pop("registrationPlace", "PH-CEB"),
                                                                              "registrationDate": kw.pop("registrationDate", "2026-10-29"), **kw}})
SE_I = lambda eid, rev, **kw: step("PATCH", ep(eid), {"revision": rev, "values": {**BASE, "name": "Uri Beltran", "nickname": "Uri", "email": "uri@example.test",
                                                                                "phone": "", "registrationPlace": "PH-MNL", "registrationDate": "2026-10-30", **kw}})
e("entry_nothing_changed", [SE(E(7), "1")])
e("entry_email_changed", [SE(E(7), "1", email="una.new@example.test", reason=R)])
e("entry_email_changed_is_lowercased_and_trimmed", [SE(E(7), "1", email="  Una.New@Example.TEST ", reason=R)])
e("entry_email_changed_twice", [SE(E(7), "1", email="una.new@example.test", reason=R), SE(E(7), "2", email="una.newer@example.test", reason=R)])
e("entry_email_changed_with_no_reason", [SE(E(7), "1", email="una.new@example.test")])
e("entry_email_changed_with_a_stale_revision", [SE_I(E(8), "1", email="uri.new@example.test", reason=R)])
e("entry_email_cleared", [SE(E(7), "1", email="", reason=R)])
e("entry_email_not_an_email", [SE(E(7), "1", email="not an email", reason=R)])
e("entry_email_with_two_ats", [SE(E(7), "1", email="a@b@example.test", reason=R)])
e("entry_email_a_registered_players", [SE(E(7), "1", email="alice@example.test", reason=R)])
e("entry_email_a_google_email", [SE(E(7), "1", email="carla@gmail.test", reason=R)])
e("entry_email_another_entrys", [SE(E(7), "1", email="uri@example.test", reason=R)])
e("entry_email_an_unclaimed_players_contact", [SE(E(7), "1", email="dan@example.test", reason=R)])
e("entry_email_the_same_in_another_case_is_a_change", [SE(E(7), "1", email="UNA@example.test", reason=R)])
e("entry_rtr_place_changed", [SE(E(7), "1", registrationPlace="PH-MNL", reason=R)])
e("entry_rtr_date_changed", [SE(E(7), "1", registrationDate="2026-10-30", reason=R)])
e("entry_rtr_changed_and_the_email", [SE(E(7), "1", registrationPlace="PH-MNL", email="una.new@example.test", reason=R)])
e("entry_rtr_changed_with_no_reason", [SE(E(7), "1", registrationPlace="PH-MNL")])
e("entry_rtr_the_new_id_is_taken", [SE(E(7), "1", registrationPlace="PH-MNL", registrationDate="2026-10-30", reason=R)], scenario="una_is_number_8")
e("entry_rtr_a_new_id_that_is_free", [SE_I(E(8), "5", registrationPlace="PH-CEB", registrationDate="2026-10-29", reason=R)])
e("entry_rtr_date_not_a_date", [SE(E(7), "1", registrationDate="2026-13-01", reason=R)])
e("entry_rtr_date_cleared", [SE(E(7), "1", registrationDate="", reason=R)])
e("entry_rtr_place_unknown", [SE(E(7), "1", registrationPlace="PH-XYZ", reason=R)])
e("entry_another_field_changed", [SE(E(7), "1", name="Una A.", reason=R)])
e("entry_another_field_changed_with_a_valid_email_change", [SE(E(7), "1", nickname="U", email="una.new@example.test", reason=R)])
e("entry_that_has_no_phone_and_a_typed_one", [SE_I(E(8), "5", phone="0917 555 0100", reason=R)])
e("entry_a_second_club_record_changes_the_name_shown", [SE(E(7), "1", name="Una A.", reason=R)])
e("entry_phone_changed", [SE(E(7), "1", phone="0917 555 0100", reason=R)])
e("entry_phone_typed_another_way_is_no_change", [SE(E(7), "1", phone="0917 555 0911", reason=R)])
e("entry_password_sent", [SE(E(7), "1", password="a-new-password", reason=R)])
e("entry_stale_revision", [SE(E(7), "5", email="una.new@example.test", reason=R)])
e("entry_stale_revision_with_nothing_changed", [SE(E(7), "5")])
e("entry_revision_bad_text", [SE(E(7), "x", email="una.new@example.test", reason=R)])
e("entry_that_is_retired", [SE(E(9), "1", reason=R)])
e("entry_with_no_club_record", [SE(E(11), "1", reason=R)])
e("entry_that_is_claimed", [SE(E(10), "1", reason=R)])
e("entry_that_is_the_one_of_a_registration_in_progress", [SE(E(12), "1", reason=R)])
e("entry_values_missing", [edit_raw(E(7), {"revision": "1"}, goExpects={"status": 422, "code": "invalid"}, allow500=True)])
e("entry_values_empty", [edit_raw(E(7), {"revision": "1", "values": {}}, goExpects={"status": 422, "code": "invalid"}, allow500=True)])
e("entry_values_missing_a_field", [edit_raw(E(7), {"revision": "1", "values": {k: v for k, v in SE(E(7), "1")["body"]["values"].items() if k != "facebook"}}, goExpects={"status": 422, "code": "invalid"}, allow500=True)])
e("entry_the_form_is_not_validated", [SE(E(7), "1", email="una.new@example.test", reason="r" * 400)])
write_cases("playeredit", e.list, {
    "character_b_hidden": ["UPDATE profile_characters SET shown = false WHERE id = 'b'"],
    "character_b_deleted": ["UPDATE profile_characters SET deleted_at = TIMESTAMPTZ '2026-11-15 09:00:00+00' WHERE id = 'b'"],
    "character_a_hidden_after": ["UPDATE profile_characters SET shown = false WHERE id = 'a'"],
    "alice_picture_not_a_link": ["UPDATE players SET avatar_ref = 'p.png' WHERE id = '%s'" % ALICE],
    "hana_sync_failed": ["UPDATE player_accounts SET contact_sync_status = 'failed' WHERE player_id = '%s'" % HANA],
    "hana_no_account": ["DELETE FROM player_accounts WHERE player_id = '%s'" % HANA],
    "hana_no_contact": ["DELETE FROM player_private_contacts WHERE player_id = '%s'" % HANA],
    "hana_approved_request": ["INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value, original_contact_revision, status, requested_at, source_command_id, reviewed_by_admin_id, reviewed_at, approved_at, provider_operation_ref, application_attempts, failure_code, updated_at) VALUES ('b1000000-0000-4000-8000-000000000020', '%s', 'phone', 'app', '+639175550888', '+639175550008', 1, 'approved', TIMESTAMPTZ '2026-11-14 01:00:00+00', 'b2000000-0000-4000-8000-000000000020', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 02:00:00+00', TIMESTAMPTZ '2026-11-14 02:00:00+00', 'b4000000-0000-4000-8000-000000000020', 0, NULL, %s)" % (HANA, TS)],
    "hana_failed_request": ["INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value, original_contact_revision, status, requested_at, source_command_id, reviewed_by_admin_id, reviewed_at, approved_at, provider_operation_ref, application_attempts, failure_code, updated_at) VALUES ('b1000000-0000-4000-8000-000000000021', '%s', 'email', 'app', 'hana.x@example.test', 'hana@example.test', 1, 'failed', TIMESTAMPTZ '2026-11-14 01:00:00+00', 'b2000000-0000-4000-8000-000000000021', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 02:00:00+00', TIMESTAMPTZ '2026-11-14 02:00:00+00', 'b4000000-0000-4000-8000-000000000021', 3, 'provider_unavailable', %s)" % (HANA, TS)],
    "hana_email_edit_pending": ["INSERT INTO admin_player_email_edits (id, player_id, admin_id, original_email, proposed_email, contact_revision, state, created_at, updated_at) VALUES ('ee000000-0000-4000-8000-000000000001', '%s', 'ad000000-0000-4000-8000-000000000001', 'hana@example.test', 'hana.new@example.test', 1, 'pending', %s, %s)" % (HANA, TS, TS)],
    "entry_has_hanas_new_id": ["INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, revision, updated_at) VALUES ('a6000000-0000-4000-8000-000000000020', 'ghost@example.test', 'RTR-PH-CEB-103026-0014', '%s', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-30', 14, %s, 1, %s)" % (SMASH, TS, TS)],
    "manila_14_taken": ["INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence) VALUES ('%s', 'RTR-PH-MNL-102926-0014', '%s', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'PH', 'MNL', DATE '2026-10-29', 14)" % (P(11), BIRDIE)],
    "cebu_counter_ahead": ["UPDATE player_id_counters SET last_sequence = 99 WHERE sync_date = DATE '2026-10-29' AND location_code_id = (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB')"],
    "hana_pending_email_request": ["INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value, original_contact_revision, status, requested_at, source_command_id, submitted_by_admin_id, updated_at) VALUES ('b1000000-0000-4000-8000-000000000030', '%s', 'email', 'owner', 'hana.req@example.test', 'hana@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-14 01:00:00+00', 'b2000000-0000-4000-8000-000000000030', 'ad000000-0000-4000-8000-000000000001', %s), ('b1000000-0000-4000-8000-000000000031', '%s', 'phone', 'app', '+639175550555', '+639175550008', 1, 'pending', TIMESTAMPTZ '2026-11-14 02:00:00+00', 'b2000000-0000-4000-8000-000000000031', NULL, %s)" % (HANA, TS, HANA, TS)],
    "una_is_number_8": ["UPDATE shared_player_entries SET sequence = 8, rtr_id = 'RTR-PH-CEB-102926-0008' WHERE id = '%s'" % E(7)],
    "hana_rtr_moved": ["UPDATE player_id_allocations SET rtr_id = 'RTR-PH-CEB-102926-0015', sequence = 15 WHERE player_id = '%s'" % HANA],
})

if __name__ == "__main__":
    print("playerverify: %d cases, playercreate: %d, playeredit: %d" % (len(v.list), len(c.list), len(e.list)))
