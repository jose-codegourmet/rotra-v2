package adminplayer

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	rtrShape = regexp.MustCompile(`^RTR-(.+)-(\d{6})-(\d+)$`)
	ymdShape = regexp.MustCompile(`^(\d{4})-(\d{2})-(\d{2})$`)
	// rtrParts is RTR_PARTS in player-rtr-id.ts: what an RTR ID Admin may set must look like.
	rtrParts = regexp.MustCompile(`^RTR-([A-Z]{2})-([A-Z]{3})-(\d{2})(\d{2})(\d{2})-(\d{4,})$`)
	placeIn  = regexp.MustCompile(`^RTR-(.+)-\d{6}-\d+$`)
)

// RtrPlan is plannedRtrId: an RTR ID to change to, with the parts that go on the records.
type RtrPlan struct {
	From, RtrID, CountryCode, CityCode string
	// SyncDate is YYYY-MM-DD, a real day of 2000 to 2099.
	SyncDate string
	Sequence int64
}

// PlaceCodeFromRtrID is placeCodeFromRtrId: 'RTR-PH-CEB-031526-0001' becomes 'PH-CEB'; "" for none or another shape.
func PlaceCodeFromRtrID(rtrID *string) string {
	if rtrID == nil {
		return ""
	}
	if m := placeIn.FindStringSubmatch(*rtrID); m != nil {
		return m[1]
	}
	return ""
}

// CreatedOnFromRtrID is createdOnFromRtrId: 'RTR-PH-CEB-031526-0001' becomes '2026-03-15' (the date segment is MMDDYY);
// "" when malformed.
func CreatedOnFromRtrID(rtrID string) string {
	parts := strings.Split(rtrID, "-")
	if len(parts) < 4 || len(parts[3]) != 6 || strings.Trim(parts[3], "0123456789") != "" {
		return ""
	}
	seg := parts[3]
	return "20" + seg[4:6] + "-" + seg[0:2] + "-" + seg[2:4]
}

// jsToString is String(value) for a decoded JSON value: what a template string or a regular expression makes of it.
func jsToString(v any) string {
	switch x := v.(type) {
	case nil:
		return "null"
	case string:
		return x
	case bool:
		return strconv.FormatBool(x)
	case []any:
		parts := make([]string, len(x))
		for i, el := range x {
			if el != nil {
				parts[i] = jsToString(el)
			}
		}
		return strings.Join(parts, ",")
	case map[string]any:
		return "[object Object]"
	}
	return jsNumber(v)
}

// jsNumber is the text of a JSON number as JavaScript prints it (the common cases: whole and plain decimal numbers).
func jsNumber(v any) string {
	s, _ := v.(interface{ String() string })
	if s == nil {
		return ""
	}
	f, err := strconv.ParseFloat(s.String(), 64)
	if err != nil {
		return "Infinity"
	}
	return strconv.FormatFloat(f, 'f', -1, 64)
}

// jsTruthy is a JavaScript condition on a decoded JSON value.
func jsTruthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case string:
		return x != ""
	case bool:
		return x
	case []any, map[string]any:
		return true
	}
	f, err := strconv.ParseFloat(jsNumber(v), 64)
	return err != nil || f != 0
}

// RtrIDWith is rtrIdWith (data/src/player/rtrId.ts): the RTR ID after Admin changes the registration place or date. It
// follows both and keeps its number at the end. An incomplete place or date, or an RTR ID of another shape, leaves it as
// it is. place and ymd are the values of the form as decoded (a place that is no string is made a string as a template
// does, and a date that is no string is made one as a regular expression does).
func RtrIDWith(current string, place, ymd any) string {
	m := rtrShape.FindStringSubmatch(current)
	day := ymdShape.FindStringSubmatch(jsToString(ymd))
	if m == nil || !jsTruthy(place) || day == nil {
		return current
	}
	return "RTR-" + jsToString(place) + "-" + day[2] + day[3] + day[1][2:] + "-" + m[3]
}

// PlanRtrID is plannedRtrId with adminPlayerRtrIdChange inside it: the plan for the registration place and date of the
// form, nil when the RTR ID stays as it is. The place and the date are the values as sent; a key that is absent or null
// is the current one. ok is false when the new RTR ID cannot be one: the answer is `invalid` on `registrationDate`
// with the message DateError.
func PlanRtrID(rtrID *string, place, date any) (plan *RtrPlan, ok bool) {
	if rtrID == nil || *rtrID == "" {
		return nil, true
	}
	if place == nil {
		place = PlaceCodeFromRtrID(rtrID)
	}
	if date == nil {
		date = CreatedOnFromRtrID(*rtrID)
	}
	next := RtrIDWith(*rtrID, place, date)
	if next == "" || next == *rtrID {
		return nil, true
	}
	m := rtrParts.FindStringSubmatch(next)
	if m == nil {
		return nil, false
	}
	syncDate := "20" + m[5] + "-" + m[3] + "-" + m[4]
	if day, err := time.Parse("2006-01-02", syncDate); err != nil || day.Format("2006-01-02") != syncDate {
		return nil, false
	}
	seq, err := strconv.ParseInt(m[6], 10, 64)
	if err != nil {
		return nil, false
	}
	return &RtrPlan{From: *rtrID, RtrID: next, CountryCode: m[1], CityCode: m[2], SyncDate: syncDate, Sequence: seq}, true
}

// DateError is the message of an RTR ID that cannot be built from the place and date.
const DateError = "Enter a valid date."
