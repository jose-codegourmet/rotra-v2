package signedin

import (
	"context"
	"errors"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/slotledger"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/slotmoney"
)

// The pending slot transfers of the Requests read (#1011): a port of pendingSlotTransferViews in packages/db/src/queue/slot-transfers.ts.

// transferPaymentDTO is TransferPaymentSnapshot: what Approve would record now, shown before approving (#1013).
type transferPaymentDTO struct {
	AmountDue   *int64 `json:"amountDueMinor"`
	Paid        int64  `json:"paidMinor"`
	PriorWaived int64  `json:"priorWaivedMinor"`
	Waived      int64  `json:"waivedMinor"`
}

// slotTransferView is the SlotTransferView of a pending transfer.
type slotTransferView struct {
	ID                     string             `json:"id"`
	SessionID              string             `json:"sessionId"`
	Pid                    string             `json:"pid"`
	SenderName             string             `json:"senderName"`
	SenderNickname         *string            `json:"senderNickname"`
	RecipientPlayerID      string             `json:"recipientPlayerId"`
	RecipientName          string             `json:"recipientName"`
	RecipientRtrID         string             `json:"recipientRtrId"`
	RecipientWaitlistPlace *int               `json:"recipientWaitlistPosition"`
	SuggestedLevel         *string            `json:"suggestedLevel"`
	ViaLink                bool               `json:"viaLink"`
	Payment                transferPaymentDTO `json:"payment"`
	At                     string             `json:"at"`
}

// pendingSlotTransferViews lists the pending transfers a Queue Master can decide, oldest first, in the SlotTransferView shape. Empty
// once the session left Prepared (Start expired them).
func (s *server) pendingSlotTransferViews(ctx context.Context, q *sqlcgen.Queries, sess sqlcgen.ListQueueSessionsRow) ([]slotTransferView, error) {
	out := []slotTransferView{}
	if sess.State != sqlcgen.QueueSessionStatePrepared {
		return out, nil
	}
	rows, err := q.ListPendingTransferViews(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return out, nil
	}
	// #1013: what Approve would record now, shown before approving (the same rule as the approval).
	est, err := s.estimateForCtx(ctx, q, sess.ClubID, sess)
	if err != nil {
		return nil, err
	}
	var amountDue *int64
	if est.Estimate != nil {
		v := est.Estimate.PerHead
		amountDue = &v
	}
	ledger, err := slotmoney.Load(ctx, q, sess.ID)
	if err != nil {
		return nil, err
	}
	waitRows, err := q.ListQueueWaitlist(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	waitlist := orderedQueueWaitlist(waitRows)
	for _, t := range rows {
		saved, err := q.ListClubPlayerIDsOfPlayer(ctx, sqlcgen.ListClubPlayerIDsOfPlayerParams{ClubID: sess.ClubID, PlayerID: t.RecipientID})
		if err != nil {
			return nil, err
		}
		index := slices.IndexFunc(waitlist, func(w sqlcgen.ListQueueWaitlistRow) bool { return slices.Contains(saved, w.ClubPlayerID) })
		var place *int
		var level pgtype.Int2
		if index >= 0 {
			n := index + 1
			place, level = &n, waitlist[index].SkillLevelID
		} else {
			l, err := q.GetSavedPlayerLatestLevel(ctx, sqlcgen.GetSavedPlayerLatestLevelParams{ClubID: sess.ClubID, PlayerID: t.RecipientID})
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return nil, err
			}
			if err == nil {
				level = pgtype.Int2{Int16: l, Valid: true}
			}
		}
		snap := slotledger.SnapshotOf(amountDue, slotledger.HoldingOf(ledger.PaymentOf(t.SenderSessionPlayerID, amountDue), amountDue))
		rtr := ""
		if t.RecipientRtrID.Valid {
			rtr = t.RecipientRtrID.String
		}
		var nick *string
		if t.SenderNickname.Valid {
			nick = &t.SenderNickname.String
		}
		out = append(out, slotTransferView{
			ID: t.ID.String(), SessionID: sess.ID.String(), Pid: t.SenderSessionPlayerID.String(), SenderName: t.SenderName, SenderNickname: nick,
			RecipientPlayerID: t.RecipientID.String(), RecipientName: t.RecipientName, RecipientRtrID: rtr, RecipientWaitlistPlace: place,
			SuggestedLevel: levelOf(level), ViaLink: t.ViaLink,
			Payment: transferPaymentDTO{AmountDue: snap.AmountDue, Paid: snap.Paid, PriorWaived: snap.PriorWaived, Waived: snap.Waived},
			At:      httpapi.ToIso(t.RequestedAt.Time),
		})
	}
	return out, nil
}
