package password

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
)

// Hasher runs password work with at most a fixed number of hashes in flight, so a venue signing in
// at once cannot use all the memory of a small instance (an argon2id hash holds its memory for the
// whole computation). Waiting for a slot gives up when the caller's context ends.
type Hasher struct {
	params Params
	sem    chan struct{}
	// dummy is an argon2id hash with the current params for an unknown account to verify against.
	dummy string
	// onSlot is a test hook that runs while a slot is held.
	onSlot func()
}

// NewHasher builds a Hasher that uses p for new hashes and allows maxConcurrent hashes at once.
// It creates the dummy hash now, so the dummy always has the current parameters.
func NewHasher(p Params, maxConcurrent int) (*Hasher, error) {
	if maxConcurrent < 1 {
		return nil, errors.New("password: maxConcurrent must be at least 1")
	}
	if err := p.validate(); err != nil {
		return nil, err
	}
	pw := make([]byte, 32)
	if _, err := rand.Read(pw); err != nil {
		return nil, fmt.Errorf("password: reading random bytes: %w", err)
	}
	dummy, err := p.Hash(string(pw))
	if err != nil {
		return nil, err
	}
	return &Hasher{params: p, sem: make(chan struct{}, maxConcurrent), dummy: dummy}, nil
}

// acquire takes a slot, or returns ctx.Err() if the context ends first. A context that is already
// done never takes a slot, even when one is free.
func (h *Hasher) acquire(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	select {
	case h.sem <- struct{}{}:
		if h.onSlot != nil {
			h.onSlot()
		}
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (h *Hasher) release() { <-h.sem }

// Hash hashes password with the Hasher's params, waiting for a slot.
func (h *Hasher) Hash(ctx context.Context, password string) (string, error) {
	if err := h.acquire(ctx); err != nil {
		return "", err
	}
	defer h.release()
	return h.params.Hash(password)
}

// Verify verifies password against stored (see Params.Verify), waiting for a slot. The Hasher's
// params are the current ones for the needsRehash flag.
func (h *Hasher) Verify(ctx context.Context, password, stored string) (ok, needsRehash bool, err error) {
	if err := h.acquire(ctx); err != nil {
		return false, false, err
	}
	defer h.release()
	return h.params.Verify(password, stored)
}

// VerifyUnknown does the work of a verify against a fixed dummy hash, so a sign-in for an account
// that does not exist costs about the same as a wrong password. The bool is always false; the
// error is only the context's.
func (h *Hasher) VerifyUnknown(ctx context.Context, password string) (bool, error) {
	if err := h.acquire(ctx); err != nil {
		return false, err
	}
	defer h.release()
	_, _, _ = h.params.Verify(password, h.dummy)
	return false, nil
}
