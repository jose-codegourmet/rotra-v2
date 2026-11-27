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
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessioncost"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/slotledger"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/slotmoney"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the payment writes (Q-MONEY): apps/queue/src/app/api/sessions/{id}/payments/**, setPaymentMarks, setPaymentAmount and
// markAllPaid of packages/db/src/queue/financials.ts. GET .../payments is a signed-in read. A payment mark is never updated (a database
// trigger refuses it): a new amount deletes the mark and inserts another. Payments do not change the session revision.
//
// The ids of the body are checked with a strict pattern before anything is read (a bad operationId is invalid, a bad clubPlayerId not
// found, even for a session that does not exist). The amount due is the estimate's per-head fee, worked out after the session is locked;
// it is nil when no estimate is saved (no fee set).

func (s *server) registerPayments(rt *signedin.Router) {
	club := store.AudienceClub
	rt.Handle("POST /api/sessions/{sessionId}/payments", club, s.club(s.setPaymentMarks))
	rt.Handle("POST /api/sessions/{sessionId}/payments/amount", club, s.club(s.setPaymentAmount))
	rt.Handle("POST /api/sessions/{sessionId}/payments/mark-all", club, s.club(s.markAllPaid))
	rt.Handle("POST /api/sessions/{sessionId}/payments/free", club, s.club(s.setPlayerFree))
	rt.Handle("POST /api/sessions/{sessionId}/payments/refunds", club, s.club(s.recordSessionRefund))
}

// noFeeTick is what a paid tick with no fee set is refused with (#245): it is not recorded as a null or zero amount.
const noFeeTick = "Paid ticks with no fee set aren’t connected to saved data yet."

// paymentOpen is requirePaymentsOpen: payments are open in prepared, active and completed sessions; never invalid, mid-finalization or
// cancelled (a cancelled session keeps its marks, read-only).
func (t *txn) paymentOpen() error {
	switch t.sess.State {
	case sqlcgen.QueueSessionStateInvalid, sqlcgen.QueueSessionStateFinalizing, sqlcgen.QueueSessionStateCancelled:
		return writes.Fail(httpapi.ErrInvalid, map[string]string{"state": "Payments are not available for this session."})
	}
	return nil
}

// amountDue is amountDuePerHead of the session's estimate: nil with no estimate saved.
func (t *txn) amountDue() (*int64, error) {
	est, err := t.costFor()
	if err != nil {
		return nil, err
	}
	return sessioncost.AmountDue(est), nil
}

// moneyOf is toMoney of a mark's amount: null stays null, never 0.
func moneyOf(amount pgtype.Int4, currency string) *httpapi.Money {
	if !amount.Valid {
		return nil
	}
	return &httpapi.Money{AmountMinor: int64(amount.Int32), Currency: currency}
}

// paidResult is what one mark answers: whether the player is paid and the amount received.
type paidResult struct {
	Paid   bool           `json:"paid"`
	Amount *httpapi.Money `json:"amount"`
}

// moneyEntry is the roster entry a payment is for.
type moneyEntry = sqlcgen.GetMoneySessionPlayerRow

func offRoster(e moneyEntry) bool { return e.ReleasedAt.Valid || e.NoShowAt.Valid }

// applyMark is applyMark: one tick or untick inside the transaction. A tick records the amount due now as the amount received, under
// the operation id; a mark that exists is answered as it is (so a duplicate applies once, and a later fee change never rewrites it).
// Unticking deletes the mark. Checks run in this order: a refunded entry, a slot that came by transfer (#1013) or whose mark is frozen
// into one, the mark that exists, the player off the roster, no fee set.
func (t *txn) applyMark(entry moneyEntry, operation pgtype.UUID, paid bool, amount *int64) (paidResult, error) {
	mark, err := t.q.GetPaymentMark(t.ctx, sqlcgen.GetPaymentMarkParams{SessionID: entry.SessionID, SessionPlayerID: entry.ID})
	has := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return paidResult{}, err
	}
	// #1013: a slot paid through a transfer is already Paid (a tick is a no-op, never a second payment); unticking it, or a mark frozen
	// into a transfer, is refused. #1014: a refunded entry's payment is history (its marks are frozen): never changed or re-paid.
	ledger, err := slotmoney.Load(t.ctx, t.q, entry.SessionID)
	if err != nil {
		return paidResult{}, err
	}
	if ledger.IsRefunded(entry.ID) {
		return paidResult{}, writes.Fail(httpapi.ErrConflict, map[string]string{"payment": slotledger.PaymentRefundedLocked})
	}
	if ledger.IsLocked(entry.ID) {
		if paid && ledger.IsCarried(entry.ID) {
			if has {
				return paidResult{Paid: true, Amount: moneyOf(mark.AmountMinor, mark.Currency)}, nil
			}
			return paidResult{Paid: true}, nil
		}
		return paidResult{}, writes.Fail(httpapi.ErrConflict, map[string]string{"payment": slotledger.TransferPaymentLocked})
	}
	if !paid {
		if has {
			if err := t.q.DeletePaymentMark(t.ctx, sqlcgen.DeletePaymentMarkParams{SessionID: entry.SessionID, SessionPlayerID: entry.ID}); err != nil {
				return paidResult{}, err
			}
		}
		return paidResult{}, nil
	}
	if has {
		return paidResult{Paid: true, Amount: moneyOf(mark.AmountMinor, mark.Currency)}, nil
	}
	if offRoster(entry) {
		return paidResult{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"player": "Player not in this session."})
	}
	if amount == nil {
		return paidResult{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"fee": noFeeTick})
	}
	return t.insertMark(entry, operation, *amount)
}

