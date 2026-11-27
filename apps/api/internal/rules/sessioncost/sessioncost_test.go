package sessioncost_test

import (
	"reflect"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessioncost"
)

func p(v int64) *int64 { return &v }

// The prototype's shuttle prices, so these checks match its worked examples (Vitest: sessionCost.rules.test.ts, 9 cases, each one test
// below; its inventory items become a price list and the categories only matter to defaultShuttlePlan).
var items = []sessioncost.Item{
	{ID: "inv1", Category: "shuttlecocks", UnitCostMinor: 145000},
	{ID: "inv2", Category: "shuttlecocks", UnitCostMinor: 115000},
	{ID: "inv3", Category: "shuttlecocks", UnitCostMinor: 125000},
	{ID: "inv4", Category: "equipment", UnitCostMinor: 8000},
}

func ctx(courts, minutes, players int64) sessioncost.Context {
	return sessioncost.Context{Courts: courts, DurationMinutes: minutes, Players: players, Items: items}
}

func input() sessioncost.Input {
	return sessioncost.Input{
		CourtFeePerCourtHour: p(35000), EntranceFeePerHead: p(6000), PaymentMode: "custom", CustomFeePerHead: p(90000),
		Shuttles: []sessioncost.ShuttleLine{{InventoryItemID: "inv1", Tubes: 4}, {InventoryItemID: "inv2", Tubes: 2}},
	}
}

func empty() sessioncost.Input { return sessioncost.Input{PaymentMode: "break_even"} }

func result(kind string, amount int64) sessioncost.Outcome {
	return sessioncost.Outcome{Kind: kind, Amount: amount}
}

// 'matches tonight: courts + shuttles + entrance, custom fee and profit'
func TestMatchesTonight(t *testing.T) {
	want := sessioncost.Result{
		Players: 14, Payers: 14, Court: 315000, Shuttle: 810000, Entrance: 84000, EntranceFeePerHead: 6000, Total: 1209000, BreakEven: 86400,
		PerHead: 90000, IsCustom: true, Collect: 1260000, Outcome: result("profit", 51000),
	}
	if got := sessioncost.Estimate(input(), ctx(3, 180, 14)); got != want {
		t.Errorf("%+v, want %+v", got, want)
	}
}

// 'matches Thursday Open Play with the custom 700 fee'
func TestThursdayOpenPlay(t *testing.T) {
	in := input()
	in.CustomFeePerHead = p(70000)
	got := sessioncost.Estimate(in, ctx(3, 180, 18))
	if got.Total != 1233000 || got.PerHead != 70000 || got.Collect != 1260000 || got.Outcome != result("profit", 27000) {
		t.Errorf("%+v", got)
	}
}

// 'rounds break-even UP to a whole peso, displaying the surplus'
func TestBreakEvenRoundsUp(t *testing.T) {
	in := input()
	in.PaymentMode = "break_even"
	got := sessioncost.Estimate(in, ctx(3, 180, 14))
	if got.BreakEven != 86400 || got.PerHead != 86400 || got.Collect != 1209600 || got.Outcome != result("breaks_even", 600) {
		t.Errorf("%+v", got)
	}
}

// 'shows a custom loss, exact break-even, and zero custom payment'
func TestCustomLossExactAndZero(t *testing.T) {
	in := input()
	in.CustomFeePerHead = p(80000)
	if got := sessioncost.Estimate(in, ctx(3, 180, 14)).Outcome; got != result("loss", 89000) {
		t.Errorf("loss: %+v", got)
	}
	in.CustomFeePerHead = p(68500)
	if got := sessioncost.Estimate(in, ctx(3, 180, 18)).Outcome; got != result("breaks_even", 0) {
		t.Errorf("exact: %+v", got)
	}
	in.CustomFeePerHead = p(0)
	if got := sessioncost.Estimate(in, ctx(3, 180, 14)).Outcome; got != result("loss", 1209000) {
		t.Errorf("zero: %+v", got)
	}
}

// 'uses at least one player and handles no costs'
func TestAtLeastOnePlayerAndNoCosts(t *testing.T) {
	got := sessioncost.Estimate(empty(), ctx(3, 180, 0))
	if got.Players != 1 || got.Total != 0 || got.PerHead != 0 || got.Outcome != result("no_costs", 0) {
		t.Errorf("%+v", got)
	}
	if sessioncost.AmountDue(nil) != nil {
		t.Error("no estimate must have no amount due")
	}
	est := sessioncost.Estimate(empty(), ctx(3, 180, 14))
	if due := sessioncost.AmountDue(&est); due == nil || *due != 0 {
		t.Errorf("amount due %v, want 0", due)
	}
}

// 'uses current prices and allows more tubes than stock'
func TestCurrentPricesAndMoreTubesThanStock(t *testing.T) {
	in := empty()
	in.Shuttles = []sessioncost.ShuttleLine{{InventoryItemID: "inv3", Tubes: 10}}
	if got := sessioncost.Estimate(in, ctx(3, 180, 14)).Shuttle; got != 1250000 {
		t.Errorf("shuttle %d, want 1250000", got)
	}
	c := ctx(3, 180, 14)
	c.Items = append([]sessioncost.Item(nil), items...)
	c.Items[0].UnitCostMinor = 150000
	if got := sessioncost.Estimate(input(), c).Total; got != 1229000 {
		t.Errorf("total %d, want 1229000", got)
	}
	// An item the club no longer lists costs nothing.
	in.Shuttles = []sessioncost.ShuttleLine{{InventoryItemID: "gone", Tubes: 3}}
	if got := sessioncost.Estimate(in, ctx(3, 180, 14)).Shuttle; got != 0 {
		t.Errorf("unknown item shuttle %d, want 0", got)
	}
}

