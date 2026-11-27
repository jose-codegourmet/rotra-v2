package queuewrites

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/slotledger"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/slotmoney"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the Queue Master's slot transfer decisions that end in a rejection: Reject and Reject and refund
// (apps/queue/src/app/api/sessions/{id}/requests/transfers/{transferId}/{reject,refund}, rejectSlotTransfer and
// rejectAndRefundSlotTransfer in packages/db/src/queue/slot-transfers.ts). Approve and the Player's seven slot-transfer routes are not
// ported (task 5.5). ROTRA moves no money: a refund is a record that the Queue Master handed the cash back outside ROTRA.

func (s *server) registerTransfers(rt *signedin.Router) {
	club := store.AudienceClub
	rt.Handle("POST /api/sessions/{sessionId}/requests/transfers/{transferId}/reject", club, s.club(s.rejectSlotTransfer))
	rt.Handle("POST /api/sessions/{sessionId}/requests/transfers/{transferId}/refund", club, s.club(s.rejectAndRefundSlotTransfer))
}

// decision is decision: it runs decide on the locked session and the locked pending transfer. Refused when the transfer was decided
// already or the session started. A database error comes back mapped (the TypeScript's rethrow).
func (s *server) decision(r *http.Request, club pgtype.UUID, decide func(t *txn, transfer sqlcgen.LockSlotTransferRow) (any, error)) (writes.Result, error) {
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		id, ok := writes.ParseUUID(r.PathValue("transferId"))
		if !ok || !hyphenatedUUID.MatchString(r.PathValue("transferId")) {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		transfer, err := t.q.LockSlotTransfer(t.ctx, sqlcgen.LockSlotTransferParams{ID: id, SessionID: t.sess.ID})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return nil, err
		}
		if transfer.Status != sqlcgen.SlotTransferStatusPending {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"transfer": slotledger.TransferAlreadyDecided})
		}
		if t.sess.State != sqlcgen.QueueSessionStatePrepared {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"transfer": slotledger.TransferStarted})
		}
		return decide(t, transfer)
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

type transferAnswer struct {
	TransferID string `json:"transferId"`
	Message    string `json:"message"`
}

// rejectSlotTransfer is Reject: the transfer closes; the sender keeps the slot and every payment record.
func (s *server) rejectSlotTransfer(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	return s.decision(r, club, func(t *txn, transfer sqlcgen.LockSlotTransferRow) (any, error) {
		// An unclaimed transfer link (#1012) is not in Requests; the sender cancels it instead.
		if !transfer.RecipientPlayerID.Valid {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"transfer": slotledger.TransferNotFound})
		}
		sender, err := t.q.GetSessionPlayerForTransfer(t.ctx, transfer.SenderSessionPlayerID)
		name := "The sender"
		switch {
		case err == nil:
			name = sender.NameSnapshot
		case !errors.Is(err, pgx.ErrNoRows):
			return nil, err
		}
		// Rejection ends a claimed link too: it worked only while pending (#1012).
		if err := t.q.RejectSlotTransfer(t.ctx, sqlcgen.RejectSlotTransferParams{Now: t.stamp(), ID: transfer.ID}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return transferAnswer{transfer.ID.String(), slotledger.TransferRejectedToast(name)}, nil
	})
}

