package slotledger_test

import (
	"reflect"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/slotledger"
)

func p(v int64) *int64 { return &v }

// The cases are the Vitest file transferAccounting.rules.test.ts and paymentRefund.rules.test.ts, with the same names and values.
var due = p(90000)

func TestWaiver(t *testing.T) {
	cases := []struct {
		name string
		due  *int64
		h    *slotledger.Holding
		want int64
	}{
		{"partly paid slot waives what it still owes", due, &slotledger.Holding{Cash: 50000}, 40000},
		{"fully paid", due, &slotledger.Holding{Cash: 90000}, 0},
		{"overpaid", due, &slotledger.Holding{Cash: 95000}, 0},
		{"unpaid waives the whole amount", due, nil, 90000},
		{"no fee set waives nothing", nil, &slotledger.Holding{}, 0},
	}
	for _, c := range cases {
		if got := slotledger.Waiver(c.due, c.h); got != c.want {
			t.Errorf("%s: %d, want %d", c.name, got, c.want)
		}
	}
	first := slotledger.SnapshotOf(due, &slotledger.Holding{Cash: 50000})
	if want := (slotledger.Snapshot{AmountDue: due, Paid: 50000, Waived: 40000}); !reflect.DeepEqual(first, want) {
		t.Errorf("snapshot %+v, want %+v", first, want)
	}
	carried := slotledger.Carried(first)
	if carried != (slotledger.Holding{Cash: 50000, Waived: 40000}) {
		t.Errorf("carried %+v", carried)
	}
	if got, want := slotledger.SnapshotOf(due, &carried), (slotledger.Snapshot{AmountDue: due, Paid: 50000, PriorWaived: 40000}); !reflect.DeepEqual(got, want) {
		t.Errorf("repeat %+v, want %+v", got, want)
	}
	// The fee rose by ₱100 between the approvals: only the new ₱100 is waived.
	if got := slotledger.Waiver(p(100000), &carried); got != 10000 {
		t.Errorf("fee rise waives %d, want 10000", got)
	}
}

func at(v int64) *int64 { return &v }

// A → B → C: A paid ₱500 of ₱900; B paid nothing; C now holds the slot.
func transfers() []slotledger.Transfer {
	s1 := slotledger.SnapshotOf(due, &slotledger.Holding{Cash: 50000})
	c1 := slotledger.Carried(s1)
	s2 := slotledger.SnapshotOf(due, &c1)
	return []slotledger.Transfer{
		{ID: "t2", Pid: "B", RecipientPid: "C", Status: "approved", DecidedAt: at(200), Payment: &s2},
		{ID: "tx", Pid: "C", Status: "rejected", DecidedAt: at(300)},
		{ID: "t1", Pid: "A", RecipientPid: "B", Status: "approved", DecidedAt: at(100), Payment: &s1},
	}
}

func ids(ts []slotledger.Transfer) []string {
	out := []string{}
	for _, t := range ts {
		out = append(out, t.ID)
	}
	return out
}

func TestChain(t *testing.T) {
	if got := ids(slotledger.Chain(transfers(), "C")); !reflect.DeepEqual(got, []string{"t1", "t2"}) {
		t.Errorf("chain of C %v", got)
	}
	if got := slotledger.Chain(transfers(), "A"); len(got) != 0 {
		t.Errorf("chain of A %v", ids(got))
	}
	// An entry that gave the slot away no longer holds the carried slot.
	if got := slotledger.Chain(transfers(), "B"); len(got) != 0 {
		t.Errorf("chain of B %v", ids(got))
	}
	steps := slotledger.Steps(slotledger.Chain(transfers(), "C"), func(t slotledger.Transfer) slotledger.Names {
		return slotledger.Names{From: t.Pid, To: t.RecipientPid}
	})
	want := []slotledger.Step{
		{TransferID: "t1", FromName: "A", ToName: "B", PaidByGiver: 50000, SlotPaid: 50000, Waived: 40000, AmountDue: due, ApprovedAt: 100},
		{TransferID: "t2", FromName: "B", ToName: "C", PaidByGiver: 0, SlotPaid: 50000, Waived: 0, AmountDue: due, ApprovedAt: 200},
	}
	if !reflect.DeepEqual(steps, want) {
		t.Errorf("steps %+v, want %+v", steps, want)
	}
}

