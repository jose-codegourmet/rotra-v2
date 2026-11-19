package adminwrites_test

import (
	"testing"
)

// Add club at the same moment. Two creates of one command race on the club's unique command: the loser is a conflict,
// or, when it looks after the winner committed, the same club again (a retry). Which of the two happens depends on timing
// in the Route Handler too, so the golden file does not pin it. What always holds, many times over: only 201 and 409, at
// least one 201, one club, one account, one sign-in, and the two events once each.
func TestRaceOfTheSameAddClubCommand(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		const command = "c2000000-0000-4000-8000-000000000501"
		got := sendAll(t, e, owner, "POST", "/api/clubs", addClubBody(command, "race.one", "password one"), addClubBody(command, "race.one", "password one"), addClubBody(command, "race.one", "password one"))
		won := 0
		for _, w := range got {
			switch w.Code {
			case 201:
				won++
			case 409:
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if won == 0 {
			t.Fatalf("round %d: nobody created the club", round)
		}
		for _, sql := range []string{
			`SELECT count(*) - 1 FROM clubs WHERE source_command_id = 'c2000000-0000-4000-8000-000000000501'`,
			`SELECT count(*) - 1 FROM club_accounts WHERE username = 'race.one' AND auth_subject IS NOT NULL`,
			`SELECT count(*) - 1 FROM auth_identities WHERE audience = 'club' AND login_key = 'race.one'`,
			`SELECT count(*) - 1 FROM admin_audit_events WHERE action = 'club.created' AND source_command_id = 'c2000000-0000-4000-8000-000000000501'`,
			`SELECT count(*) - 1 FROM admin_audit_events WHERE action = 'club.account_provisioned'`,
		} {
			if n := count(t, e, sql); n != 0 {
				t.Fatalf("round %d: %s = %d", round, sql, n)
			}
		}
	}
}

// Two retries of a club the TypeScript staged without its login, at the same moment: the club row lock makes the second
// find the account provisioned, so there is one identity and every answer is 201.
func TestRaceOfTwoResumes(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		const staged = "c3000000-0000-4000-8000-0000000000c4"
		got := sendAll(t, e, owner, "POST", "/api/clubs", addClubBody(staged, "x", "password one"), addClubBody(staged, "x", "password one"), addClubBody(staged, "x", "password one"))
		for _, w := range got {
			if w.Code != 201 {
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if n := count(t, e, `SELECT count(*) FROM auth_identities WHERE audience = 'club'`); n != 1 {
			t.Fatalf("round %d: %d identities", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'club.account_provisioned'`); n != 1 {
			t.Fatalf("round %d: %d provisioned events", round, n)
		}
	}
}

// Two clubs with one name made at the same moment under two commands: the unique name key lets exactly one through.
// (The golden file pins the answers and rows of this race too, redacting who won.)
func TestRaceOfTwoClubsWithOneUsername(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 10; round++ {
		reset()
		got := sendAll(t, e, owner, "POST", "/api/clubs",
			addClubBody("c2000000-0000-4000-8000-000000000511", "same.user", "password one"),
			`{"sourceCommandId":"c2000000-0000-4000-8000-000000000512","name":"Other Name","cityCode":"PH-MNL","foundingAddress":"x","username":"same.user","password":"password one","price":{"pricing":"free"}}`)
		wins, conflicts := 0, 0
		for _, w := range got {
			switch w.Code {
			case 201:
				wins++
			case 409:
				conflicts++
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if wins != 1 || conflicts != 1 {
			t.Fatalf("round %d: %d wins, %d conflicts", round, wins, conflicts)
		}
		if n := count(t, e, `SELECT count(*) FROM auth_identities WHERE audience = 'club' AND login_key = 'same.user'`); n != 1 {
			t.Fatalf("round %d: %d identities", round, n)
		}
	}
}
