package contactchange_test

import (
	"reflect"
	"strings"
	"testing"
	"time"

	. "github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/contactchange"
)

// The Vitest cases of contactChangeRequest.rules.test.ts that a route runs (checksFor and normalizeContact: 8 cases) on the
// same fixtures, written out as rows: the seeded requests r1 to r9 of packages/data/src/fixtures/contactChangeRequests.ts on
// the players of fixtures/playerAccounts.ts. The next-action label, the counts and the filters of that file are rules of the
// Admin screen's client and no route runs them.

const (
	hour   = int64(time.Hour / time.Millisecond)
	minute = int64(time.Minute / time.Millisecond)
	day    = 24 * hour
)

var now = time.Date(2026, 10, 27, 2, 0, 0, 0, time.UTC).UnixMilli() // 2026-10-27T10:00:00+08:00

const (
	karl    = "d720c601-da89-5474-9351-00e2fb966e56"
	jose    = "2c7f6a7b-eed9-5051-9426-6dbce5133fbc"
	raymark = "bc4c3446-0131-591b-ab03-af19225dbe8a"
	jasper  = "a22725ed-0ae7-5f29-9ca8-edf1c775b833"
	mikee   = "f5a63c91-34fd-53ec-948d-0ef644b5aeac"
	emji    = "9f83495f-9359-5f7f-82ad-4cf01b826471"
	dalton  = "80861dfd-99c7-57bb-a46c-d8c76e9a8dcc"
)

func holders() []Holder {
	return []Holder{
		{ID: jose, FullName: "Jose Lahug", RtrID: "RTR-JOSE", Phone: "+639175550142", Email: "jose@example.com"},
		{ID: raymark, FullName: "Raymark M", RtrID: "RTR-RAYMARK", Phone: "+639185550377", Email: "raymark@example.com"},
		{ID: jasper, FullName: "Jasper", RtrID: "RTR-JASPER", Phone: "+639175550566", Email: "jasper@example.com"},
		{ID: karl, FullName: "Karl", RtrID: "RTR-KARL", Phone: "+639265550149", Email: "karl@example.com"},
		{ID: mikee, FullName: "Mikee Abellana", RtrID: "RTR-MIKEE", Phone: "+639205550458", Email: "mikee.abellana@example.com"},
		{ID: emji, FullName: "Emji", RtrID: "RTR-EMJI", Phone: "+639055550297", Email: "emji@example.com"},
		{ID: dalton, FullName: "Dalton", RtrID: "RTR-DALTON", Phone: "+639155550814", Email: "dalton@example.com"},
	}
}

func requests() map[string]Request {
	r := func(id, player, field, from, to string, at int64, status string) Request {
		return Request{ID: id, PlayerID: player, Field: field, From: from, To: to, RequestedAt: at, Status: status}
	}
	list := []Request{
		r("r1", raymark, FieldPhone, "+63 918 555 0377", "+63 927 555 0198", now-2*hour, StatusPending),
		r("r2", jasper, FieldPhone, "+63 917 555 0566", "+63 917 555 0142", now-5*hour, StatusPending),
		r("r3", karl, FieldEmail, "karl@example.com", "karl.matina@example.com", now-3*day, StatusPending),
		r("r4", karl, FieldEmail, "karl@example.com", "karl.dvo@example.com", now-22*hour, StatusPending),
		r("r5", mikee, FieldEmail, "mikee.abellana@example.com", "mikee.abellana.smash@example.com", now-26*hour, StatusPending),
		r("r6", emji, FieldPhone, "+63 905 555 0297", "+63 905 555 0415", now-30*hour, StatusApplying),
		r("r7", dalton, FieldPhone, "+63 915 555 0814", "+63 915 555 0990", now-2*day, StatusFailed),
		r("r8", mikee, FieldEmail, "mikee@example.com", "mikee.abellana@example.com", now-4*day, StatusApplied),
		r("r9", raymark, FieldEmail, "raymark@example.com", "raymark.m@example.com", now-6*day, StatusRejected),
	}
	out := map[string]Request{}
	for _, e := range list {
		out[e.ID] = e
	}
	return out
}