func TestEntryPayments(t *testing.T) {
	ts := transfers()
	a := &slotledger.OwnMark{Amount: p(50000), MarkedAt: 50}
	// The recipient is Paid in Full and owes nothing, carrying the cash, not adding to it.
	c := slotledger.Of("C", nil, ts, due, nil)
	if c.Mark == nil || *c.Mark.Amount != 50000 || c.Mark.Waived != 40000 {
		t.Errorf("C %+v", c.Mark)
	}
	// The sender's mark stays as recorded and is frozen into the slot.
	sender := slotledger.Of("A", a, ts, due, nil)
	if !sender.Frozen || sender.Mark != nil {
		t.Errorf("A %+v", sender)
	}
	// A later own payment by the recipient adds cash once.
	own := slotledger.Of("C", &slotledger.OwnMark{Amount: p(10000), MarkedAt: 250}, ts, due, nil)
	if *own.Mark.Amount != 60000 || own.Mark.Waived != 40000 {
		t.Errorf("C with own %+v", own.Mark)
	}
	// The next approval's holding is the slot's cash and waivers.
	if got := slotledger.HoldingOf(c, due); got == nil || *got != (slotledger.Holding{Cash: 50000, Waived: 40000}) {
		t.Errorf("holding %+v", got)
	}
	if got := slotledger.HoldingOf(slotledger.Of("Z", nil, ts, due, nil), due); got != nil {
		t.Errorf("holding of Z %+v", got)
	}
	// A legacy mark with no amount counts at the amount due.
	legacy := slotledger.Of("E", &slotledger.OwnMark{MarkedAt: 1}, nil, due, nil)
	if got := slotledger.HoldingOf(legacy, due); got == nil || got.Cash != 90000 {
		t.Errorf("legacy %+v", got)
	}
	// A row approved before #1013 carries nothing.
	old := []slotledger.Transfer{{ID: "t1", Pid: "A", RecipientPid: "B", Status: "approved", DecidedAt: at(100)}}
	if got := slotledger.Of("B", nil, old, due, nil); got.Mark == nil || *got.Mark.Amount != 0 || got.Mark.Waived != 0 {
		t.Errorf("before 1013 %+v", got.Mark)
	}
}

func TestRefunds(t *testing.T) {
	refunds := []slotledger.Refund{{Pid: "A", Amount: 30000, RefundedAt: 5}}
	if got := slotledger.RefundedFor(refunds, "A"); got != 30000 {
		t.Errorf("refunded %d", got)
	}
	if got := slotledger.RefundedFor(nil, "A"); got != 0 {
		t.Errorf("refunded %d", got)
	}
	if slotledger.NetKept(10000, 25000) != 0 || slotledger.NetKept(90000, 30000) != 60000 || slotledger.NetKept(-5, 0) != 0 {
		t.Errorf("net kept")
	}
	if slotledger.FullRefund(-4) != 0 || slotledger.FullRefund(7) != 7 {
		t.Errorf("full refund")
	}
	// Net kept on an own mark, and a legacy mark with no amount needs the number once refunded.
	got := slotledger.Of("A", &slotledger.OwnMark{Amount: p(90000), MarkedAt: 1}, nil, due, refunds)
	if *got.Mark.Amount != 60000 || got.Refunded != 30000 {
		t.Errorf("net of a refund %+v", got)
	}
	legacy := slotledger.Of("A", &slotledger.OwnMark{MarkedAt: 1}, nil, due, refunds)
	if *legacy.Mark.Amount != 60000 {
		t.Errorf("legacy net of a refund %+v", legacy.Mark)
	}
	// First eligible waiter: none while no slot is open or nobody has a level.
	ws := []int{0, 1, 2}
	has := func(v int) bool { return v >= 1 }
	if slotledger.FirstEligible(ws, 0, has) != -1 || slotledger.FirstEligible(ws, 1, has) != 1 || slotledger.FirstEligible(ws, 1, func(int) bool { return false }) != -1 {
		t.Errorf("first eligible")
	}
	if got := slotledger.RefundChanged(123450); got != "The payment for this slot changed: the full refund is now ₱1,234.50. Check and try again." {
		t.Errorf("text %q", got)
	}
	name := "Dee"
	if slotledger.TransferRefundToast("Al", 50000, &name) != "Transfer rejected · ₱500 refund recorded for Al · Dee got the slot from the waitlist" ||
		slotledger.TransferRefundToast("Al", 50000, nil) != "Transfer rejected · ₱500 refund recorded for Al · the slot is open" {
		t.Errorf("refund toast")
	}
}
