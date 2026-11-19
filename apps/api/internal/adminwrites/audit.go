package adminwrites

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// auditEvent is one platform-owner audit event (admin/audit.ts recordAudit). Metadata carries redacted before and
// after values only: never passwords, tokens or contact values.
type auditEvent struct {
	Action, TargetType, TargetID string
	// SourceCommandID makes the event repeat-safe: a command that already recorded one records nothing again.
	SourceCommandID pgtype.UUID
	// Metadata is a JSON value, or nil for none.
	Metadata any
}

// recordAudit appends the event in the caller's transaction. With a source command whose event exists it appends
// nothing. The actor is the admin who acted; the time is the application clock, like the TypeScript's.
func (s *server) recordAudit(ctx context.Context, q *sqlcgen.Queries, actor uuid.UUID, ev auditEvent) error {
	_, err := s.recordAuditEvent(ctx, q, actor, ev)
	return err
}

// recordAuditEvent is recordAudit that also returns the ID of the event: the one it appended, or, for a source
// command whose event exists, that event's (recordAudit returns the existing event in the TypeScript too).
func (s *server) recordAuditEvent(ctx context.Context, q *sqlcgen.Queries, actor uuid.UUID, ev auditEvent) (uuid.UUID, error) {
	if ev.SourceCommandID.Valid {
		existing, err := q.GetAdminAuditEventByCommand(ctx, ev.SourceCommandID)
		if err == nil {
			return uuid.UUID(existing.ID.Bytes), nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, err
		}
	}
	var metadata []byte
	if ev.Metadata != nil {
		var err error
		if metadata, err = json.Marshal(ev.Metadata); err != nil {
			return uuid.Nil, fmt.Errorf("encoding audit metadata: %w", err)
		}
	}
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.Nil, err
	}
	err = q.InsertAdminAuditEvent(ctx, sqlcgen.InsertAdminAuditEventParams{
		ID: pgtype.UUID{Bytes: id, Valid: true}, ActorAdminID: pgtype.UUID{Bytes: actor, Valid: true},
		Action: ev.Action, TargetType: ev.TargetType, TargetID: ev.TargetID,
		SourceCommandID: ev.SourceCommandID, Metadata: metadata, OccurredAt: s.stamp(),
	})
	return id, err
}
