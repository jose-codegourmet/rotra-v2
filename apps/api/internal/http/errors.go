// Package httpapi holds the HTTP layer: router, middleware, and the error and JSON contracts that
// must match the Next.js Route Handlers (packages/db/src/service/{errors,handler,serialize}.ts).
package httpapi

import (
	"encoding/json"
	"net/http"
)

// ErrorCode is one of the codes in SERVICE_ERRORS (errors.ts).
type ErrorCode string

const (
	ErrUnauthenticated     ErrorCode = "unauthenticated"
	ErrWrongAccount        ErrorCode = "wrong_account"
	ErrForbidden           ErrorCode = "forbidden"
	ErrEntitlementRequired ErrorCode = "entitlement_required"
	ErrNotFound            ErrorCode = "not_found"
	ErrConflict            ErrorCode = "conflict"
	ErrInvalid             ErrorCode = "invalid"
	ErrUnavailable         ErrorCode = "unavailable"
)

type errorDef struct {
	status  int
	message string
}

var serviceErrors = map[ErrorCode]errorDef{
	ErrUnauthenticated:     {http.StatusUnauthorized, "Sign in to continue."},
	ErrWrongAccount:        {http.StatusForbidden, "This account cannot use this app."},
	ErrForbidden:           {http.StatusForbidden, "You do not have access to this."},
	ErrEntitlementRequired: {http.StatusForbidden, "This club does not have an active license."},
	ErrNotFound:            {http.StatusNotFound, "Not found."},
	ErrConflict:            {http.StatusConflict, "This changed since you loaded it. Refresh and try again."},
	ErrInvalid:             {http.StatusUnprocessableEntity, "Check the details and try again."},
	ErrUnavailable:         {http.StatusServiceUnavailable, "This is not available right now."},
}

// ErrorCodes lists every service error code.
func ErrorCodes() []ErrorCode {
	codes := make([]ErrorCode, 0, len(serviceErrors))
	for c := range serviceErrors {
		codes = append(codes, c)
	}
	return codes
}

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// WriteError writes `{ error: { code, message, fields? } }` with the code's status. The response is
// private and never cached. An unknown code is answered as the unexpected-error body.
func WriteError(w http.ResponseWriter, code ErrorCode, fields map[string]string) {
	def, ok := serviceErrors[code]
	if !ok {
		WriteInternal(w)
		return
	}
	WriteJSON(w, def.status, errorBody{Error: errorDetail{Code: string(code), Message: def.message, Fields: fields}}, Private)
}

// WriteInternal writes the body handler.ts sends for any non-ServiceError. Details go to the log, never the wire.
func WriteInternal(w http.ResponseWriter) {
	WriteJSON(w, http.StatusInternalServerError,
		errorBody{Error: errorDetail{Code: "internal", Message: "Something went wrong."}}, Private)
}

// Visibility picks the cache headers handler.ts uses.
type Visibility int

const (
	// Private responses never enter a shared cache and vary by the session cookie.
	Private Visibility = iota
	// Public is for the allowlisted public reads.
	Public
)

// WriteJSON writes body as JSON with the Route Handler headers for the visibility.
func WriteJSON(w http.ResponseWriter, status int, body any, v Visibility) {
	payload, err := json.Marshal(body)
	if err != nil {
		status, payload, v = http.StatusInternalServerError,
			[]byte(`{"error":{"code":"internal","message":"Something went wrong."}}`), Private
	}
	h := w.Header()
	if v == Public {
		h.Set("Cache-Control", "public, max-age=0, must-revalidate")
	} else {
		h.Set("Cache-Control", "private, no-store")
		h.Set("Vary", "Cookie")
	}
	h.Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(payload)
}
