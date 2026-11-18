package password

import (
	"encoding/base64"
	"errors"
	"regexp"
	"strings"
	"testing"
)

// fast keeps the tests quick; the production defaults are checked separately.
var fast = Params{MemoryKiB: 64, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}

// Vectors produced outside this package (argon2-cffi 25.1.0 on the reference argon2 C library,
// python bcrypt 5.x, Apple htpasswd, and the crypt_blowfish test suite).
const (
	vecArgonDefault   = "$argon2id$v=19$m=19456,t=2,p=1$F/+8gs4hi929qolTu55Hsw$bgkcF5b5dN3p0UkSeCGfdN6fBphLpgQH80Ie00lvUSM"
	vecArgonDefaultPw = "correct horse battery staple"
	vecArgonOther     = "$argon2id$v=19$m=8192,t=3,p=2$BI/0BMlfPWW/yDJddLSTSg$uoRAlGjctrtLTxs5cl19w4v/y0px6OjbnqP2R1qgRFI"
	vecArgonOtherPw   = "hunter2"

	vecBcrypt2y      = "$2y$10$rUwzkXwInz/Hay03jTWwYOVP2pf5BUbVNJ3aHW5mBHbDXtLjETDx6"
	vecBcrypt2b      = "$2b$10$EL7FkOMiSFFi51H3iVu2ruKb/jOZIZwWX80yrd0mNma6nf39O0C/C"
	vecBcrypt2a      = "$2a$05$e5/toSrZM2Wm.zT761HUZuSYJUGj9/ycm262xHYW.GgzKsaGqj/O."
	vecBcryptPw      = "correct horse"
	vecBcryptLongPw  = "correct horse battery staple"
	vecBcryptCrypt2a = "$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW" // password "U*U"
	vecBcrypt72      = "$2b$04$KEBknA/aPM0wRMKl2nAIee0swJew7XCnsch/tzghFw27N7y0/ZlHG" // 72 x "a"
	vecBcryptUnicode = "$2b$04$yT4IzR0jP3xsJl2pNc2LjeS0L6WBjbo/IN4lSV3lGfmfxamU4o4oy"
)

func mustHash(t *testing.T, p Params, pw string) string {
	t.Helper()
	h, err := p.Hash(pw)
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	return h
}

func TestDefaultParams(t *testing.T) {
	want := Params{MemoryKiB: 19456, Iterations: 2, Parallelism: 1, SaltLen: 16, KeyLen: 32}
	if got := DefaultParams(); got != want {
		t.Fatalf("DefaultParams() = %+v, want %+v", got, want)
	}
}

func TestHashProducesPHCString(t *testing.T) {
	h := mustHash(t, fast, "pw")
	re := regexp.MustCompile(`^\$argon2id\$v=19\$m=64,t=1,p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$`)
	m := re.FindStringSubmatch(h)
	if m == nil {
		t.Fatalf("not a PHC argon2id string: %q", h)
	}
	salt, err := base64.RawStdEncoding.DecodeString(m[1])
	if err != nil || len(salt) != 16 {
		t.Fatalf("salt: %v len=%d", err, len(salt))
	}
	key, err := base64.RawStdEncoding.DecodeString(m[2])
	if err != nil || len(key) != 32 {
		t.Fatalf("key: %v len=%d", err, len(key))
	}
}

func TestPackageHashUsesDefaultParams(t *testing.T) {
	h, err := Hash("pw")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Fatalf("unexpected prefix: %q", h)
	}
	ok, rehash, err := Verify("pw", h)
	if err != nil || !ok || rehash {
		t.Fatalf("Verify = %v %v %v", ok, rehash, err)
	}
}

func TestHashSaltsDiffer(t *testing.T) {
	a, b := mustHash(t, fast, "pw"), mustHash(t, fast, "pw")
	if a == b {
		t.Fatal("two hashes of the same password must differ (random salt)")
	}
}