func all(m map[string]Request) []Request {
	var out []Request
	for _, id := range []string{"r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9"} {
		out = append(out, m[id])
	}
	return out
}

func failing(checks []Check) []Check {
	var out []Check
	for _, c := range checks {
		if !c.OK {
			out = append(out, c)
		}
	}
	return out
}

func TestChecksInTheOrderOfTheList(t *testing.T) { // 'returns the four checks in ContactChecksList order'
	m := requests()
	var kinds []string
	for _, c := range ChecksFor(m["r1"], holders(), all(m)) {
		kinds = append(kinds, c.Kind)
	}
	if want := []string{"linked-elsewhere", "newer-request", "original-changed", "in-progress"}; !reflect.DeepEqual(kinds, want) {
		t.Errorf("kinds %v, want %v", kinds, want)
	}
}

func TestR1PassesEveryCheck(t *testing.T) { // 'r1 passes every check'
	m := requests()
	if f := failing(ChecksFor(m["r1"], holders(), all(m))); len(f) != 0 {
		t.Errorf("failing: %+v", f)
	}
}

func TestR2IsLinkedToAnotherPlayer(t *testing.T) { // 'r2 is blocked: the number is linked to another player (Jose)'
	m := requests()
	f := failing(ChecksFor(m["r2"], holders(), all(m)))
	want := []Check{{Kind: "linked-elsewhere", OtherPlayer: &CheckPlayer{ID: jose, FullName: "Jose Lahug", RtrID: "RTR-JOSE"}}}
	if !reflect.DeepEqual(f, want) {
		t.Errorf("failing: %+v, want %+v", f, want)
	}
}

func TestR3IsBehindTheNewerR4(t *testing.T) { // 'r3 is blocked by the newer r4, which itself passes'
	m := requests()
	f := failing(ChecksFor(m["r3"], holders(), all(m)))
	id, at := "r4", m["r4"].RequestedAt
	if want := []Check{{Kind: "newer-request", NewerRequestID: &id, SentAt: &at}}; !reflect.DeepEqual(f, want) {
		t.Errorf("failing: %+v, want %+v", f, want)
	}
	if f := failing(ChecksFor(m["r4"], holders(), all(m))); len(f) != 0 {
		t.Errorf("r4 must pass: %+v", f)
	}
}

func TestR5IsNotInTheWayOfTheAppliedR8(t *testing.T) { // 'r5 (entered by the owner) passes; the applied r8 before it is not in the way'
	m := requests()
	if f := failing(ChecksFor(m["r5"], holders(), all(m))); len(f) != 0 {
		t.Errorf("failing: %+v", f)
	}
}

func TestAChangedContactIsShownInDisplayForm(t *testing.T) { // 'flags a contact that changed since the request, shown in display form'
	m := requests()
	hs := holders()
	for i := range hs {
		if hs[i].ID == m["r1"].PlayerID {
			hs[i].Phone = "+639185550999"
		}
	}
	f := failing(ChecksFor(m["r1"], hs, all(m)))
	value := "+63 918 555 0999"
	if want := []Check{{Kind: "original-changed", CurrentValue: &value}}; !reflect.DeepEqual(f, want) {
		t.Errorf("failing: %+v, want %+v", f, want)
	}
}

func TestAnotherChangeBeingAppliedBlocks(t *testing.T) { // 'flags another change for the same player still being applied'
	m := requests()
	applying := m["r1"]
	applying.ID, applying.Field, applying.Status = "other", FieldEmail, StatusApplying
	f := failing(ChecksFor(m["r1"], holders(), append(all(m), applying)))
	if want := []Check{{Kind: "in-progress"}}; !reflect.DeepEqual(f, want) {
		t.Errorf("failing: %+v, want %+v", f, want)
	}
}

