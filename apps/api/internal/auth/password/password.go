// Package password hashes and verifies account passwords: argon2id for new hashes, bcrypt verify
// only for hashes imported from Supabase. Nothing here logs or returns a password or a hash.
package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

// Errors returned by Verify and Hash. They never contain the password or the stored hash.
var (
	ErrMalformedHash     = errors.New("password: malformed hash")
	ErrUnsupportedScheme = errors.New("password: unsupported hash scheme")
	ErrInvalidParams     = errors.New("password: invalid argon2id parameters")
)

// bcryptMaxBytes is bcrypt's input limit: it ignores every password byte after the 72nd.
const bcryptMaxBytes = 72

// Bounds applied to parameters read from a stored hash, so a corrupted or hostile row cannot make
// a verify allocate gigabytes or run for minutes. They sit far above any value we would choose.
const (
	maxMemoryKiB   = 256 * 1024
	maxIterations  = 10
	maxParallelism = 16
	maxKeyLen      = 64
	minSaltLen     = 8
	minKeyLen      = 4
	maxSaltLen     = 64
	minBcryptCost  = bcrypt.MinCost
	maxBcryptCost  = 16
	bcryptHashLen  = 60
)

var b64 = base64.RawStdEncoding.Strict()

// Params are the argon2id settings used for new hashes.
type Params struct {
	MemoryKiB   uint32
	Iterations  uint32
	Parallelism uint8
	SaltLen     uint32
	KeyLen      uint32
}

// DefaultParams is the OWASP baseline: 19 MiB of memory, 2 iterations, 1 lane, a 16 byte salt and
// a 32 byte key.
func DefaultParams() Params {
	return Params{MemoryKiB: 19456, Iterations: 2, Parallelism: 1, SaltLen: 16, KeyLen: 32}
}

func (p Params) validate() error {
	switch {
	case p.MemoryKiB == 0 || p.MemoryKiB > maxMemoryKiB,
		p.Iterations == 0 || p.Iterations > maxIterations,
		p.Parallelism == 0 || p.Parallelism > maxParallelism,
		p.MemoryKiB < 8*uint32(p.Parallelism),
		p.SaltLen < minSaltLen || p.SaltLen > maxSaltLen,
		p.KeyLen < minKeyLen || p.KeyLen > maxKeyLen:
		return ErrInvalidParams
	}
	return nil
}

// Hash hashes password with DefaultParams.
func Hash(password string) (string, error) { return DefaultParams().Hash(password) }

