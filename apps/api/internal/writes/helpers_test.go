package writes_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// recorder is a response writer that remembers the status, for a handler that is called without the server.
type recorder struct {
	header http.Header
	status int
}

func (r *recorder) Header() http.Header         { return r.header }
func (r *recorder) Write(b []byte) (int, error) { return len(b), nil }
func (r *recorder) WriteHeader(code int)        { r.status = code }

func mustRequest(t *testing.T) *http.Request {
	t.Helper()
	return httptest.NewRequest("POST", "/api/probe", nil)
}
