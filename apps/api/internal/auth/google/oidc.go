// Package google is Google sign-in for players in Go (D-2026-11-16-01, track go-sign-in-catch-up): the OpenID Connect code flow
// done by the API itself (no Supabase, no library beyond the standard one), the decisions of packages/db/src/player/google-sign-in.ts,
// and the routes /api/auth/google/{start,callback,outcome,link,unclaimed} and /api/claim/{token}/google. Everything is behind the
// player_google_sign_in flag: with it off every route answers the catalog's 404, as a route that is not there.
//
// A Google account is known to ROTRA only through player_accounts.google_email (the email Google verified). The Go sign-in identity
// is the player's own login (auth_identities), so a session is issued only after ROTRA has checked that record: nothing the
// provider "attached by itself" can sign anybody in, which is the rule that startedWithOAuth enforced in the TypeScript.
package google

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"
)

// Endpoints are the provider's URLs. Production is Google's; a test points them at a fake.
type Endpoints struct {
	Auth    string
	Token   string
	JWKS    string
	Issuers []string
}

// Production is Google's OpenID Connect configuration (https://accounts.google.com/.well-known/openid-configuration).
var Production = Endpoints{
	Auth:    "https://accounts.google.com/o/oauth2/v2/auth",
	Token:   "https://oauth2.googleapis.com/token",
	JWKS:    "https://www.googleapis.com/oauth2/v3/certs",
	Issuers: []string{"https://accounts.google.com", "accounts.google.com"},
}

// Verified is the Google account as Google verified it: the email is trimmed and lower case, the name is for display only.
type Verified struct {
	Email string
	Name  string
}

// ErrExchange is every way the trip to Google can fail after the browser came back: a refused code, an unreachable
// provider, a token that does not verify. Callers show one sentence for all of them and never say which.
var ErrExchange = errors.New("google: could not finish with Google")

const (
	httpTimeout   = 10 * time.Second
	maxBody       = 1 << 20
	clockLeeway   = time.Minute
	keysTTL       = time.Hour
	keysRefetch   = time.Minute
	maxNameLength = 200
)

// Client talks to Google with one OAuth client (a Web application in the Google Cloud console).
type Client struct {
	id, secret string
	ep         Endpoints
	http       *http.Client
	now        func() time.Time

	// mu guards the cached key set and its two times; it is never held across a network call. fetchMu lets one goroutine at a
	// time fetch, so a slow Google keys endpoint delays only the verifications that need a fetch, not those with a cached key.
	mu      sync.Mutex
	keys    map[string]*rsa.PublicKey
	fetched time.Time
	tried   time.Time
	fetchMu sync.Mutex
}

// NewClient builds a client. A nil httpClient gets a 10 second timeout; a nil now is time.Now.
func NewClient(id, secret string, ep Endpoints, httpClient *http.Client, now func() time.Time) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: httpTimeout}
	}
	if now == nil {
		now = time.Now
	}
	return &Client{id: id, secret: secret, ep: ep, http: httpClient, now: now}
}

// PKCE makes a code verifier and its S256 challenge (RFC 7636).
func PKCE() (verifier, challenge string, err error) {
	verifier, err = randomToken(32)
	if err != nil {
		return "", "", err
	}
	return verifier, challengeOf(verifier), nil
}

func challengeOf(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// AuthURL is where the browser goes to pick a Google account. prompt=select_account makes Google always ask, so Change
// and Connect never reuse a different Google session silently. Scopes are openid, email and profile only.
func (c *Client) AuthURL(redirectURI, state, challenge, nonce string) string {
	q := url.Values{
		"client_id":             {c.id},
		"redirect_uri":          {redirectURI},
		"response_type":         {"code"},
		"scope":                 {"openid email profile"},
		"state":                 {state},
		"nonce":                 {nonce},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
		"prompt":                {"select_account"},
	}
	return c.ep.Auth + "?" + q.Encode()
}

// Exchange trades the code for tokens and verifies the ID token: signature against Google's published keys, issuer, audience,
// expiry, the nonce this browser started with, and a verified email. Anything else is ErrExchange.
func (c *Client) Exchange(ctx context.Context, code, verifier, redirectURI, nonce string) (Verified, error) {
	form := url.Values{
		"grant_type": {"authorization_code"}, "code": {code}, "code_verifier": {verifier},
		"client_id": {c.id}, "client_secret": {c.secret}, "redirect_uri": {redirectURI},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.ep.Token, strings.NewReader(form.Encode()))
	if err != nil {
		return Verified{}, ErrExchange
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return Verified{}, ErrExchange
	}
	defer func() { _ = res.Body.Close() }()
	body, err := io.ReadAll(io.LimitReader(res.Body, maxBody))
	if err != nil || res.StatusCode != http.StatusOK {
		return Verified{}, ErrExchange
	}
	var tokens struct {
		IDToken string `json:"id_token"`
	}
	if json.Unmarshal(body, &tokens) != nil || tokens.IDToken == "" {
		return Verified{}, ErrExchange
	}
	v, err := c.verifyIDToken(ctx, tokens.IDToken, nonce)
	if err != nil {
		return Verified{}, ErrExchange
	}
	return v, nil
}

type idClaims struct {
	Issuer        string          `json:"iss"`
	Audience      json.RawMessage `json:"aud"`
	Expires       float64         `json:"exp"`
	IssuedAt      float64         `json:"iat"`
	Nonce         string          `json:"nonce"`
	Email         string          `json:"email"`
	EmailVerified json.RawMessage `json:"email_verified"`
	Name          string          `json:"name"`
}

func (c *Client) verifyIDToken(ctx context.Context, token, nonce string) (Verified, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Verified{}, errors.New("not a compact JWS")
	}
	var header struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := decodeSegment(parts[0], &header); err != nil || header.Alg != "RS256" || header.Kid == "" {
		return Verified{}, errors.New("unsupported header") // never "none", never HS256 with a public key
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return Verified{}, err
	}
	key, err := c.key(ctx, header.Kid)
	if err != nil {
		return Verified{}, err
	}
	sum := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, sum[:], sig); err != nil {
		return Verified{}, errors.New("bad signature")
	}
	var claims idClaims
	if err := decodeSegment(parts[1], &claims); err != nil {
		return Verified{}, err
	}
	now := c.now()
	switch {
	case !slices.Contains(c.ep.Issuers, claims.Issuer):
		return Verified{}, errors.New("wrong issuer")
	case !audienceHas(claims.Audience, c.id):
		return Verified{}, errors.New("wrong audience")
	case now.After(time.Unix(int64(claims.Expires), 0).Add(clockLeeway)):
		return Verified{}, errors.New("expired")
	case claims.IssuedAt == 0 || time.Unix(int64(claims.IssuedAt), 0).After(now.Add(clockLeeway)):
		return Verified{}, errors.New("issued in the future")
	case nonce == "" || claims.Nonce != nonce:
		return Verified{}, errors.New("wrong nonce")
	case !emailVerified(claims.EmailVerified):
		return Verified{}, errors.New("email not verified")
	}
	email := strings.ToLower(strings.TrimSpace(claims.Email))
	if !validEmail(email) {
		return Verified{}, errors.New("no usable email")
	}
	name := strings.TrimSpace(claims.Name)
	if r := []rune(name); len(r) > maxNameLength {
		name = string(r[:maxNameLength])
	}
	return Verified{Email: email, Name: name}, nil
}

