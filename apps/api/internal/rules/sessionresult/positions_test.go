package sessionresult

import (
	"encoding/json"
	"testing"
)

func positionsOf(t *testing.T, raw []byte) []float64 {
	t.Helper()
	var rows []map[string]any
	if err := json.Unmarshal(raw, &rows); err != nil {
		t.Fatal(err)
	}
	out := make([]float64, len(rows))
	for i, r := range rows {
		out[i] = r["position"].(float64)
	}
	return out
}

func TestSharePositions(t *testing.T) {
	cases := map[string]struct {
		in   string
		want []float64
	}{
		"unique saved positions share":  {`[{"wins":3,"losses":0,"position":1},{"wins":2,"losses":1,"position":2},{"wins":2,"losses":1,"position":3}]`, []float64{1, 2, 2}},
		"gaps close":                    {`[{"wins":3,"losses":0,"position":1},{"wins":3,"losses":0,"position":1},{"wins":1,"losses":2,"position":3}]`, []float64{1, 1, 2}},
		"same wins, other losses split": {`[{"wins":2,"losses":0,"position":1},{"wins":2,"losses":1,"position":2}]`, []float64{1, 2}},
		"one row":                       {`[{"wins":0,"losses":0,"position":7}]`, []float64{1}},
	}
	for name, c := range cases {
		got := positionsOf(t, SharePositions([]byte(c.in)))
		for i := range c.want {
			if got[i] != c.want[i] {
				t.Errorf("%s: %v, want %v", name, got, c.want)
				break
			}
		}
	}
	if got := string(SharePositions([]byte(`null`))); got != "null" {
		t.Errorf("null became %s", got)
	}
}