// insertMark creates a mark. An amount beyond an Int column is refused by Prisma (a 500).
func (t *txn) insertMark(entry moneyEntry, operation pgtype.UUID, amount int64) (paidResult, error) {
	if beyondInt32(float64(amount)) {
		return paidResult{}, errTypeError
	}
	if err := t.q.InsertPaymentMark(t.ctx, sqlcgen.InsertPaymentMarkParams{
		SessionID: entry.SessionID, SessionPlayerID: entry.ID, ClubID: t.club, AmountMinor: pgtype.Int4{Int32: int32(amount), Valid: true},
		MarkedAt: t.stamp(), SourceOperationID: operation,
	}); err != nil {
		return paidResult{}, err
	}
	// D-2026-11-27-01: recording cash for a free player makes them a payer again.
	if entry.IsFree {
		if err := t.q.SetSessionPlayerFree(t.ctx, sqlcgen.SetSessionPlayerFreeParams{Free: false, Now: t.stamp(), ID: entry.ID}); err != nil {
			return paidResult{}, err
		}
	}
	return paidResult{Paid: true, Amount: &httpapi.Money{AmountMinor: amount, Currency: "PHP"}}, nil
}

// entryOf is the roster entry of a club player in the session; another club's entry and no entry are not found.
func (t *txn) entryOf(clubPlayer pgtype.UUID) (moneyEntry, error) {
	entry, err := t.q.GetMoneySessionPlayer(t.ctx, sqlcgen.GetMoneySessionPlayerParams{SessionID: t.sess.ID, ClubPlayerID: clubPlayer})
	if errors.Is(err, pgx.ErrNoRows) || err == nil && entry.ClubID != t.club {
		return entry, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return entry, err
}

// markResult is one entry of the batch's answer.
type markResult struct {
	ClubPlayerID string         `json:"clubPlayerId"`
	Paid         bool           `json:"paid"`
	Amount       *httpapi.Money `json:"amount"`
}

// setPaymentMarks is POST .../payments, setPaymentMarks: the desired end states of one batch (#300), keyed by club player and saved
// together or not at all. Each mark's operation id is derived from the batch's. A player named twice counts once, at the place of the
// first mention with the last paid value. The ids are text as sent: an upper-case spelling is another key and derives another id.
func (s *server) setPaymentMarks(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	list, ok := body["marks"].([]any)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	operation := body.Text("operationId")
	if !hyphenatedUUID.MatchString(operation) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	var order []string
	wanted := map[string]bool{}
	for _, raw := range list {
		mark, _ := raw.(map[string]any) // null, a number, text or a list have no such fields: text() is "" and paid is undefined
		player := writes.Body(mark).Text("clubPlayerId")
		if !hyphenatedUUID.MatchString(player) {
			return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
		}
		paid, isBool := mark["paid"].(bool)
		if !isBool {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
		}
		if _, seen := wanted[player]; !seen {
			order = append(order, player)
		}
		wanted[player] = paid
	}
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := t.paymentOpen(); err != nil {
			return nil, err
		}
		amount, err := t.amountDue()
		if err != nil {
			return nil, err
		}
		marks := make([]markResult, 0, len(order))
		for _, player := range order {
			id, _ := writes.ParseUUID(player)
			entry, err := t.entryOf(id)
			if err != nil {
				return nil, err
			}
			res, err := t.applyMark(entry, derivedID(operation, player), wanted[player], amount)
			if err != nil {
				return nil, err
			}
			marks = append(marks, markResult{ClubPlayerID: player, Paid: res.Paid, Amount: res.Amount})
		}
		return struct {
			Count int          `json:"count"`
			Marks []markResult `json:"marks"`
		}{len(order), marks}, nil
	})
	return writes.Result{Body: out}, err
}