// validEmail is the check of the TypeScript (usedGoogleIdentity): one @ with something on both sides, no white space.
func validEmail(email string) bool {
	local, domain, ok := strings.Cut(email, "@")
	return ok && local != "" && domain != "" && !strings.Contains(domain, "@") && !strings.ContainsAny(email, " \t\r\n")
}

func decodeSegment(seg string, into any) error {
	raw, err := base64.RawURLEncoding.DecodeString(seg)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, into)
}

// audienceHas reads aud as a string or an array of strings.
func audienceHas(raw json.RawMessage, want string) bool {
	var one string
	if json.Unmarshal(raw, &one) == nil {
		return one == want
	}
	var many []string
	return json.Unmarshal(raw, &many) == nil && slices.Contains(many, want)
}

// emailVerified reads the boolean Google sends, or the string "true" some older tokens carried.
func emailVerified(raw json.RawMessage) bool {
	var b bool
	if json.Unmarshal(raw, &b) == nil {
		return b
	}
	var s string
	return json.Unmarshal(raw, &s) == nil && s == "true"
}

// key finds Google's public key for kid. The set is cached for an hour; an unknown kid refetches it, at most once a minute.
func (c *Client) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	if k, ok := c.cachedKey(kid); ok {
		return k, nil
	}
	c.fetchMu.Lock()
	defer c.fetchMu.Unlock()
	if k, ok := c.cachedKey(kid); ok { // another goroutine fetched while this one waited
		return k, nil
	}
	c.mu.Lock()
	now := c.now()
	if now.Sub(c.tried) < keysRefetch && c.keys != nil {
		c.mu.Unlock()
		return nil, errors.New("unknown key")
	}
	c.tried = now
	c.mu.Unlock()
	// The fetch serves every waiting verification, so it must not die with the request that happened to start it.
	fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), httpTimeout)
	defer cancel()
	keys, err := c.fetchKeys(fetchCtx)
	if err != nil {
		return nil, err
	}
	c.mu.Lock()
	c.keys, c.fetched = keys, now
	c.mu.Unlock()
	if k, ok := keys[kid]; ok {
		return k, nil
	}
	return nil, errors.New("unknown key")
}

// cachedKey is the key for kid while the cached set is fresh.
func (c *Client) cachedKey(kid string) (*rsa.PublicKey, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	k, ok := c.keys[kid]
	return k, ok && c.now().Sub(c.fetched) < keysTTL
}

func (c *Client) fetchKeys(ctx context.Context) (map[string]*rsa.PublicKey, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.ep.JWKS, nil)
	if err != nil {
		return nil, err
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("keys: status %d", res.StatusCode)
	}
	var set struct {
		Keys []struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, maxBody)).Decode(&set); err != nil {
		return nil, err
	}
	keys := map[string]*rsa.PublicKey{}
	for _, k := range set.Keys {
		if k.Kty != "RSA" || k.Kid == "" {
			continue
		}
		n, errN := base64.RawURLEncoding.DecodeString(k.N)
		e, errE := base64.RawURLEncoding.DecodeString(k.E)
		if errN != nil || errE != nil || len(n) < 256 { // 2048 bits at least
			continue
		}
		exp := int(new(big.Int).SetBytes(e).Int64())
		if exp < 3 {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: exp}
	}
	if len(keys) == 0 {
		return nil, errors.New("keys: none usable")
	}
	return keys, nil
}
