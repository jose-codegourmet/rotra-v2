package publicreads

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"

	"github.com/jackc/pgx/v5"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/collate"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessioncost"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/slotmoney"
)

// GET /api/public-sessions/{slug}/payment-status: the Share payment status page (#1010; owner decision 2026-11-22, #1015). A port of
// readPublicPaymentStatus in packages/db/src/queue/financials.ts: amounts per confirmed roster person with the name masked here, so a
// full name never leaves the server. Roster only (no waitlist, no no-shows); no contacts, ids, times or costs. A cancelled or invalid
// session reads `paymentStatus: null`; an unknown slug or a removed page is not found. A free player (D-2026-11-27-01) owes nothing, so
// the share leaves them out. The answer is not shared between visitors: it is built for each read.

type paymentStatusRow struct {
	Name          string `json:"name"`
	ReceivedMinor *int64 `json:"receivedMinor"`
	WaivedMinor   int64  `json:"waivedMinor"`
	ViaTransfer   bool   `json:"viaTransfer"`
}

type paymentStatusDTO struct {
	AmountDue *int64             `json:"amountDue"`
	Rows      []paymentStatusRow `json:"rows"`
}

func (p *publicSessions) paymentStatus(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if !validSlug(slug) {
		notFound(w)
		return
	}
	var out *paymentStatusDTO
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
		var err error
		out, err = buildPaymentStatus(r.Context(), q, slug)
		return err
	})
	switch {
	case err == nil:
		body, mErr := json.Marshal(struct {
			PaymentStatus *paymentStatusDTO `json:"paymentStatus"`
		}{out})
		if mErr != nil {
			failRead(w, r, p.log, "payment status encode failed", mErr)
			return
		}
		h := w.Header()
		h.Set("Cache-Control", "public, max-age=0, must-revalidate")
		h.Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(body)
	case errors.Is(err, errPageNotFound):
		notFound(w)
	case r.Context().Err() != nil:
		// the client left; there is nobody to answer
	default:
		failRead(w, r, p.log, "payment status read failed", err)
	}
}

func buildPaymentStatus(ctx context.Context, q *sqlcgen.Queries, slug string) (*paymentStatusDTO, error) {
	s, err := q.GetPublicSessionBySlug(ctx, slug)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && s.PublicationDeleted {
		return nil, errPageNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("reading session: %w", err)
	}
	if s.State == sqlcgen.QueueSessionStateInvalid || s.State == sqlcgen.QueueSessionStateCancelled {
		return nil, nil
	}
	roster, err := q.ListPaymentStatusRoster(ctx, s.ID)
	if err != nil {
		return nil, fmt.Errorf("listing roster: %w", err)
	}
	courts, err := q.ListPublicSessionCourts(ctx, s.ID)
	if err != nil {
		return nil, fmt.Errorf("listing courts: %w", err)
	}
	est, err := publicEstimate(ctx, q, s, len(courts), len(roster))
	if err != nil {
		return nil, err
	}
	amountDue := sessioncost.AmountDue(est)
	// #1013: a transferred slot's carried cash counts for its holder once; waivers are never cash.
	ledger, err := slotmoney.Load(ctx, q, s.ID)
	if err != nil {
		return nil, fmt.Errorf("reading the slot ledger: %w", err)
	}
	rows := []paymentStatusRow{}
	for _, e := range roster {
		pay := ledger.PaymentOf(e.ID, amountDue)
		if e.IsFree && pay.Mark == nil {
			continue
		}
		row := paymentStatusRow{Name: maskPublicName(e.NameSnapshot), ViaTransfer: len(pay.Chain) > 0}
		if pay.Mark != nil {
			// A legacy mark with no amount counts as paid in full at today's amount due (#479).
			v := pay.Received(amountDue)
			row.ReceivedMinor, row.WaivedMinor = &v, pay.Mark.Waived
		}
		rows = append(rows, row)
	}
	sort.SliceStable(rows, func(i, j int) bool { return collate.Compare(rows[i].Name, rows[j].Name) < 0 })
	return &paymentStatusDTO{AmountDue: amountDue, Rows: rows}, nil
}