// rejectAndRefundSlotTransfer is Reject and refund (#1014, D-2026-11-22-06): it rejects the transfer and records a manual full refund
// in one transaction on the locked session. The refund is the slot's whole cash (own cash plus cash carried in by earlier transfers;
// never a waiver). The payment marks are not touched (a trigger freezes them). The sender's registration is cancelled (entry released,
// reason refunded; their open drop-out notice closes) and, while a slot is open, the first waitlisted person with a level takes it, in
// waitlist order. Capacity never changes. Refused when nothing was paid (plain Reject instead) and when the amount differs from the one
// the Queue Master confirmed.
func (s *server) rejectAndRefundSlotTransfer(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	// The refund the Queue Master confirmed: missing and null skip the check; anything else must be a whole number of centavos.
	var expected *int64
	if v, has := body["expectedRefundMinor"]; has && v != nil {
		_, isNumber := v.(json.Number)
		f := body.Number("expectedRefundMinor")
		if !isNumber || !safeInteger(f) || f < 0 {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"expectedRefundMinor": "Enter the refund in centavos."})
		}
		e := int64(f)
		expected = &e
	}
	return s.decision(r, club, func(t *txn, transfer sqlcgen.LockSlotTransferRow) (any, error) {
		// An unclaimed transfer link (#1012) is not in Requests; the sender cancels it instead.
		if !transfer.RecipientPlayerID.Valid {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"transfer": slotledger.TransferNotFound})
		}
		sender, err := t.q.GetSessionPlayerForTransfer(t.ctx, transfer.SenderSessionPlayerID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if err != nil || sender.ReleasedAt.Valid || sender.NoShowAt.Valid {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"transfer": slotledger.TransferSenderGone})
		}
		// The slot's whole cash, read the same way as Approve's snapshot (#1013).
		due, err := t.amountDue()
		if err != nil {
			return nil, err
		}
		ledger, err := slotmoney.Load(t.ctx, t.q, t.sess.ID)
		if err != nil {
			return nil, err
		}
		var cash int64
		if h := slotledger.HoldingOf(ledger.PaymentOf(sender.ID, due), due); h != nil {
			cash = h.Cash
		}
		amount := slotledger.FullRefund(cash)
		if amount <= 0 {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"transfer": slotledger.RefundNothingPaid})
		}
		if expected != nil && *expected != amount {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"transfer": slotledger.RefundChanged(amount)})
		}
		now := t.stamp()
		// Rejection ends a claimed link too: it worked only while pending (#1012).
		if err := t.q.RejectSlotTransfer(t.ctx, sqlcgen.RejectSlotTransferParams{Now: now, ID: transfer.ID}); err != nil {
			return nil, err
		}
		if err := t.q.InsertPaymentRefund(t.ctx, sqlcgen.InsertPaymentRefundParams{
			ID: derivedID(transfer.ID.String(), "refund"), ClubID: t.club, SessionID: t.sess.ID, SessionPlayerID: sender.ID,
			Reason: sqlcgen.PaymentRefundReasonTransferRejected, SlotTransferID: transfer.ID, AmountMinor: int32(amount), RefundedAt: now,
		}); err != nil {
			return nil, err
		}
		if err := t.q.ReleaseSessionPlayerRefunded(t.ctx, sqlcgen.ReleaseSessionPlayerRefundedParams{Now: now, ID: sender.ID}); err != nil {
			return nil, err
		}
		if err := t.q.CloseEntryDropOutNotices(t.ctx, sqlcgen.CloseEntryDropOutNoticesParams{Now: now, SessionPlayerID: sender.ID}); err != nil {
			return nil, err
		}
		live, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		capacity, err := t.capacityOf()
		if err != nil {
			return nil, err
		}
		rows, err := t.q.ListQueueWaitlist(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		ordered := signedin.OrderedWaitlist(rows)
		var promoted *string
		if i := slotledger.FirstEligible(ordered, capacity-int64(live), func(w sqlcgen.ListQueueWaitlistRow) bool { return w.SkillLevelID.Valid }); i >= 0 {
			w := ordered[i]
			entry, err := t.promoteWaiter(waiter{ID: w.ID, ClubPlayerID: w.ClubPlayerID, SkillLevelID: w.SkillLevelID}, derivedID(transfer.ID.String(), "promote").String(), false)
			if err != nil {
				return nil, err
			}
			promoted = &entry.NameSnapshot
		}
		touched, err := t.touch()
		if err != nil {
			return nil, err
		}
		if _, err := t.recomputeMinimum(touched); err != nil {
			return nil, err
		}
		return transferAnswer{transfer.ID.String(), slotledger.TransferRefundToast(sender.NameSnapshot, amount, promoted)}, nil
	})
}
