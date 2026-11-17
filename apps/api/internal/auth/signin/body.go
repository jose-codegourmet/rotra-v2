package signin

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// maxBody is far more than any of these bodies needs; anything larger is read as {}.
const maxBody = 16 << 10

// maxDeviceLabel bounds the label stored with a device and a session (runes).
const maxDeviceLabel = 100

// readObject reads a JSON object body the way the route handlers do (`(await request.json().catch(() => null))
// ?? {}`, route.ts:5): anything that is not a JSON object, including unparseable text, is {}.
func readObject(r *http.Request) map[string]any {
	raw, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBody))
	if err != nil {
		return map[string]any{}
	}
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return map[string]any{}
	}
	m, ok := v.(map[string]any)
	if !ok || m == nil {
		return map[string]any{}
	}
	return m
}

func str(m map[string]any, key string) (string, bool) {
	s, ok := m[key].(string)
	return s, ok
}

// deviceID reads the optional Queue device id. A value that is not a canonical UUID is ignored: the sign-in
// goes ahead without enrolling a device.
func deviceID(m map[string]any) *uuid.UUID {
	s, ok := str(m, "deviceId")
	if !ok || len(s) != 36 {
		return nil
	}
	id, err := uuid.Parse(s)
	if err != nil || id == uuid.Nil {
		return nil
	}
	return &id
}

// deviceLabel cleans the optional device label: no NUL (Postgres refuses it in text), at most maxDeviceLabel
// runes. Blank stays blank and becomes "This device" in the session service.
func deviceLabel(m map[string]any) string {
	s, _ := str(m, "deviceLabel")
	s = strings.TrimSpace(strings.ReplaceAll(s, "\x00", ""))
	if r := []rune(s); len(r) > maxDeviceLabel {
		s = strings.TrimSpace(string(r[:maxDeviceLabel]))
	}
	return s
}

// parseID reads a canonical UUID.
func parseID(s string) (uuid.UUID, error) { return uuid.Parse(s) }