// 'rounds fractional court costs to the nearest centavo, including half-centavos'
func TestCourtCostsRoundToTheNearestCentavo(t *testing.T) {
	in := empty()
	in.CourtFeePerCourtHour = p(100)
	if got := sessioncost.Estimate(in, ctx(1, 1, 14)).Court; got != 2 {
		t.Errorf("court %d, want 2", got)
	}
	in.CourtFeePerCourtHour = p(101)
	if got := sessioncost.Estimate(in, ctx(1, 30, 14)).Court; got != 51 {
		t.Errorf("court %d, want 51", got)
	}
}

// 'suggests the first shuttlecock item, rounded and at least one tube'
func TestDefaultShuttlePlan(t *testing.T) {
	if got, want := sessioncost.DefaultShuttlePlan(3, 180, items), []sessioncost.ShuttleLine{{InventoryItemID: "inv1", Tubes: 6}}; !reflect.DeepEqual(got, want) {
		t.Errorf("%+v, want %+v", got, want)
	}
	if got, want := sessioncost.DefaultShuttlePlan(1, 30, items), []sessioncost.ShuttleLine{{InventoryItemID: "inv1", Tubes: 1}}; !reflect.DeepEqual(got, want) {
		t.Errorf("%+v, want %+v", got, want)
	}
	if got := sessioncost.DefaultShuttlePlan(3, 180, items[3:]); len(got) != 0 {
		t.Errorf("no shuttlecock item must give no plan, got %+v", got)
	}
	// A removed item is never suggested; 135 court-minutes is 1.5 tubes, which rounds up.
	removed := append([]sessioncost.Item(nil), items...)
	removed[0].Removed = true
	if got := sessioncost.DefaultShuttlePlan(1, 135, removed); !reflect.DeepEqual(got, []sessioncost.ShuttleLine{{InventoryItemID: "inv2", Tubes: 2}}) {
		t.Errorf("%+v", got)
	}
}

// 'drops empty and zero-tube lines and saves no estimate for untouched optional fields'
func TestNormalize(t *testing.T) {
	if sessioncost.Normalize(ptrIn(empty())) != nil {
		t.Error("an empty estimate must normalize to none")
	}
	if sessioncost.Normalize(nil) != nil {
		t.Error("no estimate must normalize to none")
	}
	if sessioncost.Normalize(&sessioncost.Input{PaymentMode: "break_even", Shuttles: []sessioncost.ShuttleLine{{InventoryItemID: "", Tubes: 2}, {InventoryItemID: "inv1", Tubes: 0}}}) != nil {
		t.Error("lines with no item or no tubes must be dropped, leaving no estimate")
	}
	zero := empty()
	zero.CourtFeePerCourtHour = p(0)
	if got := sessioncost.Normalize(&zero); got == nil || got.CourtFeePerCourtHour == nil || *got.CourtFeePerCourtHour != 0 {
		t.Errorf("an explicit zero fee must stay an estimate, got %+v", got)
	}
	in := input()
	in.PaymentMode = "break_even"
	if got := sessioncost.Normalize(&in); got == nil || got.CustomFeePerHead != nil {
		t.Errorf("break-even must have no custom fee, got %+v", got)
	}
	// Only the fields of an estimate are kept: a custom fee stays only in custom mode.
	full := input()
	if got := sessioncost.Normalize(&full); got == nil || !reflect.DeepEqual(*got, input()) {
		t.Errorf("%+v", got)
	}
}

func ptrIn(in sessioncost.Input) *sessioncost.Input { return &in }

// 'leaves free players out of the break-even head count, keeping every cost (D-2026-11-27-01)': the values are the Vitest test's.
func TestFreePlayersLeaveTheHeadCount(t *testing.T) {
	c := ctx(3, 180, 14)
	c.FreePlayers = 2
	got := sessioncost.Estimate(empty2(), c)
	if got.Players != 14 || got.Payers != 12 || got.Entrance != 84000 || got.Total != 1209000 || got.BreakEven != 100800 || got.PerHead != 100800 || got.Collect != 1209600 {
		t.Errorf("break even: %+v", got)
	}
	// A custom amount is unchanged; only the payers pay it.
	got = sessioncost.Estimate(input(), c)
	if got.PerHead != 90000 || got.Collect != 1080000 || got.Outcome != result("loss", 129000) {
		t.Errorf("custom: %+v", got)
	}
	// Everyone free still leaves one payer, and a negative count is none.
	c.FreePlayers = 99
	if got := sessioncost.Estimate(input(), c); got.Payers != 1 {
		t.Errorf("payers %d, want 1", got.Payers)
	}
	c.FreePlayers = -3
	if got := sessioncost.Estimate(input(), c); got.Payers != 14 {
		t.Errorf("payers %d, want 14", got.Payers)
	}
}

func empty2() sessioncost.Input {
	in := input()
	in.PaymentMode = "break_even"
	return in
}