// Hash hashes password into a PHC string:
// $argon2id$v=19$m=<KiB>,t=<iterations>,p=<lanes>$<salt>$<key> (unpadded standard base64).
func (p Params) Hash(password string) (string, error) {
	if err := p.validate(); err != nil {
		return "", err
	}
	salt := make([]byte, p.SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("password: reading random salt: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, p.Iterations, p.MemoryKiB, p.Parallelism, p.KeyLen)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, p.MemoryKiB, p.Iterations, p.Parallelism, b64.EncodeToString(salt), b64.EncodeToString(key)), nil
}

// Verify checks password against stored with DefaultParams as the current parameters.
func Verify(password, stored string) (ok, needsRehash bool, err error) {
	return DefaultParams().Verify(password, stored)
}

// Verify checks password against stored, which is an argon2id PHC string (its own parameters are
// read from it, so older hashes keep verifying) or a bcrypt hash ($2a$, $2b$ or $2y$) imported from
// Supabase. needsRehash is true after a successful check when the hash is bcrypt or its argon2id
// parameters differ from p; it is false whenever ok is false. A malformed or unknown hash returns
// an error and ok=false.
//
// bcrypt ignores everything after the 72nd byte of a password, and so did the hashes we import
// (golang.org/x/crypto/bcrypt.CompareHashAndPassword does the same). Verify makes that explicit:
// against a bcrypt hash only the first 72 bytes count, because the stored hash cannot tell a longer
// password apart. Locking those users out would be worse, and the needsRehash that comes with every
// bcrypt success moves the account to argon2id, which uses the whole password, on that sign-in.
func (p Params) Verify(password, stored string) (ok, needsRehash bool, err error) {
	switch {
	case strings.HasPrefix(stored, "$argon2id$"):
		h, err := parseArgon2id(stored)
		if err != nil {
			return false, false, err
		}
		got := argon2.IDKey([]byte(password), h.salt, h.params.Iterations, h.params.MemoryKiB, h.params.Parallelism, h.params.KeyLen)
		if subtle.ConstantTimeCompare(got, h.key) != 1 {
			return false, false, nil
		}
		return true, h.params.differsFrom(p), nil
	case len(stored) >= 4 && stored[0] == '$' && stored[1] == '2' && stored[3] == '$':
		return verifyBcrypt(password, stored)
	case strings.HasPrefix(stored, "$"):
		// Any other "$scheme$..." value (argon2i, argon2d, scrypt, md5 crypt, ...).
		if i := strings.IndexByte(stored[1:], '$'); i > 0 {
			return false, false, ErrUnsupportedScheme
		}
	}
	return false, false, ErrMalformedHash
}

// differsFrom reports whether a hash made with h's settings should be redone with cur. The salt
// length is part of the comparison because it is a property of the hash we store.
func (h Params) differsFrom(cur Params) bool {
	return h.MemoryKiB != cur.MemoryKiB || h.Iterations != cur.Iterations ||
		h.Parallelism != cur.Parallelism || h.KeyLen != cur.KeyLen || h.SaltLen != cur.SaltLen
}

func verifyBcrypt(password, stored string) (ok, needsRehash bool, err error) {
	if m := stored[2]; m != 'a' && m != 'b' && m != 'y' {
		return false, false, ErrUnsupportedScheme
	}
	if len(stored) != bcryptHashLen || stored[6] != '$' {
		return false, false, ErrMalformedHash
	}
	cost, err := strconv.Atoi(stored[4:6])
	if err != nil || cost < minBcryptCost || cost > maxBcryptCost || !validBcryptBody(stored[7:]) {
		return false, false, ErrMalformedHash
	}
	// $2y$ and $2b$ are $2a$ with the same algorithm for every input that is not the 2011 PHP
	// 8-bit bug; the library only knows $2a$ and $2b$.
	norm := stored
	if stored[2] == 'y' {
		norm = "$2b$" + stored[4:]
	}
	pw := []byte(password)
	if len(pw) > bcryptMaxBytes {
		pw = pw[:bcryptMaxBytes]
	}
	if err := bcrypt.CompareHashAndPassword([]byte(norm), pw); err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return false, false, nil
		}
		return false, false, ErrMalformedHash
	}
	return true, true, nil
}

// validBcryptBody checks the 22 character salt and 31 character digest alphabet (./A-Za-z0-9).
func validBcryptBody(s string) bool {
	if len(s) != 53 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c != '.' && c != '/' && (c < 'A' || c > 'Z') && (c < 'a' || c > 'z') && (c < '0' || c > '9') {
			return false
		}
	}
	return true
}

type argon2Hash struct {
	params Params
	salt   []byte
	key    []byte
}

// parseArgon2id reads $argon2id$v=19$m=..,t=..,p=..$salt$key. Every failure is ErrMalformedHash.
func parseArgon2id(stored string) (argon2Hash, error) {
	bad := argon2Hash{}
	parts := strings.Split(stored, "$")
	if len(parts) != 6 || parts[0] != "" || parts[1] != "argon2id" || parts[2] != "v=19" {
		return bad, ErrMalformedHash
	}
	var m, t uint64
	var p uint64
	kv := strings.Split(parts[3], ",")
	if len(kv) != 3 {
		return bad, ErrMalformedHash
	}
	for i, f := range []struct {
		key string
		dst *uint64
		max uint64
	}{{"m=", &m, maxMemoryKiB}, {"t=", &t, maxIterations}, {"p=", &p, maxParallelism}} {
		v, ok := strings.CutPrefix(kv[i], f.key)
		if !ok || v == "" || v[0] == '+' {
			return bad, ErrMalformedHash
		}
		n, err := strconv.ParseUint(v, 10, 32)
		if err != nil || n == 0 || n > f.max {
			return bad, ErrMalformedHash
		}
		*f.dst = n
	}
	salt, err := b64.DecodeString(parts[4])
	if err != nil {
		return bad, ErrMalformedHash
	}
	key, err := b64.DecodeString(parts[5])
	if err != nil {
		return bad, ErrMalformedHash
	}
	h := argon2Hash{
		params: Params{MemoryKiB: uint32(m), Iterations: uint32(t), Parallelism: uint8(p), SaltLen: uint32(len(salt)), KeyLen: uint32(len(key))},
		salt:   salt,
		key:    key,
	}
	if h.params.validate() != nil {
		return bad, ErrMalformedHash
	}
	return h, nil
}
