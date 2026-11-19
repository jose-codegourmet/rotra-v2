package writes

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"strconv"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// maxBody is how much of a body is read. The Route Handlers have no limit; this one is far above any form.
// A larger body is answered as one that is not JSON. (A Go-only guard, see the track's deviations log.)
const maxBody = 1 << 20

// Body is the JSON object a Route Handler received. Its fields are read the way request.ts reads them.
type Body map[string]any

// ReadBody is readJsonBody: the request body as a JSON object. Anything else (no body, not JSON, trailing text, an
// array, a string, null) is `invalid` with no fields. Unknown fields are kept and ignored, and the content type is
// not checked: request.json() does neither.
func ReadBody(r *http.Request) (Body, error) {
	raw, err := io.ReadAll(io.LimitReader(r.Body, maxBody+1))
	if err != nil || len(raw) > maxBody {
		return nil, Fail(httpapi.ErrInvalid, nil)
	}
	// request.json() decodes UTF-8 and drops a leading byte order mark.
	raw = bytes.TrimPrefix(raw, []byte{0xef, 0xbb, 0xbf})
	// Numbers are kept as written (json.Number): a JavaScript number is a double, and one beyond a double's range
	// is Infinity there, not an error (see Number).
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, Fail(httpapi.ErrInvalid, nil)
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) { // text after the value
		return nil, Fail(httpapi.ErrInvalid, nil)
	}
	obj, ok := v.(map[string]any)
	if !ok {
		return nil, Fail(httpapi.ErrInvalid, nil)
	}
	return Body(obj), nil
}

// Text is text(): a string stays, anything else (a number, null, a missing field) is "".
func (b Body) Text(key string) string {
	s, _ := b[key].(string)
	return s
}

// Bool is the pair `typeof body[key] === 'boolean'` and its value.
func (b Body) Bool(key string) (value, isBool bool) {
	value, isBool = b[key].(bool)
	return value, isBool
}

// Number is int() in request.ts: a JSON number as the double JavaScript reads it, and NaN for anything else (a
// string, a boolean, null, a missing field). A number beyond a double's range is +Inf or -Inf, as in JavaScript.
func (b Body) Number(key string) float64 {
	n, ok := b[key].(json.Number)
	if !ok {
		return math.NaN()
	}
	f, err := strconv.ParseFloat(string(n), 64)
	if err != nil && !errors.Is(err, strconv.ErrRange) {
		return math.NaN()
	}
	return f
}

// NumberOrNull is intOrNull: a missing or null field is no value (ok is false), anything else is Number.
func (b Body) NumberOrNull(key string) (value float64, ok bool) {
	if v, has := b[key]; !has || v == nil {
		return 0, false
	}
	return b.Number(key), true
}

// Has is `key in body`: the field is there, even when it is null.
func (b Body) Has(key string) bool {
	_, ok := b[key]
	return ok
}

// Object is the field as a JSON object, or nil when it is anything else (a string, an array, null, a missing field).
func (b Body) Object(key string) Body {
	o, _ := b[key].(map[string]any)
	return Body(o)
}