// setPaymentAmount is POST .../payments/amount, setPaymentAmount (#479): the amount received from one roster entry, in whole centavos,
// zero or more. A positive amount replaces the mark (amount, time and operation id); zero removes it (not paid). A retry of the same
// operation answers the saved mark unchanged, before anything else is looked at. Unlike a quick tick, an explicit amount is accepted with
// no fee set.
func (s *server) setPaymentAmount(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	operation, player, amount := body.Text("operationId"), body.Text("clubPlayerId"), body.Number("amountMinor")
	if !hyphenatedUUID.MatchString(operation) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	if !hyphenatedUUID.MatchString(player) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if !safeInteger(amount) || amount < 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"amount": "Enter an amount of zero or more."})
	}
	operationID, _ := writes.ParseUUID(operation)
	playerID, _ := writes.ParseUUID(player)
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := t.paymentOpen(); err != nil {
			return nil, err
		}
		entry, err := t.entryOf(playerID)
		if err != nil {
			return nil, err
		}
		mark, err := t.q.GetPaymentMark(t.ctx, sqlcgen.GetPaymentMarkParams{SessionID: entry.SessionID, SessionPlayerID: entry.ID})
		has := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		// The operation is compared as text: the stored id is lower case, so an upper-case retry is not the same operation.
		if has && mark.SourceOperationID.String() == operation {
			return paidResult{Paid: true, Amount: moneyOf(mark.AmountMinor, mark.Currency)}, nil
		}
		if offRoster(entry) {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"player": "Player not in this session."})
		}
		if locked, err := t.paymentLockError(entry); err != nil {
			return nil, err
		} else if locked != "" {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"payment": locked})
		}
		if has {
			if err := t.q.DeletePaymentMark(t.ctx, sqlcgen.DeletePaymentMarkParams{SessionID: entry.SessionID, SessionPlayerID: entry.ID}); err != nil {
				return nil, err
			}
		}
		if amount == 0 {
			return paidResult{}, nil
		}
		return t.insertMark(entry, operationID, int64(amount))
	})
	return writes.Result{Body: out}, err
}

// markAllPaid is POST .../payments/mark-all, markAllPaid: ticks every live unpaid roster entry at the current amount, once. It is refused
// with no fee set while any entry is unpaid (#245). The operation id of each mark is derived from the roster entry's id.
func (s *server) markAllPaid(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	operation := body.Text("operationId")
	if !hyphenatedUUID.MatchString(operation) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := t.paymentOpen(); err != nil {
			return nil, err
		}
		roster, err := t.q.ListMoneyLiveRoster(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		amount, err := t.amountDue()
		if err != nil {
			return nil, err
		}
		ledger, err := slotmoney.Load(t.ctx, t.q, t.sess.ID)
		if err != nil {
			return nil, err
		}
		count := 0
		for _, e := range roster {
			_, err := t.q.GetPaymentMark(t.ctx, sqlcgen.GetPaymentMarkParams{SessionID: t.sess.ID, SessionPlayerID: e.ID})
			if err == nil {
				continue
			}
			if !errors.Is(err, pgx.ErrNoRows) {
				return nil, err
			}
			// #1013: a slot paid through a transfer is already Paid; never a second payment. D-2026-11-27-01: a free player owes nothing.
			if ledger.IsLocked(e.ID) || e.IsFree {
				continue
			}
			entry := moneyEntry(e)
			if _, err := t.applyMark(entry, derivedID(operation, e.ID.String()), true, amount); err != nil {
				return nil, err
			}
			count++
		}
		return struct {
			Count int `json:"count"`
		}{count}, nil
	})
	return writes.Result{Body: out}, err
}

// paymentLockError is paymentLockError: the entry's payment is part of a slot transfer's history (see slotmoney), or it was refunded
// (#1014). It answers the refusal to send, or "".
func (t *txn) paymentLockError(entry moneyEntry) (string, error) {
	ledger, err := slotmoney.Load(t.ctx, t.q, entry.SessionID)
	if err != nil {
		return "", err
	}
	switch {
	case ledger.IsRefunded(entry.ID):
		return slotledger.PaymentRefundedLocked, nil
	case ledger.IsLocked(entry.ID):
		return slotledger.TransferPaymentLocked, nil
	}
	return "", nil
}

