package payment_test

import (
	"reflect"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/payment"
)

func ptr(v int64) *int64 { return &v }

func mark(v int64) *payment.Mark { return &payment.Mark{Amount: ptr(v)} }

// Ported from packages/data/src/session-payment/sessionPayment.rules.test.ts. The Vitest file has 8 cases ("payment status (#479)":
// 4, "payment totals": 4); each is one test here. statusForReceived and isFullyPaid have no Vitest case of their own.

// 'compares the amount received with the current amount due'
func TestStatusComparesReceivedWithDue(t *testing.T) {
	due := ptr(70000)
	for name, tc := range map[string]struct {
		mark *payment.Mark
		want payment.Status
	}{
		"no mark":         {nil, payment.Status{Kind: payment.Unpaid}},
		"zero received":   {mark(0), payment.Status{Kind: payment.Unpaid}},
		"paid":            {mark(70000), payment.Status{Kind: payment.Paid}},
		"partial":         {mark(50000), payment.Status{Kind: payment.Partial, Amount: 20000}},
		"more than asked": {mark(80000), payment.Status{Kind: payment.Reimburse, Amount: 10000}},
	} {
		if got := payment.StatusOf(tc.mark, due); got != tc.want {
			t.Errorf("%s: %+v, want %+v", name, got, tc.want)
		}
	}
}

// 're-derives after a price change without touching the amount received'
func TestStatusRederivesAfterAPriceChange(t *testing.T) {
	m := mark(59700)
	if got, want := payment.StatusOf(m, ptr(55000)), (payment.Status{Kind: payment.Reimburse, Amount: 4700}); got != want {
		t.Errorf("%+v, want %+v", got, want)
	}
	if got, want := payment.StatusOf(m, ptr(65000)), (payment.Status{Kind: payment.Partial, Amount: 5300}); got != want {
		t.Errorf("%+v, want %+v", got, want)
	}
	if *m.Amount != 59700 {
		t.Errorf("the amount received changed to %d", *m.Amount)
	}
}

// 'counts a legacy mark with no amount as paid at the current due'
func TestLegacyMarkCountsAsPaidAtTheCurrentDue(t *testing.T) {
	legacy := &payment.Mark{}
	if got := payment.Received(legacy, ptr(70000)); got != 70000 {
		t.Errorf("received %d, want 70000", got)
	}
	if got := payment.StatusOf(legacy, ptr(70000)); got != (payment.Status{Kind: payment.Paid}) {
		t.Errorf("%+v, want paid", got)
	}
	// Also: no mark received nothing, and a legacy mark with no fee set counts as 0.
	if got := payment.Received(nil, ptr(70000)); got != 0 {
		t.Errorf("no mark received %d, want 0", got)
	}
	if got := payment.Received(legacy, nil); got != 0 {
		t.Errorf("legacy mark with no fee received %d, want 0", got)
	}
}

// 'treats any mark as paid when no fee is set'
func TestAnyMarkIsPaidWithNoFee(t *testing.T) {
	if got := payment.StatusOf(mark(30000), nil); got != (payment.Status{Kind: payment.Paid}) {
		t.Errorf("%+v, want paid", got)
	}
	if got := payment.StatusOf(nil, nil); got != (payment.Status{Kind: payment.Unpaid}) {
		t.Errorf("%+v, want unpaid", got)
	}
}

func TestStatusForReceived(t *testing.T) {
	// A zero amount removes the mark, so it previews as unpaid even with no fee set; a positive one is compared as a mark.
	for name, tc := range map[string]struct {
		received int64
		due      *int64
		want     payment.Status
	}{
		"zero with no fee":  {0, nil, payment.Status{Kind: payment.Unpaid}},
		"zero with a fee":   {0, ptr(70000), payment.Status{Kind: payment.Unpaid}},
		"some with no fee":  {100, nil, payment.Status{Kind: payment.Paid}},
		"less than the due": {100, ptr(70000), payment.Status{Kind: payment.Partial, Amount: 69900}},
		"the due":           {70000, ptr(70000), payment.Status{Kind: payment.Paid}},
		"more than the due": {70100, ptr(70000), payment.Status{Kind: payment.Reimburse, Amount: 100}},
	} {
		if got := payment.StatusForReceived(tc.received, tc.due); got != tc.want {
			t.Errorf("%s: %+v, want %+v", name, got, tc.want)
		}
	}
	for kind, want := range map[payment.Kind]bool{payment.Paid: true, payment.Reimburse: true, payment.Partial: false, payment.Unpaid: false} {
		if got := payment.IsFullyPaid(payment.Status{Kind: kind}); got != want {
			t.Errorf("IsFullyPaid(%s) = %v", kind, got)
		}
	}
}

// 'uses the received amounts while calculating remaining dues at the current fee'
func TestTotalsUseReceivedAmounts(t *testing.T) {
	got := payment.ComputeTotals([]payment.Mark{*mark(70000), *mark(65000)}, 3, ptr(70000), ptr(200000), 0)
	want := payment.Totals{Paid: 1, Partial: 1, Total: 3, Collected: 135000, StillDue: ptr(75000), ToReimburse: 0, AgainstCosts: ptr(-65000), Cost: ptr(200000)}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("%+v, want %+v", got, want)
	}
}

// 'counts overpayments as paid and totals what to reimburse'
func TestTotalsCountOverpaymentsAsPaid(t *testing.T) {
	got := payment.ComputeTotals([]payment.Mark{*mark(80000), {}}, 2, ptr(70000), nil, 0)
	if got.Paid != 2 || got.Partial != 0 || got.Collected != 150000 || *got.StillDue != 0 || got.ToReimburse != 10000 {
		t.Errorf("%+v", got)
	}
}

// 'keeps no-fee and no-estimate totals unknown'
func TestTotalsWithNoFeeStayUnknown(t *testing.T) {
	got := payment.ComputeTotals(nil, 3, nil, nil, 0)
	if want := (payment.Totals{Total: 3}); !reflect.DeepEqual(got, want) {
		t.Errorf("%+v, want %+v", got, want)
	}
}

// 'handles all paid and a collection surplus'
func TestTotalsAllPaidWithASurplus(t *testing.T) {
	got := payment.ComputeTotals([]payment.Mark{*mark(70000)}, 1, ptr(70000), ptr(65000), 0)
	if *got.StillDue != 0 || *got.AgainstCosts != 5000 {
		t.Errorf("%+v", got)
	}
}
