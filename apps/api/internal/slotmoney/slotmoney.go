// Package slotmoney reads a session's slot transfer accounting from the database: the port of slotLedger in
// packages/db/src/queue/transfer-accounting.ts. Every reader of payment marks (the Payments read, the public payment status, the
// payment writes and the transfer decisions) goes through one Ledger, so a slot's cash is counted once across a chain of transfers and
// a waiver is never cash. The rules are internal/rules/slotledger; this package only loads the rows they read.
package slotmoney

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/slotledger"
)

// Mark is an entry's own payment mark as stored.
type Mark struct {
	Amount   *int64 // nil on a legacy mark that meant paid in full
	Currency string
	MarkedAt pgtype.Timestamptz
}

// Refund is the manual full refund recorded on an entry.
type Refund struct {
	Amount     int64
	Currency   string
	RefundedAt pgtype.Timestamptz
}

type names struct {
	from, to string
	viaLink  bool
}

// Ledger is the session's approved transfers, payment marks and refunds, read once.
type Ledger struct {
	transfers []slotledger.Transfer
	names     map[string]names
	marks     map[string]Mark
	refunds   []slotledger.Refund
	refunded  map[string]Refund
}

func ms(t pgtype.Timestamptz) int64 { return t.Time.UnixMilli() }

func opt(v pgtype.Int4) *int64 {
	if !v.Valid {
		return nil
	}
	n := int64(v.Int32)
	return &n
}

// Load is slotLedger: it reads the session's approved transfers, payment marks and refunds inside the caller's transaction.
func Load(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID) (*Ledger, error) {
	rows, err := q.ListLedgerApprovedTransfers(ctx, session)
	if err != nil {
		return nil, err
	}
	marks, err := q.ListQueuePaymentMarks(ctx, session)
	if err != nil {
		return nil, err
	}
	refunds, err := q.ListLedgerRefunds(ctx, session)
	if err != nil {
		return nil, err
	}
	l := &Ledger{names: map[string]names{}, marks: map[string]Mark{}, refunded: map[string]Refund{}}
	for _, t := range rows {
		decided := ms(t.DecidedAt)
		tr := slotledger.Transfer{ID: t.ID.String(), Pid: t.SenderSessionPlayerID.String(), Status: "approved", DecidedAt: &decided}
		if t.RecipientSessionPlayerID.Valid {
			tr.RecipientPid = t.RecipientSessionPlayerID.String()
		}
		// A row approved before #1013 (local databases only) has no snapshot: it carries nothing.
		if t.AmountPaidMinor.Valid {
			tr.Payment = &slotledger.Snapshot{
				AmountDue: opt(t.AmountDueMinor), Paid: int64(t.AmountPaidMinor.Int32), PriorWaived: int64(t.PriorWaivedMinor.Int32),
				Waived: int64(t.WaivedMinor.Int32),
			}
		}
		l.transfers = append(l.transfers, tr)
		to := "A player"
		if t.ToName.Valid {
			to = t.ToName.String
		}
		l.names[tr.ID] = names{from: t.FromName, to: to, viaLink: t.ViaLink}
	}
	for _, m := range marks {
		l.marks[m.SessionPlayerID.String()] = Mark{Amount: opt(m.AmountMinor), Currency: m.Currency, MarkedAt: m.MarkedAt}
	}
	for _, r := range refunds {
		id := r.SessionPlayerID.String()
		l.refunds = append(l.refunds, slotledger.Refund{Pid: id, Amount: int64(r.AmountMinor), RefundedAt: ms(r.RefundedAt)})
		l.refunded[id] = Refund{Amount: int64(r.AmountMinor), Currency: r.Currency, RefundedAt: r.RefundedAt}
	}
	return l, nil
}

// PaymentOf is paymentOf: the entry's payment at the amount due, with the slot's transfer history.
func (l *Ledger) PaymentOf(entry pgtype.UUID, due *int64) slotledger.EntryPayment {
	id := entry.String()
	var own *slotledger.OwnMark
	if m, ok := l.marks[id]; ok {
		own = &slotledger.OwnMark{Amount: m.Amount, MarkedAt: ms(m.MarkedAt)}
	}
	return slotledger.Of(id, own, l.transfers, due, l.refunds)
}

// MarkOf is markOf: the entry's own mark as stored.
func (l *Ledger) MarkOf(entry pgtype.UUID) (Mark, bool) {
	m, ok := l.marks[entry.String()]
	return m, ok
}

// RefundOf is refundOf: the manual full refund recorded on an entry.
func (l *Ledger) RefundOf(entry pgtype.UUID) (Refund, bool) {
	r, ok := l.refunded[entry.String()]
	return r, ok
}

// IsRefunded is isRefunded: the entry was refunded; its marks are frozen.
func (l *Ledger) IsRefunded(entry pgtype.UUID) bool {
	_, ok := l.refunded[entry.String()]
	return ok
}

// IsCarried is isCarried: the slot came by transfer, so it already reads Paid.
func (l *Ledger) IsCarried(entry pgtype.UUID) bool { return len(l.PaymentOf(entry, nil).Chain) > 0 }

// IsLocked is isLocked: a slot that came by transfer is Paid in Full through its history, and a mark frozen into a transfer is part of
// it; a refunded entry is locked too. None may change through the Payments commands.
func (l *Ledger) IsLocked(entry pgtype.UUID) bool {
	p := l.PaymentOf(entry, nil)
	return len(p.Chain) > 0 || p.Frozen || l.IsRefunded(entry)
}

// Step is one step of a slot's transfer history as the Payments read sends it.
type Step struct {
	TransferID  string `json:"transferId"`
	FromName    string `json:"fromName"`
	ToName      string `json:"toName"`
	PaidByGiver int64  `json:"paidByGiverMinor"`
	SlotPaid    int64  `json:"slotPaidMinor"`
	Waived      int64  `json:"waivedMinor"`
	AmountDue   *int64 `json:"amountDueMinor"`
	ApprovedAt  string `json:"approvedAt"`
	ViaLink     bool   `json:"viaLink"`
}

// Transfer is the Payments read's `transfer` (waivers and the chain), or nil for an own slot (transferOf).
type Transfer struct {
	Waived int64  `json:"waivedMinor"`
	Steps  []Step `json:"steps"`
}

// TransferOf is transferOf; iso turns a time in milliseconds into the ISO text the wire carries.
func (l *Ledger) TransferOf(p slotledger.EntryPayment, iso func(ms int64) string) *Transfer {
	if len(p.Chain) == 0 || p.Mark == nil {
		return nil
	}
	steps := slotledger.Steps(p.Chain, func(t slotledger.Transfer) slotledger.Names {
		n := l.names[t.ID]
		return slotledger.Names{From: n.from, To: n.to, ViaLink: n.viaLink}
	})
	out := &Transfer{Waived: p.Mark.Waived, Steps: make([]Step, len(steps))}
	for i, s := range steps {
		out.Steps[i] = Step{
			TransferID: s.TransferID, FromName: s.FromName, ToName: s.ToName, PaidByGiver: s.PaidByGiver, SlotPaid: s.SlotPaid, Waived: s.Waived,
			AmountDue: s.AmountDue, ApprovedAt: iso(s.ApprovedAt), ViaLink: s.ViaLink,
		}
	}
	return out
}
