package payment

// Kind is what a player's payment looks like against the current amount due.
type Kind string

// The four statuses.
const (
	Unpaid    Kind = "unpaid"
	Paid      Kind = "paid"
	Partial   Kind = "partial"
	Reimburse Kind = "reimburse"
)

// Status is a payment status. Amount is what is left (Partial) or what to return (Reimburse); it is 0 otherwise.
type Status struct {
	Kind   Kind
	Amount int64
}

// Mark is a recorded payment. A nil Amount is an older mark that meant paid in full. No mark is a nil *Mark. Waived is the amount a slot
// transfer waived on the slot (#1013: a record, never cash) and Refunded the cash a manual refund took out of Amount (#1014); Amount is
// already net of the refund.
type Mark struct {
	Amount   *int64
	Waived   int64
	Refunded int64
}

// Received is receivedAmount: what a mark counts as received. A mark with no amount counts as the current amount due (0 with no
// fee set), and no mark received nothing.
func Received(m *Mark, due *int64) int64 {
	if m == nil {
		return 0
	}
	if m.Amount != nil {
		return *m.Amount
	}
	if due != nil {
		return *due
	}
	return 0
}

// StatusOf is paymentStatus: no mark is Unpaid, and with no fee set any mark is Paid. Otherwise the cash received plus the amount waived
// by slot transfers is compared with the current amount due: equal is Paid, nothing at all is Unpaid, below is Partial and above is
// Reimburse for the cash above the amount due only (a waiver is never cash: a slot covered past the amount due by a waiver is Paid).
func StatusOf(m *Mark, due *int64) Status {
	if m == nil {
		return Status{Kind: Unpaid}
	}
	if due == nil {
		return Status{Kind: Paid}
	}
	received := Received(m, due)
	covered := received + max(m.Waived, 0)
	switch {
	case covered == *due:
		return Status{Kind: Paid}
	case covered <= 0:
		return Status{Kind: Unpaid}
	case covered < *due:
		return Status{Kind: Partial, Amount: *due - covered}
	}
	if back := received - *due; back > 0 {
		return Status{Kind: Reimburse, Amount: back}
	}
	return Status{Kind: Paid}
}

// StatusForReceived is statusForReceived: the status an amount typed in the payment editor would save. Zero removes the mark, so it
// previews as Unpaid even with no fee set.
func StatusForReceived(received int64, due *int64) Status {
	if received > 0 {
		return StatusOf(&Mark{Amount: &received}, due)
	}
	return StatusOf(nil, due)
}

// IsFullyPaid is isFullyPaid: Paid and Reimburse players are fully covered.
func IsFullyPaid(s Status) bool { return s.Kind == Paid || s.Kind == Reimburse }

// Totals are the Payments checklist totals over one roster. StillDue is nil with no fee set and AgainstCosts is nil without an
// estimate. Waived and Refunded are records, never cash; Free is the count of free players the caller left out of the marks and the
// total (D-2026-11-27-01), sent only while someone is free.
type Totals struct {
	Paid, Partial, Total, Collected, Waived, Refunded int64
	StillDue                                          *int64
	ToReimburse                                       int64
	AgainstCosts                                      *int64
	Cost                                              *int64
	Free                                              int64
}

// ComputeTotals is paymentTotals: marks holds one entry per marked roster player and total the roster size (unmarked players received
// nothing). Paid counts Paid and Reimburse; collected is the cash received (net of a refund, never a waiver); still due is what each
// player owes at the current fee after cash and waivers (the whole amount for an unmarked one), to reimburse is the cash received above
// it, and against costs is collected minus the total cost. free is the free players the caller left out.
func ComputeTotals(marks []Mark, total int64, due, cost *int64, free int64) Totals {
	var paid, partial, collected, owed, waived, refunded, toReimburse int64
	for i := range marks {
		m := &marks[i]
		status := StatusOf(m, due)
		received := Received(m, due)
		markWaived := max(m.Waived, 0)
		collected += received
		waived += markWaived
		refunded += max(m.Refunded, 0)
		if IsFullyPaid(status) {
			paid++
		}
		if status.Kind == Partial {
			partial++
		}
		if due != nil {
			owed += max(*due-received-markWaived, 0)
			toReimburse += max(received-*due, 0)
		}
	}
	t := Totals{Paid: paid, Partial: partial, Total: total, Collected: collected, Waived: waived, Refunded: refunded, ToReimburse: toReimburse, Cost: cost, Free: free}
	if due != nil {
		v := (total-int64(len(marks)))**due + owed
		t.StillDue = &v
	}
	if cost != nil {
		v := collected - *cost
		t.AgainstCosts = &v
	}
	return t
}
