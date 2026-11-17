package recovery_test

import (
	"errors"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

func TestNewNeedsItsParts(t *testing.T) {
	e := newEnv(t)
	for name, d := range map[string]recovery.Deps{
		"no pool":    {Service: e.svc, Store: e.st},
		"no service": {Pool: e.pool, Store: e.st},
		"no store":   {Pool: e.pool, Service: e.svc},
	} {
		if _, err := recovery.New(d); err == nil {
			t.Errorf("%s: no error", name)
		}
	}
	// A nil clock and logger are fine.
	if _, err := recovery.New(recovery.Deps{Pool: e.pool, Service: e.svc, Store: e.st}); err != nil {
		t.Fatal(err)
	}
}

func TestErrorText(t *testing.T) {
	cause := errors.New("boom")
	if got := (&recovery.Error{Code: httpapi.ErrUnavailable, Err: cause}).Error(); got != "recovery: unavailable: boom" {
		t.Fatal(got)
	}
	if got := (&recovery.Error{Code: httpapi.ErrConflict}).Error(); got != "recovery: conflict" {
		t.Fatal(got)
	}
}
