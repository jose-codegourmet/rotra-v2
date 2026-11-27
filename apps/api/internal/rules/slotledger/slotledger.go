// Package slotledger holds Go-only (bucket 2) rules: pure functions with no database, HTTP, clock or randomness. It is the slot transfer
// accounting (#1013, packages/data/src/slot-transfer/transferAccounting.rules.ts) and the manual full refunds (#1014,
// packages/data/src/session-payment/paymentRefund.rules.ts). Money is integer centavos. ROTRA moves no money: a waiver is a record, never
// cash, and a refund is a record that the Queue Master handed cash back outside ROTRA.
package slotledger

import (
	"slices"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// Snapshot is the money an approval writes on the transfer row, once. AmountDue is nil with no fee set.
type Snapshot struct {
	AmountDue                 *int64
	Paid, PriorWaived, Waived int64
}

// Holding is what a slot holds: the cash collected for it and the amounts waived on it.
type Holding struct{ Cash, Waived int64 }

// Waiver is transferWaiver: the amount due minus the cash and the earlier waivers, at least 0 (0 with no fee set).
func Waiver(amountDue *int64, h *Holding) int64 {
	if amountDue == nil {
		return 0
	}
	var cash, waived int64
	if h != nil {
		cash, waived = max(h.Cash, 0), max(h.Waived, 0)
	}
	return max(*amountDue-cash-waived, 0)
}

// SnapshotOf is transferSnapshot: the snapshot an approval writes, from the sender's slot holding and today's amount due.
func SnapshotOf(amountDue *int64, h *Holding) Snapshot {
	s := Snapshot{AmountDue: amountDue, Waived: Waiver(amountDue, h)}
	if h != nil {
		s.Paid, s.PriorWaived = max(h.Cash, 0), max(h.Waived, 0)
	}
	return s
}

// Carried is carriedHolding: what an approved transfer carries into the recipient's entry, the slot's cash and every waiver.
func Carried(s Snapshot) Holding { return Holding{Cash: s.Paid, Waived: s.PriorWaived + s.Waived} }

// Transfer is the part of a transfer the accounting reads. DecidedAt is milliseconds, nil when undecided; Payment is nil on a row
// approved before #1013, which carries nothing.
type Transfer struct {
	ID, Pid, RecipientPid, Status string // RecipientPid is "" until approved
	DecidedAt                     *int64
	Payment                       *Snapshot
}

// Refund is a refund the readers use: the entry refunded, its amount and when (milliseconds).
type Refund struct {
	Pid        string
	Amount     int64
	RefundedAt int64
}

func approved(ts []Transfer) []Transfer {
	var out []Transfer
	for _, t := range ts {
		if t.Status == "approved" && t.DecidedAt != nil {
			out = append(out, t)
		}
	}
	return out
}

// Chain is transferChain: the approved transfers that brought the slot to this entry, oldest first (none when the entry holds its own
// slot). Each step's sender entry is the previous step's recipient entry. An entry that sent its slot away after receiving it no
// longer holds the carried slot.
func Chain(ts []Transfer, entry string) []Transfer {
	ok := approved(ts)
	latest := func(pred func(Transfer) bool, before int64, bounded bool) *Transfer {
		var best *Transfer
		for i := range ok {
			t := &ok[i]
			if !pred(*t) || bounded && *t.DecidedAt > before {
				continue
			}
			// sort by decidedAt descending and take the first: a later row replaces the best only when strictly later
			if best == nil || *t.DecidedAt > *best.DecidedAt {
				best = t
			}
		}
		return best
	}
	incoming := latest(func(t Transfer) bool { return t.RecipientPid == entry }, 0, false)
	if incoming == nil {
		return nil
	}
	if outgoing := latest(func(t Transfer) bool { return t.Pid == entry }, 0, false); outgoing != nil && *outgoing.DecidedAt >= *incoming.DecidedAt {
		return nil
	}
	chain := []Transfer{*incoming}
	seen := map[string]bool{incoming.ID: true}
	for {
		first := chain[0]
		prev := latest(func(t Transfer) bool { return t.RecipientPid == first.Pid && !seen[t.ID] }, *first.DecidedAt, true)
		if prev == nil {
			break
		}
		seen[prev.ID] = true
		chain = append([]Transfer{*prev}, chain...)
	}
	return chain
}

// MarkFrozen is isMarkFrozen: the entry's own mark is frozen when the entry gave its slot away after the mark was recorded. That cash
// now belongs to the slot, so it is not counted on this entry again.
func MarkFrozen(ts []Transfer, entry string, hasMark bool, markedAt int64) bool {
	if !hasMark {
		return false
	}
	for _, t := range approved(ts) {
		if t.Pid == entry && *t.DecidedAt >= markedAt {
			return true
		}
	}
	return false
}

// RefundedFor is refundedFor: the cash refunded on one entry so far (0 or one full refund; summed defensively).
func RefundedFor(rs []Refund, entry string) int64 {
	var sum int64
	for _, r := range rs {
		if r.Pid == entry {
			sum += max(r.Amount, 0)
		}
	}
	return sum
}

// NetKept is netKeptCash: the cash the club still keeps, the cash received minus the cash refunded, never below 0.
func NetKept(cash, refunded int64) int64 { return max(max(cash, 0)-max(refunded, 0), 0) }

// FullRefund is fullRefundAmount: all the cash an entry still holds, 0 when there is nothing to hand back.
func FullRefund(netCash int64) int64 { return max(netCash, 0) }

// OwnMark is an entry's own payment mark: Amount is nil on a legacy mark that meant paid in full.
type OwnMark struct {
	Amount   *int64
	MarkedAt int64
}

// EntryMark is the payment to show and total: the cash (own plus carried, net of a refund) and every waiver on the slot. Amount is nil
// only for a legacy own mark with no amount when nothing is carried or refunded.
type EntryMark struct {
	Amount *int64
	Waived int64
}

// EntryPayment is one roster entry's payment, with the slot's transfer history.
type EntryPayment struct {
	Mark     *EntryMark // nil: nothing paid, nothing carried
	Chain    []Transfer
	Frozen   bool  // the own mark is frozen into a transfer this entry sent
	Refunded int64 // cash refunded on this entry, already out of Mark.Amount
}

// received is receivedAmount of a mark: a legacy mark with no amount is the current amount due (0 with no fee set).
func received(amount *int64, due *int64) int64 {
	if amount != nil {
		return *amount
	}
	if due != nil {
		return *due
	}
	return 0
}

// Of is entrySlotPayment: a live roster entry's payment, its own mark (unless frozen) plus what the last approved transfer carried into
// it. Cash is counted once across the chain (the senders' entries are off the roster). A manual refund comes off the entry's cash.
func Of(entry string, own *OwnMark, ts []Transfer, due *int64, refunds []Refund) EntryPayment {
	frozen := own != nil && MarkFrozen(ts, entry, true, own.MarkedAt)
	if frozen {
		own = nil
	}
	chain := Chain(ts, entry)
	refunded := RefundedFor(refunds, entry)
	if len(chain) == 0 {
		if own == nil {
			return EntryPayment{Chain: chain, Frozen: frozen, Refunded: refunded}
		}
		amount := own.Amount
		if refunded != 0 {
			v := NetKept(received(own.Amount, due), refunded)
			amount = &v
		}
		return EntryPayment{Mark: &EntryMark{Amount: amount}, Chain: chain, Frozen: frozen, Refunded: refunded}
	}
	last := chain[len(chain)-1]
	var carried Holding
	if last.Payment != nil {
		carried = Carried(*last.Payment)
	}
	var ownCash int64
	if own != nil {
		ownCash = received(own.Amount, due)
	}
	v := NetKept(ownCash+carried.Cash, refunded)
	return EntryPayment{Mark: &EntryMark{Amount: &v, Waived: carried.Waived}, Chain: chain, Frozen: frozen, Refunded: refunded}
}

// Received is receivedAmount of the entry's mark at the amount due.
func (p EntryPayment) Received(due *int64) int64 {
	if p.Mark == nil {
		return 0
	}
	return received(p.Mark.Amount, due)
}

// HoldingOf is holdingOf: the slot's holding as cash and waived, for the next approval's snapshot; nil with no mark.
func HoldingOf(p EntryPayment, due *int64) *Holding {
	if p.Mark == nil {
		return nil
	}
	return &Holding{Cash: p.Received(due), Waived: p.Mark.Waived}
}

// Step is one step of a slot's transfer history, for the Slot history sheet. Times are milliseconds.
type Step struct {
	TransferID, FromName, ToName  string
	PaidByGiver, SlotPaid, Waived int64
	AmountDue                     *int64
	ApprovedAt                    int64
	ViaLink                       bool
}

// Names are the two names and the way a step was made.
type Names struct {
	From, To string
	ViaLink  bool
}

// Steps is slotTransferSteps: the history steps of a chain, oldest first. A giver's own cash is the step's slot cash minus the
// previous step's; a row approved before #1013 shows nothing paid or waived.
func Steps(chain []Transfer, names func(Transfer) Names) []Step {
	var before int64
	out := make([]Step, 0, len(chain))
	for _, t := range chain {
		var slotPaid, waived int64
		var due *int64
		if t.Payment != nil {
			slotPaid, waived, due = t.Payment.Paid, t.Payment.Waived, t.Payment.AmountDue
		}
		n := names(t)
		out = append(out, Step{
			TransferID: t.ID, FromName: n.From, ToName: n.To, ViaLink: n.ViaLink, PaidByGiver: max(slotPaid-before, 0), SlotPaid: slotPaid,
			Waived: waived, AmountDue: due, ApprovedAt: *t.DecidedAt,
		})
		before = slotPaid
	}
	return out
}

// FirstEligible is firstEligibleWaiter: the first waitlisted person, in the waitlist's own order, who has a level for this club, while a
// slot is open. -1 when no slot is open (an over-full roster stays as it is) or nobody is eligible.
func FirstEligible[T any](ordered []T, openSlots int64, hasLevel func(T) bool) int {
	if openSlots <= 0 {
		return -1
	}
	return slices.IndexFunc(ordered, hasLevel)
}

// The texts the TypeScript rules send.
const (
	TransferAlreadyDecided = "This transfer request has already been decided."
	TransferStarted        = "The session has started. Slot transfers close at the start."
	TransferNotFound       = "No registered ROTRA player has that RTR ID."
	TransferSenderGone     = "The sender no longer has this slot. Reject the request."
	TransferPaymentLocked  = "This slot was paid through a slot transfer, so its payment can't be changed here."
	FreePaymentLocked      = "This slot was paid on a transfer, so it can’t be set free."
	RefundNothingPaid      = "Nothing was paid for this slot, so there is nothing to refund. Use Reject instead."
	RefundNotCancelled     = "Refunds are recorded only for a cancelled session."
	RefundNothingToRefund  = "This player has no cash to refund."
	PaymentRefundedLocked  = "This player's payment was refunded, so it can't be changed here."
)

// RefundChanged is REFUND_CHANGED_ERROR.
func RefundChanged(amount int64) string {
	return "The payment for this slot changed: the full refund is now " + club.FormatPeso(amount) + ". Check and try again."
}

// TransferRejectedToast is transferRejectedToast.
func TransferRejectedToast(sender string) string {
	return "Transfer rejected · " + sender + " keeps the slot"
}

// TransferRefundToast is transferRefundToast.
func TransferRefundToast(sender string, amount int64, promoted *string) string {
	tail := " · the slot is open"
	if promoted != nil {
		tail = " · " + *promoted + " got the slot from the waitlist"
	}
	return "Transfer rejected · " + club.FormatPeso(amount) + " refund recorded for " + sender + tail
}

// SessionRefundToast is sessionRefundToast.
func SessionRefundToast(name string, amount int64) string {
	return "Refund recorded · " + club.FormatPeso(amount) + " to " + name
}
