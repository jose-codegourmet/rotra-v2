package sessionresult

import (
	"encoding/json"
	"reflect"
)

// SharePositions is sharePositions (packages/data/src/match/match.rules.ts, D-2026-11-18-05 amended November 19, 2026): players with the
// same wins and the same losses share one position, and the next record takes the next number (1, 1, 2). The rows must already be in
// standings order. It is also applied when showing saved standings, so results saved before shared positions (unique 1, 2, 3) or with gaps
// (1, 1, 3) show the same way; the saved rows never change. A value that is not a list of rows is returned as it is.
func SharePositions(raw []byte) []byte {
	var rows []json.RawMessage
	if json.Unmarshal(raw, &rows) != nil || rows == nil {
		return raw
	}
	out := make([]json.RawMessage, len(rows))
	var above map[string]any
	position := 0
	for i, row := range rows {
		var v map[string]any
		if json.Unmarshal(row, &v) != nil || v == nil {
			out[i] = row
			continue
		}
		switch {
		case above == nil:
			position = 1
		case !reflect.DeepEqual(above["wins"], v["wins"]) || !reflect.DeepEqual(above["losses"], v["losses"]):
			position++
		}
		v["position"] = position
		above = v
		b, err := json.Marshal(v)
		if err != nil {
			return raw
		}
		out[i] = b
	}
	b, err := json.Marshal(out)
	if err != nil {
		return raw
	}
	return b
}
