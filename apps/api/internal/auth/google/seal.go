package google

import (
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// The cookies of the trip to Google. None of them is a session; each is short lived (ten minutes, as in the TypeScript), httpOnly
// (except the one marker the page reads), SameSite=Lax (the callback is a top-level navigation back from Google) and, unlike the
// TypeScript's, signed: the server does not trust what a browser claims it was told.
const (
	// FlowCookie holds where Continue with Google was pressed and the state, PKCE verifier and nonce of the trip.
	FlowCookie = "rotra-player-google-flow"
	// ResultCookie holds what the callback decided, for the screen that started the trip.
	ResultCookie = "rotra-player-google-result"
	// ReturnCookie is the page-readable marker: only the screen key a result waits for (GOOGLE_RETURN_COOKIE).
	ReturnCookie = "rotra-player-google-return"
	// HeldCookie holds the Google account the callback verified for a player who must still say yes or fill the form (the
	// held provider session of the TypeScript, which here is only the verified email and name, never a session).
	HeldCookie = "rotra-player-google-held"

	cookieTTL = 10 * time.Minute
)

// Sealer signs and checks the values of those cookies. The key is derived from the pass signing key, so no new secret is
// needed, and a key per purpose means a signed pass or another cookie can never be replayed as one of these.
type Sealer struct{ key []byte }

// NewSealer derives the cookie key from the pass signing key.
func NewSealer(signing ed25519.PrivateKey) *Sealer {
	mac := hmac.New(sha256.New, signing.Seed())
	mac.Write([]byte("rotra google sign-in cookies v1"))
	return &Sealer{key: mac.Sum(nil)}
}

type envelope struct {
	Kind string          `json:"k"`
	Exp  int64           `json:"e"`
	Data json.RawMessage `json:"d"`
}

// Seal is base64url(envelope) "." base64url(HMAC-SHA256(kind "." envelope)).
func (s *Sealer) Seal(kind string, v any, now time.Time) string {
	data, _ := json.Marshal(v)
	body, _ := json.Marshal(envelope{Kind: kind, Exp: now.Add(cookieTTL).Unix(), Data: data})
	payload := base64.RawURLEncoding.EncodeToString(body)
	return payload + "." + s.sign(kind, payload)
}

// Open checks the signature, the kind and the expiry, and decodes the value. False for anything else.
func (s *Sealer) Open(kind, value string, now time.Time, into any) bool {
	payload, sig, ok := strings.Cut(value, ".")
	if !ok || !hmac.Equal([]byte(sig), []byte(s.sign(kind, payload))) {
		return false
	}
	raw, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return false
	}
	var env envelope
	if json.Unmarshal(raw, &env) != nil || env.Kind != kind || now.Unix() >= env.Exp {
		return false
	}
	return json.Unmarshal(env.Data, into) == nil
}

func (s *Sealer) sign(kind, payload string) string {
	mac := hmac.New(sha256.New, s.key)
	mac.Write([]byte(kind + "." + payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// jar sets and reads the trip's cookies for one request.
type jar struct {
	w      http.ResponseWriter
	r      *http.Request
	sealer *Sealer
	now    func() time.Time
	secure bool
}

func (j jar) set(name, value string, readable bool) {
	c := &http.Cookie{Name: name, Value: value, Path: "/", SameSite: http.SameSiteLaxMode, HttpOnly: !readable, Secure: j.secure, MaxAge: int(cookieTTL / time.Second)}
	if value == "" {
		c.MaxAge = -1
	}
	http.SetCookie(j.w, c)
}

func (j jar) put(name, kind string, v any) { j.set(name, j.sealer.Seal(kind, v, j.now()), false) }

func (j jar) clear(names ...string) {
	for _, n := range names {
		j.set(n, "", n == ReturnCookie)
	}
}

func (j jar) read(name, kind string, into any) bool {
	c, err := j.r.Cookie(name)
	return err == nil && c.Value != "" && j.sealer.Open(kind, c.Value, j.now(), into)
}

// flow is what the start route remembers for the callback.
type flow struct {
	Intent   Intent `json:"i"`
	Key      string `json:"k"`
	ReturnTo string `json:"r"`
	State    string `json:"s"`
	Verifier string `json:"v"`
	Nonce    string `json:"n"`
}

// Result is what the callback decided, for the screen to show. Display only for the signed-in and connected outcomes, which are
// checked again where they grant anything.
type Result struct {
	Key     string  `json:"k"`
	Intent  Intent  `json:"i"`
	Outcome Outcome `json:"o"`
	Email   string  `json:"e"`
	Name    string  `json:"n"`
}

// Held is the Google account the callback verified and holds while the player decides.
type Held struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// Intent is where Continue with Google was pressed. connect is a signed-in player adding or changing Google.
type Intent string

// The four intents.
const (
	IntentLogin    Intent = "login"
	IntentRegister Intent = "register"
	IntentClaim    Intent = "claim"
	IntentConnect  Intent = "connect"
)

func (i Intent) valid() bool {
	return i == IntentLogin || i == IntentRegister || i == IntentClaim || i == IntentConnect
}

// Outcome is what the callback decided.
type Outcome string

// The outcomes the result cookie can hold.
const (
	OutcomeSignedIn     Outcome = "signed-in"
	OutcomeHeld         Outcome = "held"
	OutcomeNotConnected Outcome = "not-connected"
	OutcomeTaken        Outcome = "taken"
	OutcomeConnected    Outcome = "connected"
	OutcomeFailed       Outcome = "failed"
)