func TestHashRejectsBadParams(t *testing.T) {
	for name, p := range map[string]Params{
		"zero":         {},
		"no memory":    {MemoryKiB: 0, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32},
		"no iter":      {MemoryKiB: 64, Iterations: 0, Parallelism: 1, SaltLen: 16, KeyLen: 32},
		"no lanes":     {MemoryKiB: 64, Iterations: 1, Parallelism: 0, SaltLen: 16, KeyLen: 32},
		"short salt":   {MemoryKiB: 64, Iterations: 1, Parallelism: 1, SaltLen: 4, KeyLen: 32},
		"short key":    {MemoryKiB: 64, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 2},
		"memory < 8*p": {MemoryKiB: 8, Iterations: 1, Parallelism: 2, SaltLen: 16, KeyLen: 32},
	} {
		if _, err := p.Hash("pw"); err == nil {
			t.Errorf("%s: want error", name)
		}
	}
}

func TestRoundTripWrongAndEmptyPassword(t *testing.T) {
	h := mustHash(t, fast, "s3cret pass")
	ok, rehash, err := fast.Verify("s3cret pass", h)
	if err != nil || !ok || rehash {
		t.Fatalf("right password: %v %v %v", ok, rehash, err)
	}
	ok, rehash, err = fast.Verify("s3cret pasS", h)
	if err != nil || ok || rehash {
		t.Fatalf("wrong password: %v %v %v", ok, rehash, err)
	}
	// An empty password is hashable and verifiable; whether it is allowed is the caller's policy.
	e := mustHash(t, fast, "")
	if ok, _, err := fast.Verify("", e); err != nil || !ok {
		t.Fatalf("empty round trip: %v %v", ok, err)
	}
	if ok, _, err := fast.Verify("x", e); err != nil || ok {
		t.Fatalf("empty hash must reject x: %v %v", ok, err)
	}
	if ok, _, err := fast.Verify("", h); err != nil || ok {
		t.Fatalf("empty password must not match: %v %v", ok, err)
	}
}

func TestVerifyKnownArgon2idVectors(t *testing.T) {
	ok, rehash, err := Verify(vecArgonDefaultPw, vecArgonDefault)
	if err != nil || !ok || rehash {
		t.Fatalf("default-params vector: ok=%v rehash=%v err=%v", ok, rehash, err)
	}
	if ok, _, err := Verify("wrong", vecArgonDefault); err != nil || ok {
		t.Fatalf("default-params vector, wrong password: ok=%v err=%v", ok, err)
	}
	// Old parameters keep verifying (parsed from the string) and ask for a rehash.
	ok, rehash, err = Verify(vecArgonOtherPw, vecArgonOther)
	if err != nil || !ok || !rehash {
		t.Fatalf("other-params vector: ok=%v rehash=%v err=%v", ok, rehash, err)
	}
	if ok, rehash, err := Verify("wrong", vecArgonOther); err != nil || ok || rehash {
		t.Fatalf("other-params vector, wrong password: ok=%v rehash=%v err=%v", ok, rehash, err)
	}
}

func TestVerifyRehashFlagFollowsEachParam(t *testing.T) {
	h := mustHash(t, fast, "pw")
	cases := map[string]Params{
		"same":       fast,
		"memory":     {MemoryKiB: 128, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32},
		"iterations": {MemoryKiB: 64, Iterations: 2, Parallelism: 1, SaltLen: 16, KeyLen: 32},
		"lanes":      {MemoryKiB: 64, Iterations: 1, Parallelism: 2, SaltLen: 16, KeyLen: 32},
		"key length": {MemoryKiB: 64, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 64},
		"salt len":   {MemoryKiB: 64, Iterations: 1, Parallelism: 1, SaltLen: 32, KeyLen: 32},
	}
	for name, cur := range cases {
		ok, rehash, err := cur.Verify("pw", h)
		if err != nil || !ok {
			t.Fatalf("%s: ok=%v err=%v", name, ok, err)
		}
		if want := name != "same"; rehash != want {
			t.Errorf("%s: needsRehash=%v, want %v", name, rehash, want)
		}
	}
}

