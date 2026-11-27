package match

import "testing"

func TestCategory(t *testing.T) {
	m, f := "male", "female"
	cases := []struct {
		name string
		a, b []string
		want string
	}{
		{"nobody", nil, nil, "Genderless"},
		{"all men", []string{m, m}, []string{m, m}, "Men's"},
		{"all women singles", []string{f}, []string{f}, "Women's"},
		{"mixed", []string{m, f}, []string{f, m}, "Mixed"},
		{"one side mixed", []string{m, f}, []string{m, m}, "Genderless"},
		{"men against women", []string{m, m}, []string{f, f}, "Genderless"},
		{"not given", []string{m, ""}, []string{m, m}, "Genderless"},
		{"mixed singles", []string{m}, []string{f}, "Genderless"},
	}
	for _, c := range cases {
		if got := Category(c.a, c.b); got != c.want {
			t.Errorf("%s: %s, want %s", c.name, got, c.want)
		}
	}
}

func TestLabel(t *testing.T) {
	gender := map[string]string{"a": "male", "b": "female", "c": "female", "d": "male"}
	got := Label("doubles", []string{"a", "b"}, []string{"c", "d"}, func(id string) string { return gender[id] })
	if got != "Mixed Doubles" {
		t.Errorf("got %q", got)
	}
	if got := Label("fun_3v3", []string{"a", "x"}, []string{"d"}, func(id string) string { return gender[id] }); got != "Genderless 3v3 fun" {
		t.Errorf("got %q", got)
	}
}
