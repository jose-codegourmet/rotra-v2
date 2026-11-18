package claim

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// "Someone else got there first" database errors map to the TypeScript's refusals by constraint name; nothing
// else is hidden as a problem.
func TestAsProblem(t *testing.T) {
	pg := func(code, constraint string) error {
		return fmt.Errorf("wrapped: %w", &pgconn.PgError{Code: code, ConstraintName: constraint})
	}
	for name, c := range map[string]struct {
		err    error
		code   httpapi.ErrorCode
		field  string
		nilErr bool
	}{
		"login key":          {err: fmt.Errorf("x: %w", store.ErrLoginKeyTaken), code: httpapi.ErrConflict, field: "email"},
		"phone":              {err: pg("23505", "player_private_contacts_phone_e164_key"), code: httpapi.ErrConflict, field: "phone"},
		"email":              {err: pg("23505", "player_private_contacts_email_key"), code: httpapi.ErrConflict, field: "email"},
		"email check":        {err: pg("23514", "player_private_contacts_email_check"), code: httpapi.ErrInvalid, field: "email"},
		"another unique key": {err: pg("23505", "something_else"), code: httpapi.ErrConflict},
		"deadlock":           {err: pg("40P01", ""), code: httpapi.ErrConflict},
		"serialization":      {err: pg("40001", ""), code: httpapi.ErrConflict},
		"other pg error":     {err: pg("23503", "fk"), nilErr: true},
		"not a pg error":     {err: errors.New("boom"), nilErr: true},
		"nil":                {err: nil, nilErr: true},
	} {
		p := asProblem(c.err)
		if c.nilErr {
			if p != nil {
				t.Errorf("%s: %+v", name, p)
			}
			continue
		}
		if p == nil || p.code != c.code {
			t.Errorf("%s: %+v", name, p)
			continue
		}
		if c.field == "" && p.fields != nil || c.field != "" && p.fields[c.field] == "" {
			t.Errorf("%s: fields %v", name, p.fields)
		}
	}
}
