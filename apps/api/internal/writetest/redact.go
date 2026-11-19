package writetest

import (
	"fmt"
	"strings"
)

// Redacted is what a generated value reads after its path is redacted.
const Redacted = "<redacted>"

// RedactPaths replaces the value at each dotted path of v (a decoded JSON document) with Redacted. A "*" segment
// is every element of an array. A path that matches nothing, or matches null, is an error: a redaction that no longer
// applies must be removed, not left to hide a change.
func RedactPaths(v any, paths []string) error {
	for _, p := range paths {
		n, err := redactAt(v, strings.Split(p, "."))
		if err != nil {
			return fmt.Errorf("redacting %q: %w", p, err)
		}
		if n == 0 {
			return fmt.Errorf("redacting %q: no value there", p)
		}
	}
	return nil
}

func redactAt(v any, path []string) (int, error) {
	head, rest := path[0], path[1:]
	switch node := v.(type) {
	case map[string]any:
		child, ok := node[head]
		if !ok || child == nil {
			return 0, nil
		}
		if len(rest) == 0 {
			node[head] = Redacted
			return 1, nil
		}
		return redactAt(child, rest)
	case []any:
		if head != "*" {
			return 0, fmt.Errorf("segment %q is applied to an array: use *", head)
		}
		total := 0
		for i, el := range node {
			if len(rest) == 0 {
				if el != nil {
					node[i] = Redacted
					total++
				}
				continue
			}
			n, err := redactAt(el, rest)
			if err != nil {
				return 0, err
			}
			total += n
		}
		return total, nil
	}
	return 0, nil
}

// RedactColumns replaces the value of each named column in every row with Redacted when it is not null. A row
// without the column is an error (an empty table has nothing to redact).
func RedactColumns(rows []any, columns []string) error {
	for _, c := range columns {
		for _, row := range rows {
			m, ok := row.(map[string]any)
			if !ok {
				return fmt.Errorf("row is not an object")
			}
			v, has := m[c]
			if !has {
				return fmt.Errorf("column %q is not in the row", c)
			}
			if v != nil {
				m[c] = Redacted
			}
		}
	}
	return nil
}