func TestNormalizeContact(t *testing.T) { // 'compares phones as E.164 and emails without case', and the rest of the shapes
	for _, c := range []struct{ field, in, want string }{
		{FieldPhone, "+63 917 555 0142", "+639175550142"},
		{FieldPhone, "0917 555 0142", "+639175550142"},
		{FieldPhone, " 0917-555-0142 ", "+639175550142"},
		{FieldPhone, "639175550142", "+639175550142"},
		{FieldPhone, "0817 555 0142", "08175550142"}, // not a PH mobile: only spaces and hyphens go
		{FieldPhone, "call me", "callme"},
		{FieldPhone, "", ""},
		{FieldEmail, " Jose@Example.com ", "jose@example.com"},
		{FieldEmail, "", ""},
	} {
		if got := NormalizeContact(c.field, c.in); got != c.want {
			t.Errorf("NormalizeContact(%s, %q) = %q, want %q", c.field, c.in, got, c.want)
		}
	}
}

// The newest of several newer open requests is the one named; closed ones are not in the way (checksFor, same file).
func TestNewestOpenRequestIsNamed(t *testing.T) {
	phone := func(id string, at int64, status string) Request {
		return Request{ID: id, PlayerID: "p1", Field: FieldPhone, RequestedAt: at, Status: status}
	}
	self := Holder{ID: "p1", Phone: "+639175550001"}
	req := Request{ID: "r1", PlayerID: "p1", Field: FieldPhone, From: "+639175550001", To: "+639175550777", Status: StatusPending, RequestedAt: 1000}
	got := ChecksFor(req, []Holder{self}, []Request{req, phone("r2", 2000, StatusApproved), phone("r3", 3000, StatusPending), phone("r4", 4000, StatusRejected)})
	if c := got[1]; c.OK || *c.NewerRequestID != "r3" || *c.SentAt != 3000 {
		t.Errorf("newer request: %+v", c)
	}
	if c := got[3]; c.OK {
		t.Errorf("an approved request of the player is in progress: %+v", c)
	}
}

func TestNormalizeValueOfARequest(t *testing.T) {
	for _, c := range []struct {
		field, in, want, msg string
	}{
		{FieldPhone, " +639175550142 ", "+639175550142", ""},
		{FieldPhone, "0917 555 0142", "", MsgPhone},
		{FieldPhone, "+12345", "", MsgPhone},
		{FieldPhone, "+639175550142\n", "+639175550142", ""},
		{FieldEmail, " Name@Example.COM ", "name@example.com", ""},
		{FieldEmail, "a@b", "a@b", ""},
		{FieldEmail, "no-at", "", MsgEmail},
		{FieldEmail, "@b", "", MsgEmail},
		{FieldEmail, "a@", "", MsgEmail},
		{FieldEmail, "a@@b", "", MsgEmail},
		{FieldEmail, "a b@c", "", MsgEmail},
		{FieldEmail, "a b@c", "", MsgEmail}, // a no-break space is JavaScript's \s
		{FieldEmail, "a\u200bb@c", "a\u200bb@c", ""},
		{FieldEmail, "", "", MsgEmail},
	} {
		got, msg := Normalize(c.field, c.in)
		if got != c.want || msg != c.msg {
			t.Errorf("Normalize(%s, %q) = %q, %q; want %q, %q", c.field, c.in, got, msg, c.want, c.msg)
		}
	}
}

func TestWords(t *testing.T) {
	if Word(FieldPhone) != "phone number" || Word(FieldEmail) != "email" {
		t.Error("words")
	}
	if got := SameWord(FieldEmail, true); got != "That's already this player's email." {
		t.Error(got)
	}
	if got := SameWord(FieldPhone, false); got != "That's already your phone number." {
		t.Error(got)
	}
	if got := TakenWord(FieldPhone, true); got != "That phone number belongs to another ROTRA profile." {
		t.Error(got)
	}
	if got := TakenWord(FieldEmail, false); !strings.HasSuffix(got, "Contact ROTRA for help.") {
		t.Error(got)
	}
}
