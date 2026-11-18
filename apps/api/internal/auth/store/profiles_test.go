package store_test

import (
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestClubName(t *testing.T) {
	e := newEnv(t)
	sub := uuid.New()
	id := e.club(t, &sub, true, nil)
	e.exec(t, `UPDATE clubs SET name = 'Smash Club' WHERE id = $1`, id)
	if got, err := e.s.ClubName(e.ctx, id); err != nil || got != "Smash Club" {
		t.Fatalf("club name: %q %v", got, err)
	}
	if _, err := e.s.ClubName(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("unknown club: %v", err)
	}
}

func TestPlayerFullName(t *testing.T) {
	e := newEnv(t)
	id := e.player(t, uuid.New(), nil)
	e.exec(t, `UPDATE players SET full_name = 'Ana Reyes' WHERE id = $1`, id)
	if got, err := e.s.PlayerFullName(e.ctx, id); err != nil || got != "Ana Reyes" {
		t.Fatalf("player name: %q %v", got, err)
	}
	if _, err := e.s.PlayerFullName(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("unknown player: %v", err)
	}
}
