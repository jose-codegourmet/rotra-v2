package adminwrites

import (
	"crypto/rand"
	"fmt"
)

// The club invite code of /register/<clubId>?k=<code> (D-2026-11-09-08, #712), made the way
// packages/data/src/club/inviteCode.ts newClubInviteCode makes it: ten characters from an alphabet that leaves out
// the look-alikes (I, L, O, 0, 1), drawn without modulo bias. Stored codes match ^[A-Z0-9]{8,16}$.
const (
	inviteAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	// inviteLength is REAL_INVITE_CODE_LENGTH.
	inviteLength = 10
)

// newInviteCode returns a fresh random code.
func newInviteCode() (string, error) {
	limit := byte(256 - 256%len(inviteAlphabet)) // bytes at or above it would favour the first letters
	code := make([]byte, 0, inviteLength)
	buf := make([]byte, inviteLength*2)
	for len(code) < inviteLength {
		if _, err := rand.Read(buf); err != nil {
			return "", fmt.Errorf("drawing an invite code: %w", err)
		}
		for _, b := range buf {
			if b < limit && len(code) < inviteLength {
				code = append(code, inviteAlphabet[int(b)%len(inviteAlphabet)])
			}
		}
	}
	return string(code), nil
}
