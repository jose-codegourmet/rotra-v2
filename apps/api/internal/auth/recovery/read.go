package recovery

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

const (
	pageSize = 25
	maxPage  = 100000
)

// Row is one request in the Admin list, as readPasswordResetRequests shapes it. No token, digest or provider
// detail is in it.
type Row struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	Status      string  `json:"status"`
	RequestedAt string  `json:"requestedAt"`
	ReviewedAt  *string `json:"reviewedAt"`
	ReviewedBy  *string `json:"reviewedBy"`
	PlayerID    *string `json:"playerId"`
	PlayerName  *string `json:"playerName"`
	RTRID       *string `json:"rtrId"`
	CanIssue    bool    `json:"canIssue"`
}

// Page is one page of the Admin list.
type Page struct {
	Total int   `json:"total"`
	Page  int   `json:"page"`
	Rows  []Row `json:"rows"`
}

// ReadRequests lists the requests, newest first, 25 to a page (readPasswordResetRequests). The caller has
// already established that the caller is an Admin. A page outside 1..100000 is `invalid`.
func (r *Recovery) ReadRequests(ctx context.Context, page int) (Page, error) {
	if page < 1 || page > maxPage {
		return Page{}, refuse(httpapi.ErrInvalid, "", "")
	}
	out := Page{Page: page, Rows: []Row{}}
	// One snapshot, so the total and the rows agree.
	err := readTx(ctx, r.pool, func(q *sqlcgen.Queries) error {
		total, err := q.CountResetRequests(ctx)
		if err != nil {
			return err
		}
		out.Total = int(total)
		rows, err := q.ListResetRequests(ctx, int32((page-1)*pageSize))
		if err != nil {
			return err
		}
		for _, x := range rows {
			a := accountFrom(x.ContactEmail, x.AuthProvider, x.AuthSubject, x.AccountDisabledAt, x.ContactSyncStatus, x.IdentityUsable)
			row := Row{
				ID: uuidOf(x.ID).String(), Email: x.Email, Status: string(x.Status),
				RequestedAt: httpapi.ToIso(x.RequestedAt.Time), CanIssue: a.eligible(x.Email),
			}
			if x.ReviewedAt.Valid {
				s := httpapi.ToIso(x.ReviewedAt.Time)
				row.ReviewedAt = &s
			}
			if x.ReviewedByName.Valid {
				row.ReviewedBy = &x.ReviewedByName.String
			}
			if x.PlayerID.Valid {
				s := uuidOf(x.PlayerID).String()
				row.PlayerID = &s
			}
			if x.PlayerName.Valid {
				row.PlayerName = &x.PlayerName.String
			}
			if x.RtrID.Valid {
				row.RTRID = &x.RtrID.String
			}
			out.Rows = append(out.Rows, row)
		}
		return nil
	})
	if err != nil {
		return Page{}, fmt.Errorf("recovery: reading the reset requests: %w", err)
	}
	return out, nil
}

// readTx runs fn on one repeatable-read, read-only snapshot.
func readTx(ctx context.Context, pool interface {
	BeginTx(context.Context, pgx.TxOptions) (pgx.Tx, error)
}, fn func(*sqlcgen.Queries) error) (err error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return err
	}
	defer func() {
		if rbErr := tx.Rollback(context.WithoutCancel(ctx)); rbErr != nil && err == nil && rbErr != pgx.ErrTxClosed {
			err = rbErr
		}
	}()
	return fn(sqlcgen.New(tx))
}