// setPlayerFree is POST .../payments/free, setPlayerFree (D-2026-11-27-01): plays free on one roster entry, keyed by club player. A free
// entry owes nothing and leaves the break-even head count. Payments are a guide only, so setting a paid entry free deletes its own
// payment mark (nothing to reimburse). Refused for a slot paid through a slot transfer or refunded: that payment is history. Setting the
// current value is a no-op.
func (s *server) setPlayerFree(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	operation, player := body.Text("operationId"), body.Text("clubPlayerId")
	if !hyphenatedUUID.MatchString(operation) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	if !hyphenatedUUID.MatchString(player) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	free, isBool := body.Bool("free")
	if !isBool {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	playerID, _ := writes.ParseUUID(player)
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := t.paymentOpen(); err != nil {
			return nil, err
		}
		entry, err := t.entryOf(playerID)
		if err != nil {
			return nil, err
		}
		if offRoster(entry) {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"player": "Player not in this session."})
		}
		type result struct {
			Free    bool `json:"free"`
			Cleared bool `json:"cleared"`
		}
		if free == entry.IsFree {
			return result{entry.IsFree, false}, nil
		}
		cleared := false
		if free {
			locked, err := t.paymentLockError(entry)
			if err != nil {
				return nil, err
			}
			if locked != "" {
				return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"payment": slotledger.FreePaymentLocked})
			}
			n, err := t.q.DeletePaymentMarksOfEntry(t.ctx, sqlcgen.DeletePaymentMarksOfEntryParams{SessionID: t.sess.ID, SessionPlayerID: entry.ID})
			if err != nil {
				return nil, err
			}
			cleared = n > 0
		}
		if err := t.q.SetSessionPlayerFree(t.ctx, sqlcgen.SetSessionPlayerFreeParams{Free: free, Now: t.stamp(), ID: entry.ID}); err != nil {
			return nil, err
		}
		return result{free, cleared}, nil
	})
	return writes.Result{Body: out}, err
}

// recordSessionRefund is POST .../payments/refunds, recordSessionRefund (#1014): one append-only manual full refund per player of a
// cancelled session. ROTRA moves no money: the row records that the Queue Master handed the player's whole cash back outside ROTRA
// (own cash plus cash carried in by transfers; never a waiver). A retry, or a second tap, answers the refund already recorded. Refused
// unless the session is cancelled, when there is no cash to refund, and when the amount differs from the one the Queue Master was shown.
func (s *server) recordSessionRefund(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	// The ids are read as they are sent: a value that is no text is not found, and an amount that is no whole number of centavos is invalid.
	text, isText := body["sessionPlayerId"].(string)
	if !isText || !hyphenatedUUID.MatchString(text) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	_, isNumber := body["expectedAmountMinor"].(json.Number)
	var want float64
	if isNumber {
		want = body.Number("expectedAmountMinor")
	}
	if !isNumber || !safeInteger(want) || want < 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"expectedAmountMinor": "Enter the refund in centavos."})
	}
	playerID, _ := writes.ParseUUID(text)
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if t.sess.State != sqlcgen.QueueSessionStateCancelled {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"refund": slotledger.RefundNotCancelled})
		}
		entry, err := t.q.GetSessionPlayerForTransfer(t.ctx, playerID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return nil, err
		}
		if entry.SessionID != t.sess.ID || entry.ClubID != t.club {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		type result struct {
			Message string `json:"message"`
		}
		ledger, err := slotmoney.Load(t.ctx, t.q, t.sess.ID)
		if err != nil {
			return nil, err
		}
		if done, ok := ledger.RefundOf(entry.ID); ok {
			return result{slotledger.SessionRefundToast(entry.NameSnapshot, done.Amount)}, nil
		}
		// The cancelled roster is the list (released entries and no-shows are not on it).
		if entry.ReleasedAt.Valid || entry.NoShowAt.Valid {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"player": "Player not in this session."})
		}
		due, err := t.amountDue()
		if err != nil {
			return nil, err
		}
		amount := slotledger.FullRefund(ledger.PaymentOf(entry.ID, due).Received(due))
		if amount <= 0 {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"refund": slotledger.RefundNothingToRefund})
		}
		if int64(want) != amount {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"refund": slotledger.RefundChanged(amount)})
		}
		if err := t.q.InsertPaymentRefund(t.ctx, sqlcgen.InsertPaymentRefundParams{
			ID: derivedID(entry.ID.String(), "refund"), ClubID: t.club, SessionID: t.sess.ID, SessionPlayerID: entry.ID, Reason: sqlcgen.PaymentRefundReasonSessionCancelled,
			AmountMinor: int32(amount), RefundedAt: t.stamp(),
		}); err != nil {
			return nil, err
		}
		return result{slotledger.SessionRefundToast(entry.NameSnapshot, amount)}, nil
	})
	return writes.Result{Body: out}, err
}
