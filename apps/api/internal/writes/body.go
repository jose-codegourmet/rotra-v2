package writes

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

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
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
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
