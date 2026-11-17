package publicreads

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf16"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The public libraries and numbers: GET /api/profile-banners/shown, GET /api/profile-characters/shown,
// GET /api/profile-characters/{id}/image and GET /api/ranking-settings. Ports of readShownProfileBanners,
// readShownProfileCharacters, profileCharacterImageResponse and readPublicRankingPolicies.

type library struct {
	pool *pgxpool.Pool
	log  *slog.Logger
}

func (l *library) fail(w http.ResponseWriter, r *http.Request, err error) {
	failRead(w, r, l.log, "library read failed", err)
}

type bannerDTO struct {
	ID         string `json:"id"`
	Image      string `json:"image"` // '' for a banner the apps draw from theme tokens
	Shown      bool   `json:"shown"`
	UploadedAt string `json:"uploadedAt"`
	Number     int32  `json:"number"`
	IsDefault  bool   `json:"isDefault"`
}

func (l *library) shownBanners(w http.ResponseWriter, r *http.Request) {
	out := []bannerDTO{}
	err := readTx(r.Context(), l.pool, func(q *sqlcgen.Queries) error {
		rows, err := q.ListShownProfileBannerRows(r.Context())
		if err != nil {
			return fmt.Errorf("listing shown banners: %w", err)
		}
		for _, b := range rows {
			out = append(out, bannerDTO{ID: b.ID, Image: b.Image, Shown: b.Shown, UploadedAt: httpapi.ToIso(b.UploadedAt.Time), Number: b.Number, IsDefault: b.IsDefault})
		}
		return nil
	})
	if err != nil {
		l.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		Banners []bannerDTO `json:"banners"`
	}{out}, httpapi.Public)
}

type characterDTO struct {
	ID         string `json:"id"`
	Image      string `json:"image"`
	Shown      bool   `json:"shown"`
	UploadedAt string `json:"uploadedAt"`
	Number     int32  `json:"number"`
}

func (l *library) shownCharacters(w http.ResponseWriter, r *http.Request) {
	out := []characterDTO{}
	err := readTx(r.Context(), l.pool, func(q *sqlcgen.Queries) error {
		rows, err := q.ListShownProfileCharacters(r.Context())
		if err != nil {
			return fmt.Errorf("listing shown characters: %w", err)
		}
		for _, c := range rows {
			out = append(out, characterDTO{ID: c.ID, Image: c.Image, Shown: c.Shown, UploadedAt: httpapi.ToIso(c.UploadedAt.Time), Number: c.Number})
		}
		return nil
	})
	if err != nil {
		l.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		Characters []characterDTO `json:"characters"`
	}{out}, httpapi.Public)
}

// rankingPolicyDTO is one saved ranking settings version: the public numbers only. The Admin change note and
// the name of who saved it stay in Admin's own read, so both are the empty string here (as the TypeScript sends).
type rankingPolicyDTO struct {
	Version                      int32  `json:"version"`
	EffectiveAt                  string `json:"effectiveAt"`
	AssessmentWeightBp           int16  `json:"assessmentWeightBp"`
	PerformanceWeightBp          int16  `json:"performanceWeightBp"`
	RecentStandardMatchThreshold int16  `json:"recentStandardMatchThreshold"`
	ChangeNote                   string `json:"changeNote"`
	CreatedByDisplayName         string `json:"createdByDisplayName"`
}

// rankingSettings serves the stored versions as saved, oldest first (the newest is in effect). It calculates
// nothing and does not look at the algorithm version: there is no gate in the TypeScript either.
func (l *library) rankingSettings(w http.ResponseWriter, r *http.Request) {
	out := []rankingPolicyDTO{}
	err := readTx(r.Context(), l.pool, func(q *sqlcgen.Queries) error {
		rows, err := q.ListPublicRankingPolicies(r.Context())
		if err != nil {
			return fmt.Errorf("listing ranking settings: %w", err)
		}
		for _, p := range rows {
			out = append(out, rankingPolicyDTO{
				Version: p.Version, EffectiveAt: httpapi.ToIso(p.EffectiveAt.Time), AssessmentWeightBp: p.AssessmentWeightBp,
				PerformanceWeightBp: p.PerformanceWeightBp, RecentStandardMatchThreshold: p.RecentStandardMatchThreshold,
			})
		}
		return nil
	})
	if err != nil {
		l.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		Versions []rankingPolicyDTO `json:"versions"`
	}{out}, httpapi.Public)
}

