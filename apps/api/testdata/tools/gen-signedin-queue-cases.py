#!/usr/bin/env python3
"""Writes apps/api/internal/signedin/testdata/queue.cases.json: the requests the Queue characterization replays.

The capture (capture-signedin-queue.test.mjs) answers each case with the real Queue Route Handlers and writes
queue.golden.json; the Go test replays the same cases. Run: python3 apps/api/testdata/tools/gen-signedin-queue-cases.py
Club accounts: 1 Smash (licence valid), 2 Birdie (lapsed), 3 Ninjas (a past end still recorded), 4 Edge (ends now),
5 No Licence (no row), 6 Disabled, 7 Unprovisioned. See queue.seed.sql.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "../../internal/signedin/testdata/queue.cases.json")

SUBJECT = {n: f"c7000000-0000-4000-8000-00000000000{n}" for n in range(1, 8)}
CLUB = {n: f"c9000000-0000-4000-8000-00000000000{n}" for n in range(1, 8)}
CP = lambda n: f"c6000000-0000-4000-8000-0000000000{n:02d}"  # a saved player of the seed
SESSION = lambda n: f"a3000000-0000-4000-8000-00000000000{n}"

cases = []
scenarios = {"base": []}


def case(name, path, club=None, scenario="base", go=None, now=None, redact=None):
    c = {"name": name, "path": path, "who": SUBJECT[club] if club else None, "scenario": scenario}
    if go:
        c["goExpects"] = {"status": go[0], "code": go[1]}
    if now:
        c["now"] = now
    if redact:
        c["redact"] = redact
    cases.append(c)


def scenario(name, *statements):
    scenarios[name] = list(statements)
    return name


# ---- the club, its invite link, venues, inventory and license ----
ALL = [1, 2, 3, 4, 5]
for route, label in [("/api/club", "club"), ("/api/club/invite", "invite"), ("/api/venues", "venues"),
                     ("/api/inventory", "inventory"), ("/api/license", "license")]:
    case(f"{label}-signed-out", route)
    for n in ALL:
        if route in ("/api/club", "/api/club/invite") and n == 2:
            continue  # Birdie Club has no invite code: the read makes one (cases below)
        case(f"{label}-club{n}", route, club=n)
    case(f"{label}-disabled", route, club=6, go=(401, "unauthenticated"))
    case(f"{label}-unprovisioned", route, club=7, go=(401, "unauthenticated"))
fill = scenario("fill_invite")
case("club-club2-fills-invite", "/api/club", club=2, scenario=fill, redact=["club.inviteCode"])
fill2 = scenario("fill_invite_2")
case("invite-club2-fills-invite", "/api/club/invite", club=2, scenario=fill2, redact=["inviteCode"])
# a club whose settings are all empty, and one that has the invite code blank text
bare = scenario("smash_bare", "UPDATE clubs SET description = NULL, court_rules = NULL, post_template = NULL, default_entrance_fee_minor = NULL, logo_ref = NULL WHERE id = '%s'" % CLUB[1],
                "DELETE FROM club_name_change_requests WHERE club_id = '%s'" % CLUB[1],
                "DELETE FROM club_accounts WHERE club_id = '%s'" % CLUB[3])
case("club-club1-bare", "/api/club", club=1, scenario=bare)
case("club-club3-no-account-row", "/api/club", club=3, scenario=bare, go=(401, "unauthenticated"))
# a licence that lapsed: every club read still answers except where the service checks
expired = scenario("smash_expired", "UPDATE club_entitlements SET effective_access_ends_at = TIMESTAMPTZ '2026-11-01 00:00:00+00' WHERE club_id = '%s'" % CLUB[1])
for route, label in [("/api/license", "license"), ("/api/club", "club"), ("/api/venues", "venues"), ("/api/inventory", "inventory")]:
    case(f"{label}-club1-expired", route, club=1, scenario=expired)
no_terms = scenario("smash_no_terms", "DELETE FROM club_license_terms WHERE club_id = '%s'" % CLUB[1],
                    "DELETE FROM club_entitlements WHERE club_id = '%s'" % CLUB[1],
                    "DELETE FROM club_venues; DELETE FROM inventory_items")
case("license-club1-no-terms", "/api/license", club=1, scenario=no_terms)
case("venues-club1-none", "/api/venues", club=1, scenario=no_terms)
case("inventory-club1-none", "/api/inventory", club=1, scenario=no_terms)

# ---- saved players ----
case("players-signed-out", "/api/club/players")
for n in ALL:
    case(f"players-club{n}", "/api/club/players", club=n)
case("players-disabled", "/api/club/players", club=6, go=(401, "unauthenticated"))
no_banners = scenario("no_banners_shown", "UPDATE profile_banners SET shown = false")
case("players-club1-no-banner-shown", "/api/club/players", club=1, scenario=no_banners)
only_default = scenario("one_banner_default", "UPDATE profile_banners SET shown = (id = 'court')")
case("players-club1-one-banner-shown", "/api/club/players", club=1, scenario=only_default)
picked = scenario("alice_picked_banner", "UPDATE players SET banner_id = 'ember' WHERE id = 'd4000000-0000-4000-8000-000000000001'",
                  "UPDATE players SET banner_id = 'sun' WHERE id = 'd4000000-0000-4000-8000-000000000002'",
                  "UPDATE profile_banners SET shown = false WHERE id = 'sun'")
case("players-club1-picked-banners", "/api/club/players", club=1, scenario=picked)

# details (edit): 11 Una (entry and phone, malformed details), 21 Cory (a phone and own details), 24 Ned and 25 Nia (guests),
# 16 Dan (an entry), 1 Alice (registered: forbidden), 23 removed, 22 another club's, an unknown id
for n, label in [(11, "una"), (21, "cory"), (24, "ned"), (25, "nia"), (16, "dan"), (14, "retired-entry"), (1, "alice-registered"), (5, "erin"), (23, "removed"), (22, "other-club"), (2, "other-club-registered")]:
    case(f"details-club1-{label}", f"/api/club/players/{CP(n)}", club=1)
case("details-club1-unknown", "/api/club/players/c6000000-0000-4000-8000-0000000000ff", club=1)
case("details-club1-not-a-uuid", "/api/club/players/not-an-id", club=1, go=(404, "not_found"))
case("details-signed-out", f"/api/club/players/{CP(21)}")
case("details-club3-own", f"/api/club/players/{CP(22)}", club=3)  # an expired entitlement is refused first
case("details-club3-other-club", f"/api/club/players/{CP(1)}", club=3)
case("details-club2-expired", f"/api/club/players/{CP(13)}", club=2)
case("details-club5-no-row", f"/api/club/players/{CP(1)}", club=5)
case("details-club4-edge", f"/api/club/players/{CP(1)}", club=4)
case("details-club1-expired", f"/api/club/players/{CP(21)}", club=1, scenario=expired)
case("details-club1-experience-later", f"/api/club/players/{CP(21)}", club=1, now="2027-02-01T04:00:00.000Z")

# delete impact: 1 Alice (live in the active session, none waiting), 3 Bob (two waiting matches), 4 Carla (on court),
# 5 Erin (released), 16 Dan (a no show), 21 Cory (waiting), 25 Nia (not in the session)
for n, label in [(1, "alice"), (3, "bob"), (4, "carla"), (5, "erin"), (16, "dan"), (21, "cory"), (24, "ned"), (25, "nia"), (11, "una"), (22, "other-club"), (23, "removed")]:
    case(f"delete-impact-club1-{label}", f"/api/club/players/{CP(n)}/delete-impact", club=1)
case("delete-impact-club1-unknown", "/api/club/players/c6000000-0000-4000-8000-0000000000ff/delete-impact", club=1)
case("delete-impact-club1-not-a-uuid", "/api/club/players/x/delete-impact", club=1, go=(404, "not_found"))
case("delete-impact-signed-out", f"/api/club/players/{CP(1)}/delete-impact")
case("delete-impact-club2-expired", f"/api/club/players/{CP(13)}/delete-impact", club=2)
case("delete-impact-club3-unknown", "/api/club/players/c6000000-0000-4000-8000-0000000000ff/delete-impact", club=3)
case("delete-impact-club1-expired", f"/api/club/players/{CP(1)}/delete-impact", club=1, scenario=expired)
ended = scenario("live_session_ended", "UPDATE queue_sessions SET state = 'completed', finalized_at = TIMESTAMPTZ '2026-11-19 03:00:00+00' WHERE id = '%s'" % SESSION(1))
case("delete-impact-club1-bob-session-ended", f"/api/club/players/{CP(3)}/delete-impact", club=1, scenario=ended)

# year stats
for n, label in [(1, "alice"), (2, "alice-other-club"), (3, "bob"), (4, "carla"), (5, "erin-unclaimed"), (11, "una"), (21, "cory-guest"), (23, "removed"), (22, "other-club")]:
    case(f"year-stats-club1-{label}", f"/api/club/players/{CP(n)}/year-stats", club=1)
case("year-stats-club2-alice", f"/api/club/players/{CP(2)}/year-stats", club=2)
case("year-stats-club1-unknown", "/api/club/players/c6000000-0000-4000-8000-0000000000ff/year-stats", club=1)
case("year-stats-club1-not-a-uuid", "/api/club/players/x/year-stats", club=1)
case("year-stats-signed-out", f"/api/club/players/{CP(1)}/year-stats")
case("year-stats-club2-expired", f"/api/club/players/{CP(13)}/year-stats", club=2)
case("year-stats-club1-next-year", f"/api/club/players/{CP(1)}/year-stats", club=1, now="2027-01-02T04:00:00.000Z")
hidden = scenario("alice_hides_stats", "UPDATE players SET show_profile_stats = false WHERE id = 'd4000000-0000-4000-8000-000000000001'",
                  "UPDATE players SET show_profile_stats = false WHERE id = 'd4000000-0000-4000-8000-000000000003'")
case("year-stats-club1-alice-hidden", f"/api/club/players/{CP(1)}/year-stats", club=1, scenario=hidden)
case("year-stats-club1-carla-hidden", f"/api/club/players/{CP(4)}/year-stats", club=1, scenario=hidden)

# player lookup (exact RTR ID or email): registered, unclaimed, saved, hidden, retired, empty
for q, label in [("RTR-PH-CEB-102926-0001", "alice-rtr"), ("rtr-ph-ceb-102926-0001", "alice-rtr-lower"), ("  RTR-PH-CEB-102926-0002  ", "bob-rtr-spaces"),
                 ("alice@example.test", "alice-email"), ("ALICE@Example.test", "alice-email-upper"), ("carla@gmail.test", "carla-google-email"),
                 ("RTR-PH-CEB-102926-0007", "una-rtr-saved"), ("una@example.test", "una-email-saved"), ("uri@example.test", "uri-email"),
                 ("RTR-PH-MNL-103026-0008", "uri-rtr"), ("RTR-PH-CEB-102926-0009", "retired-rtr"), ("empty@example.test", "empty-entry-email"),
                 ("RTR-PH-CEB-102926-0013", "hidden-player-rtr"), ("RTR-PH-MNL-102926-0005", "unclaimed-profile-rtr"), ("dan@example.test", "dan-email-entry"),
                 ("RTR-PH-CEB-102926-0004", "dan-rtr"), ("", "empty"), ("   ", "blank"), ("Alice Reyes", "name"), ("+639175550001", "phone"),
                 ("nobody@example.test", "unknown-email"), ("RTR-PH-CEB-102926-9999", "unknown-rtr"), ("not an email", "garbage"), ("a b@c.d", "email-with-space"),
                 ("RTR-PH-CEB-102926-000", "short-rtr")]:
    case(f"lookup-club1-{label}", "/api/players?q=" + q.replace(" ", "%20").replace("+", "%2B").replace("@", "%40"), club=1)
case("lookup-club1-no-q", "/api/players", club=1)
case("lookup-club1-two-q", "/api/players?q=alice%40example.test&q=bob%40example.test", club=1)
case("lookup-club2-alice-saved", "/api/players?q=RTR-PH-CEB-102926-0001", club=2)
case("lookup-club2-una-saved", "/api/players?q=una@example.test", club=2)
case("lookup-club3-alice", "/api/players?q=RTR-PH-CEB-102926-0001", club=3)
case("lookup-club5-alice-no-licence", "/api/players?q=alice@example.test", club=5)
case("lookup-signed-out", "/api/players?q=alice@example.test")
case("lookup-disabled", "/api/players?q=alice@example.test", club=6, go=(401, "unauthenticated"))
case("lookup-club1-alice-hidden-from-directory", "/api/players?q=alice@example.test", club=1,
     scenario=scenario("alice_hidden", "UPDATE players SET hidden_from_directory = true WHERE id = 'd4000000-0000-4000-8000-000000000001'"))
case("lookup-club1-alice-private-contact-gone", "/api/players?q=alice@example.test", club=1,
     scenario=scenario("alice_not_claimed", "UPDATE players SET profile_state = 'unclaimed' WHERE id = 'd4000000-0000-4000-8000-000000000001'"))
case("lookup-club1-carla-google-unclaimed", "/api/players?q=carla@gmail.test", club=1,
     scenario=scenario("carla_unclaimed", "UPDATE players SET profile_state = 'unclaimed' WHERE id = 'd4000000-0000-4000-8000-000000000003'"))
case("lookup-club1-bob-rank-none", "/api/players?q=bob@example.test", club=1,
     scenario=scenario("no_ranks", "DELETE FROM player_rank_current"))

EXTRA = os.path.join(HERE, "gen-signedin-queue-cases-sessions.py")
if os.path.exists(EXTRA):
    exec(open(EXTRA).read())

names = [c["name"] for c in cases]
assert len(names) == len(set(names)), "duplicate case names: " + ", ".join(n for n in names if names.count(n) > 1)
with open(OUT, "w") as f:
    json.dump({"now": "2026-11-19T04:00:00.000Z", "subjects": SUBJECT, "scenarios": scenarios, "cases": cases}, f, indent=1)
    f.write("\n")
print(len(cases), "cases")