func TestVerifyBcryptVectors(t *testing.T) {
	cases := []struct{ name, pw, hash string }{
		{"2y htpasswd", vecBcryptPw, vecBcrypt2y},
		{"2b python", vecBcryptLongPw, vecBcrypt2b},
		{"2a python", vecBcryptLongPw, vecBcrypt2a},
		{"2a crypt_blowfish", "U*U", vecBcryptCrypt2a},
		{"2b crypt_blowfish prefix swap", "U*U", "$2b$" + strings.TrimPrefix(vecBcryptCrypt2a, "$2a$")},
		{"2y crypt_blowfish prefix swap", "U*U", "$2y$" + strings.TrimPrefix(vecBcryptCrypt2a, "$2a$")},
		{"non-ascii", "p\u00e4ss w\u00f6rd", vecBcryptUnicode},
	}
	for _, c := range cases {
		ok, rehash, err := Verify(c.pw, c.hash)
		if err != nil || !ok || !rehash {
			t.Errorf("%s: ok=%v rehash=%v err=%v (every bcrypt hash must ask for a rehash)", c.name, ok, rehash, err)
		}
		ok, rehash, err = Verify(c.pw+"x", c.hash)
		if err != nil || ok || rehash {
			t.Errorf("%s wrong password: ok=%v rehash=%v err=%v", c.name, ok, rehash, err)
		}
	}
}

// bcrypt only uses the first 72 bytes of a password. golang.org/x/crypto/bcrypt
// CompareHashAndPassword silently ignores the rest, and so did the Supabase hashes we import, so
// Verify makes that explicit: for a bcrypt hash only the first 72 bytes count, and a success
// always sets needsRehash so the account moves to argon2id, which hashes the whole password.
func TestVerifyBcryptSeventyTwoByteLimit(t *testing.T) {
	p72 := strings.Repeat("a", 72)
	cases := []struct {
		name, pw string
		want     bool
	}{
		{"exactly 72 bytes", p72, true},
		{"73 bytes, same first 72", p72 + "b", true},
		{"200 bytes, same first 72", p72 + strings.Repeat("z", 128), true},
		{"73 bytes, differs inside the first 72", "b" + p72, false},
		{"71 bytes", p72[:71], false},
	}
	for _, c := range cases {
		ok, rehash, err := Verify(c.pw, vecBcrypt72)
		if err != nil || ok != c.want {
			t.Errorf("%s: ok=%v err=%v, want ok=%v", c.name, ok, err, c.want)
		}
		if c.want && !rehash {
			t.Errorf("%s: a successful bcrypt verify must set needsRehash", c.name)
		}
	}
}

func TestVerifyBcryptTooLongPasswordTruncationIsNotAnArgon2Property(t *testing.T) {
	// The same long password pair is told apart by argon2id: the rehash fixes the truncation.
	a := strings.Repeat("a", 72) + "b"
	h := mustHash(t, fast, a)
	if ok, _, err := fast.Verify(a, h); err != nil || !ok {
		t.Fatalf("argon2id must accept the full password: %v %v", ok, err)
	}
	if ok, _, err := fast.Verify(strings.Repeat("a", 72)+"c", h); err != nil || ok {
		t.Fatalf("argon2id must use every byte: %v %v", ok, err)
	}
}

func TestVerifyTamperedHash(t *testing.T) {
	h := mustHash(t, fast, "pw")
	i := strings.LastIndex(h, "$") + 5 // a character in the middle of the key
	flip := byte('A')
	if h[i] == 'A' {
		flip = 'B'
	}
	tampered := h[:i] + string(flip) + h[i+1:]
	ok, _, err := fast.Verify("pw", tampered)
	if err != nil || ok {
		t.Fatalf("tampered key: ok=%v err=%v, want a clean mismatch", ok, err)
	}

	b := []byte(vecBcrypt2b)
	b[40] ^= 1
	if ok, _, err := Verify(vecBcryptLongPw, string(b)); ok {
		t.Fatalf("tampered bcrypt must not verify (err=%v)", err)
	}
}