// ---- GET /api/profile-characters/{id}/image ----

// characterImageHeaders are IMAGE_HEADERS in profile-characters.ts. An SVG served from our origin must never run script.
const (
	imageCacheControl = "public, max-age=31536000, immutable"
	imageCSP          = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
)

// dataURI is /^data:(image\/[a-z0-9.+-]+)(;base64)?,(.*)$/s.
var dataURI = regexp.MustCompile(`(?s)^data:(image/[a-z0-9.+-]+)(;base64)?,(.*)$`)

// characterImage serves any library row, hidden and deleted ones included (a player who already uses an image
// keeps it). It is not a JSON route: a missing row or bad id is an empty 404, any failure an empty 503, both
// never cached. An uploaded image redirects (307) to its https URL; a seeded data: URL is served as bytes. The
// image never changes for an id, so both answers are cached for a year. It reads no Storage SDK.
func (l *library) characterImage(w http.ResponseWriter, r *http.Request) {
	id, ok := characterIDOfSegment(r.PathValue("id"))
	if !ok {
		emptyAnswer(w, http.StatusNotFound)
		return
	}
	var image string
	err := readTx(r.Context(), l.pool, func(q *sqlcgen.Queries) (err error) {
		image, err = q.GetProfileCharacterImage(r.Context(), id)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		emptyAnswer(w, http.StatusNotFound)
		return
	}
	if err != nil {
		l.imageFailed(w, r, err)
		return
	}
	if strings.HasPrefix(image, "https://") {
		location, ok := locationHeaderValue(image)
		if !ok { // the Headers object throws on it, and the catch answers 503
			l.imageFailed(w, r, errors.New("the stored image URL is not a valid header value"))
			return
		}
		h := w.Header()
		h.Set("Location", location)
		h.Set("Cache-Control", imageCacheControl)
		w.WriteHeader(http.StatusTemporaryRedirect)
		return
	}
	m := dataURI.FindStringSubmatch(image)
	if m == nil {
		emptyAnswer(w, http.StatusNotFound)
		return
	}
	var body []byte
	if m[2] != "" {
		body = nodeBase64Decode(m[3])
	} else if body, ok = jsDecodeURIComponent(m[3]); !ok { // decodeURIComponent throws on a bad escape
		l.imageFailed(w, r, errors.New("the stored image has a malformed percent escape"))
		return
	}
	h := w.Header()
	h.Set("Cache-Control", imageCacheControl)
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Content-Security-Policy", imageCSP)
	h.Set("Content-Type", m[1])
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func (l *library) imageFailed(w http.ResponseWriter, r *http.Request, err error) {
	// like the TypeScript, say what kind of failure it was, never the row or the request
	l.log.LogAttrs(r.Context(), slog.LevelError, "profile character image failed",
		slog.String("request_id", httpapi.RequestIDFrom(r.Context())), slog.String("error", err.Error()))
	emptyAnswer(w, http.StatusServiceUnavailable)
}

// emptyAnswer is the image route's body-less 404 and 503: never cached.
func emptyAnswer(w http.ResponseWriter, status int) {
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
}

// characterIDOfSegment reads the {id} segment as a library id: `_` is the first seeded character's empty id
// (an empty segment would collapse the path), and the id must be CHARACTER_ID: ” or one lowercase letter
// (seeded) or a lowercase UUID (uploaded). Anything else, an upper-case UUID included, can name no row.
func characterIDOfSegment(segment string) (string, bool) {
	id := segment
	if id == "_" {
		id = ""
	}
	switch {
	case id == "":
		return id, true
	case len(id) == 1 && id[0] >= 'a' && id[0] <= 'z':
		return id, true
	case id == strings.ToLower(id):
		_, ok := parseUUID(id)
		return id, ok
	}
	return "", false
}

// jsDecodeURIComponent is decodeURIComponent returning the UTF-8 of the result. ok is false where JavaScript
// throws a URIError: a '%' without two hex digits, a stray continuation or a lead byte of five or more, a
// sequence cut short, or bytes that are not UTF-8 (overlong forms, surrogates, above U+10FFFF). '+' stays '+'.
func jsDecodeURIComponent(s string) (out []byte, ok bool) {
	out = make([]byte, 0, len(s))
	for i := 0; i < len(s); {
		if s[i] != '%' {
			out = append(out, s[i])
			i++
			continue
		}
		b, ok := hexByte(s, i)
		if !ok {
			return nil, false
		}
		i += 3
		if b < 0x80 {
			out = append(out, b)
			continue
		}
		n := 0
		for mask := byte(0x80); b&mask != 0 && n < 8; mask >>= 1 {
			n++
		}
		if n == 1 || n > 4 {
			return nil, false
		}
		seq := []byte{b}
		for j := 1; j < n; j++ {
			c, ok := hexByte(s, i)
			if !ok || c&0xc0 != 0x80 {
				return nil, false
			}
			seq = append(seq, c)
			i += 3
		}
		if !utf8.Valid(seq) {
			return nil, false
		}
		out = append(out, seq...)
	}
	return out, true
}

// hexByte reads "%XX" at s[i].
func hexByte(s string, i int) (byte, bool) {
	if i+2 >= len(s) || s[i] != '%' || !isHex(s[i+1]) || !isHex(s[i+2]) {
		return 0, false
	}
	return unhex(s[i+1])<<4 | unhex(s[i+2]), true
}

// nodeBase64Decode is Buffer.from(str, 'base64'). It is lenient in Node's own way: both alphabets decode ('-' and
// '_' too), every other character is skipped, '=' or the end stops the decoding, and a string with a character
// above U+00FF is read by the LOW BYTE of each UTF-16 unit (so U+0141 counts as 'A' and an emoji's high
// surrogate as '='). The result is also capped at floor(len*3/4), with up to two trailing '=' not counted.
func nodeBase64Decode(s string) []byte {
	units := utf16.Encode([]rune(s))
	n := len(units)
	counted := n
	if counted > 0 && units[counted-1] == '=' {
		counted--
	}
	if counted > 1 && units[counted-1] == '=' {
		counted--
	}
	limit := counted * 3 >> 2
	out := make([]byte, 0, limit)
	i := 0
	// next is one step of Node's group decoder: the next legal character, skipping the others; false at '=' or the end.
	next := func() (byte, bool) {
		for {
			c := byte(units[i])
			v := unbase64(c)
			i++
			if v < 64 {
				return v, true
			}
			if c == '=' || i >= n {
				return 0, false
			}
		}
	}
	var hi byte
	for i < n && len(out) < limit {
		for step := 0; step < 4; step++ {
			lo, ok := next()
			if !ok {
				return out
			}
			switch step {
			case 1:
				out = append(out, (hi&0x3f)<<2|(lo&0x30)>>4)
			case 2:
				out = append(out, (hi&0x0f)<<4|(lo&0x3c)>>2)
			case 3:
				out = append(out, (hi&0x03)<<6|lo&0x3f)
			}
			if i >= n || len(out) >= limit {
				return out
			}
			hi = lo
		}
	}
	return out
}

// unbase64 is Node's decode table: 64 or more is not a base64 character.
func unbase64(c byte) byte {
	switch {
	case c >= 'A' && c <= 'Z':
		return c - 'A'
	case c >= 'a' && c <= 'z':
		return c - 'a' + 26
	case c >= '0' && c <= '9':
		return c - '0' + 52
	case c == '+' || c == '-':
		return 62
	case c == '/' || c == '_':
		return 63
	}
	return 255
}

// locationHeaderValue is what a JavaScript Headers object makes of a Location value: it trims leading and
// trailing tab, line feed, carriage return and space, refuses an embedded line break or NUL, and holds one byte
// per character, so a character above U+00FF is refused. ok is false where the TypeScript throws (and answers 503).
func locationHeaderValue(s string) (string, bool) {
	s = strings.Trim(s, "\t\n\r ")
	if strings.ContainsAny(s, "\x00\r\n") {
		return "", false
	}
	b := make([]byte, 0, len(s))
	for _, r := range s {
		if r > 0xff {
			return "", false
		}
		b = append(b, byte(r))
	}
	return string(b), true
}
