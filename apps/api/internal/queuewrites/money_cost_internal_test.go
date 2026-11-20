package queuewrites

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The filter of normalizeSessionCost keeps a shuttle plan line when `line.tubes > 0`, whatever JSON value the tubes are. The golden file is
// captured from JavaScript (testdata/tools/capture-jsnumber.mjs).
func TestJSToNumberAgainstJavaScript(t *testing.T) {
	raw, err := os.ReadFile("testdata/jsnumber.golden.json")
	if err != nil {
		t.Fatal(err)
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var grid []struct {
		Value  any  `json:"value"`
		GtZero bool `json:"gtZero"`
	}
	if err := dec.Decode(&grid); err != nil {
		t.Fatal(err)
	}
	if len(grid) < 60 {
		t.Fatalf("only %d values", len(grid))
	}
	for _, c := range grid {
		if got := jsToNumber(c.Value) > 0; got != c.GtZero {
			t.Errorf("%#v > 0: %v, JavaScript says %v", c.Value, got, c.GtZero)
		}
	}
}

func parseJSON(t *testing.T, text string) any {
	t.Helper()
	dec := json.NewDecoder(bytes.NewReader([]byte(text)))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

// normalizeCost reads the estimate as JavaScript does: what is no estimate, what is a TypeError, what is dropped, and what is kept.
func TestNormalizeCost(t *testing.T) {
	for _, falsy := range []string{`null`, `false`, `0`, `""`} {
		if v, err := normalizeCost(parseJSON(t, falsy)); v != nil || err != nil {
			t.Errorf("%s: %+v, %v; want no estimate", falsy, v, err)
		}
	}
	for _, crash := range []string{`true`, `5`, `"x"`, `[]`, `{}`, `{"shuttles":null}`, `{"shuttles":"abc"}`, `{"shuttles":{}}`, `{"shuttles":[null]}`} {
		if _, err := normalizeCost(parseJSON(t, crash)); !errors.Is(err, errTypeError) {
			t.Errorf("%s: %v, want a TypeError", crash, err)
		}
	}
	// Nothing sent but the list and the mode keeps an estimate, because a missing fee is undefined, not null; null fees, no line and
	// break-even mode is no estimate.
	if v, err := normalizeCost(parseJSON(t, `{"shuttles":[],"paymentMode":"break_even"}`)); v == nil || err != nil || v.court.defined {
		t.Errorf("missing fees: %+v, %v", v, err)
	}
	if v, err := normalizeCost(parseJSON(t, `{"courtFeePerCourtHour":null,"entranceFeePerHead":null,"shuttles":[5,"x",[],true,{"tubes":2},{"inventoryItemId":"a","tubes":0}],"paymentMode":"break_even"}`)); v != nil || err != nil {
		t.Errorf("empty estimate: %+v, %v", v, err)
	}
	v, err := normalizeCost(parseJSON(t, `{"courtFeePerCourtHour":0,"shuttles":[{"inventoryItemId":"a","tubes":"3"},{"inventoryItemId":"b","tubes":-1}],"paymentMode":"custom","customFeePerHead":5}`))
	if err != nil || v == nil || len(v.lines) != 1 || v.lines[0].item != "a" || v.custom.value == nil {
		t.Errorf("kept estimate: %+v, %v", v, err)
	}
	// A custom fee is kept in custom mode only.
	if v, _ := normalizeCost(parseJSON(t, `{"courtFeePerCourtHour":1,"shuttles":[],"paymentMode":"break_even","customFeePerHead":5}`)); v == nil || v.custom.value != nil || !v.custom.defined {
		t.Errorf("break-even custom fee: %+v", v)
	}
}

// centavos is the amount check of saveSessionCost.
func TestCentavos(t *testing.T) {
	for _, ok := range []string{`0`, `1`, `35000`, `9007199254740991`} {
		if f, set, err := centavos(jsValue{defined: true, value: parseJSON(t, ok)}, "x", true); err != nil || !set {
			t.Errorf("%s: %v %v %v", ok, f, set, err)
		}
	}
	for _, bad := range []string{`-1`, `1.5`, `"5"`, `true`, `[]`, `{}`, `9007199254740992`, `1e400`} {
		_, _, err := centavos(jsValue{defined: true, value: parseJSON(t, bad)}, "x", true)
		var se *writes.Error
		if !errors.As(err, &se) || se.Fields["x"] != "Enter an amount of zero or more." {
			t.Errorf("%s: %v", bad, err)
		}
	}
	if _, set, err := centavos(jsValue{}, "x", true); set || err != nil {
		t.Errorf("undefined with nulls allowed: %v %v", set, err)
	}
	if _, _, err := centavos(jsValue{defined: true}, "x", false); err == nil {
		t.Error("null with no nulls allowed must be refused")
	}
}