func TestVerifyMalformedAndUnknownHashes(t *testing.T) {
	valid := mustHash(t, fast, "pw")
	parts := strings.Split(valid, "$") // "", argon2id, v=19, params, salt, key
	join := func(p ...string) string { return strings.Join(p, "$") }
	cases := []struct {
		name, hash string
		want       error
	}{
		{"empty", "", ErrMalformedHash},
		{"plaintext", "hunter2", ErrMalformedHash},
		{"only prefix", "$argon2id$", ErrMalformedHash},
		{"missing key", join("", "argon2id", "v=19", parts[3], parts[4]), ErrMalformedHash},
		{"extra field", valid + "$x", ErrMalformedHash},
		{"bad version", join("", "argon2id", "v=18", parts[3], parts[4], parts[5]), ErrMalformedHash},
		{"no version", join("", "argon2id", parts[3], parts[4], parts[5]), ErrMalformedHash},
		{"bad version syntax", join("", "argon2id", "v=x", parts[3], parts[4], parts[5]), ErrMalformedHash},
		{"bad salt base64", join("", "argon2id", "v=19", parts[3], "!!!!", parts[5]), ErrMalformedHash},
		{"bad key base64", join("", "argon2id", "v=19", parts[3], parts[4], "@@@@"), ErrMalformedHash},
		{"padded base64", join("", "argon2id", "v=19", parts[3], parts[4], parts[5]+"="), ErrMalformedHash},
		{"empty salt", join("", "argon2id", "v=19", parts[3], "", parts[5]), ErrMalformedHash},
		{"empty key", join("", "argon2id", "v=19", parts[3], parts[4], ""), ErrMalformedHash},
		{"params missing p", join("", "argon2id", "v=19", "m=64,t=1", parts[4], parts[5]), ErrMalformedHash},
		{"params non-numeric", join("", "argon2id", "v=19", "m=a,t=1,p=1", parts[4], parts[5]), ErrMalformedHash},
		{"params wrong order", join("", "argon2id", "v=19", "t=1,m=64,p=1", parts[4], parts[5]), ErrMalformedHash},
		{"params zero memory", join("", "argon2id", "v=19", "m=0,t=1,p=1", parts[4], parts[5]), ErrMalformedHash},
		{"params zero iterations", join("", "argon2id", "v=19", "m=64,t=0,p=1", parts[4], parts[5]), ErrMalformedHash},
		{"params zero lanes", join("", "argon2id", "v=19", "m=64,t=1,p=0", parts[4], parts[5]), ErrMalformedHash},
		{"params memory bomb", join("", "argon2id", "v=19", "m=4294967295,t=1,p=1", parts[4], parts[5]), ErrMalformedHash},
		{"params time bomb", join("", "argon2id", "v=19", "m=64,t=4294967295,p=1", parts[4], parts[5]), ErrMalformedHash},
		{"params lane overflow", join("", "argon2id", "v=19", "m=64,t=1,p=256", parts[4], parts[5]), ErrMalformedHash},
		{"argon2i", strings.Replace(valid, "argon2id", "argon2i", 1), ErrUnsupportedScheme},
		{"scrypt", "$scrypt$ln=15,r=8,p=1$c2FsdA$aGFzaA", ErrUnsupportedScheme},
		{"unknown numeric", "$1$salt$hash", ErrUnsupportedScheme},
		{"bcrypt unknown minor", strings.Replace(vecBcrypt2b, "$2b$", "$2x$", 1), ErrUnsupportedScheme},
		{"bcrypt truncated", vecBcrypt2b[:40], ErrMalformedHash},
		{"bcrypt too long", vecBcrypt2b + "x", ErrMalformedHash},
		{"bcrypt bad cost", "$2b$xx$" + vecBcrypt2b[7:], ErrMalformedHash},
		{"bcrypt cost too low", "$2b$03$" + vecBcrypt2b[7:], ErrMalformedHash},
		{"bcrypt cost too high", "$2b$31$" + vecBcrypt2b[7:], ErrMalformedHash},
		{"bcrypt bad charset", vecBcrypt2b[:30] + "!!!!!" + vecBcrypt2b[35:], ErrMalformedHash},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			ok, rehash, err := fast.Verify("pw", c.hash)
			if ok || rehash {
				t.Fatalf("ok=%v rehash=%v, want false false", ok, rehash)
			}
			if !errors.Is(err, c.want) {
				t.Fatalf("err = %v, want %v", err, c.want)
			}
			if c.hash != "" && strings.Contains(err.Error(), c.hash) {
				t.Fatal("error must not contain the stored hash")
			}
			if strings.Contains(err.Error(), "pw") {
				t.Fatal("error must not contain the password")
			}
		})
	}
}

func TestErrorsNeverContainSecrets(t *testing.T) {
	const pw = "very-secret-password-value"
	_, _, err := Verify(pw, "garbage-"+pw)
	if err == nil || strings.Contains(err.Error(), pw) {
		t.Fatalf("err = %v", err)
	}
	if _, err := (Params{}).Hash(pw); err == nil || strings.Contains(err.Error(), pw) {
		t.Fatalf("err = %v", err)
	}
}
