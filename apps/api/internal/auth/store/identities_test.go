package store_test

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestInsertAndGetIdentity(t *testing.T) {
	e := newEnv(t)
	got := e.identity(t, store.AudienceClub, "smash-club")
	if got.ID == uuid.Nil || got.ID.Version() != 7 {
		t.Fatalf("id = %v, want a generated UUIDv7", got.ID)
	}
	if got.Audience != store.AudienceClub || got.LoginKey != "smash-club" || got.PasswordHash != fakeHash ||
		got.PasswordScheme != store.SchemeArgon2id || got.Revision != 1 || got.DisabledAt != nil {
		t.Fatalf("unexpected identity: %+v", got)
	}
	for name, ts := range map[string]time.Time{"password_changed_at": got.PasswordChangedAt, "created_at": got.CreatedAt, "updated_at": got.UpdatedAt} {
		if !sameTime(ts, base) {
			t.Fatalf("%s = %v, want %v", name, ts, base)
		}
	}
	byLogin, err := e.s.GetIdentityByLogin(e.ctx, store.AudienceClub, "smash-club")
	if err != nil || byLogin.ID != got.ID {
		t.Fatalf("by login: %v %+v", err, byLogin)
	}
	byID, err := e.s.GetIdentityByID(e.ctx, got.ID)
	if err != nil || byID.LoginKey != "smash-club" {
		t.Fatalf("by id: %v %+v", err, byID)
	}
}

func TestInsertIdentityKeepsAGivenID(t *testing.T) {
	e := newEnv(t)
	want := uuid.New()
	got, err := e.s.InsertIdentity(e.ctx, store.NewIdentity{ID: want, Audience: store.AudiencePlayer, LoginKey: "a@example.test",
		PasswordHash: fakeHash, PasswordScheme: store.SchemeBcrypt, Now: base})
	if err != nil || got.ID != want || got.PasswordScheme != store.SchemeBcrypt {
		t.Fatalf("got %+v err %v", got, err)
	}
}

func TestGetIdentityNotFound(t *testing.T) {
	e := newEnv(t)
	if _, err := e.s.GetIdentityByLogin(e.ctx, store.AudienceClub, "nobody"); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("by login: %v", err)
	}
	if _, err := e.s.GetIdentityByID(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("by id: %v", err)
	}
}

func TestLoginKeyIsUniquePerAudience(t *testing.T) {
	e := newEnv(t)
	e.identity(t, store.AudiencePlayer, "same@example.test")
	_, err := e.s.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: "same@example.test",
		PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base})
	if !errors.Is(err, store.ErrLoginKeyTaken) {
		t.Fatalf("duplicate in one audience: %v, want ErrLoginKeyTaken", err)
	}
	// The same text in another audience is a different login.
	e.identity(t, store.AudienceAdmin, "same@example.test")
}

func TestInsertIdentityConstraintErrorsAreNotLoginKeyTaken(t *testing.T) {
	e := newEnv(t)
	for name, in := range map[string]store.NewIdentity{
		"bad scheme":         {Audience: store.AudienceClub, LoginKey: "a", PasswordHash: fakeHash, PasswordScheme: "md5", Now: base},
		"not normalized key": {Audience: store.AudienceClub, LoginKey: " Upper ", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base},
		"bad audience":       {Audience: "guest", LoginKey: "b", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base},
	} {
		_, err := e.s.InsertIdentity(e.ctx, in)
		if err == nil || errors.Is(err, store.ErrLoginKeyTaken) {
			t.Fatalf("%s: err = %v, want a constraint error", name, err)
		}
	}
}

func TestUpdatePassword(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudiencePlayer, "p@example.test")
	later := base.Add(time.Hour)
	if err := e.s.UpdatePassword(e.ctx, ident.ID, "fake-hash-two", store.SchemeArgon2id, later); err != nil {
		t.Fatal(err)
	}
	got, _ := e.s.GetIdentityByID(e.ctx, ident.ID)
	if got.PasswordHash != "fake-hash-two" || !sameTime(got.PasswordChangedAt, later) || !sameTime(got.UpdatedAt, later) || got.Revision != 2 {
		t.Fatalf("after update: %+v", got)
	}
	if err := e.s.UpdatePassword(e.ctx, uuid.New(), "x", store.SchemeArgon2id, later); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("missing identity: %v", err)
	}
	if err := e.s.UpdatePassword(e.ctx, ident.ID, "x", "plain", later); err == nil {
		t.Fatal("a scheme outside the CHECK must fail")
	}
}

func TestSetIdentityDisabled(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudienceAdmin, "root@example.test")
	at := base.Add(time.Minute)
	if err := e.s.SetIdentityDisabled(e.ctx, ident.ID, &at, at); err != nil {
		t.Fatal(err)
	}
	got, _ := e.s.GetIdentityByID(e.ctx, ident.ID)
	if got.DisabledAt == nil || !sameTime(*got.DisabledAt, at) || got.Revision != 2 || !sameTime(got.UpdatedAt, at) {
		t.Fatalf("disabled: %+v", got)
	}
	if err := e.s.SetIdentityDisabled(e.ctx, ident.ID, nil, at.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	got, _ = e.s.GetIdentityByID(e.ctx, ident.ID)
	if got.DisabledAt != nil || got.Revision != 3 {
		t.Fatalf("enabled again: %+v", got)
	}
	if err := e.s.SetIdentityDisabled(e.ctx, uuid.New(), &at, at); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("missing identity: %v", err)
	}
}

func TestChangeLoginKey(t *testing.T) {
	e := newEnv(t)
	a := e.identity(t, store.AudiencePlayer, "old@example.test")
	e.identity(t, store.AudiencePlayer, "taken@example.test")
	later := base.Add(time.Hour)
	if err := e.s.ChangeLoginKey(e.ctx, a.ID, "new@example.test", later); err != nil {
		t.Fatal(err)
	}
	got, _ := e.s.GetIdentityByLogin(e.ctx, store.AudiencePlayer, "new@example.test")
	if got.ID != a.ID || got.Revision != 2 || !sameTime(got.UpdatedAt, later) {
		t.Fatalf("changed: %+v", got)
	}
	if _, err := e.s.GetIdentityByLogin(e.ctx, store.AudiencePlayer, "old@example.test"); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("old key must be gone: %v", err)
	}
	if err := e.s.ChangeLoginKey(e.ctx, a.ID, "taken@example.test", later); !errors.Is(err, store.ErrLoginKeyTaken) {
		t.Fatalf("clash: %v", err)
	}
	if err := e.s.ChangeLoginKey(e.ctx, uuid.New(), "free@example.test", later); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("missing identity: %v", err)
	}
	if err := e.s.ChangeLoginKey(e.ctx, a.ID, " Not Normalized ", later); err == nil || errors.Is(err, store.ErrLoginKeyTaken) {
		t.Fatalf("CHECK violation expected, got %v", err)
	}
}
