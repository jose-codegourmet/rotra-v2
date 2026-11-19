package publicreads

// The signed-in reads (internal/signedin) show the same people and clubs as the public ones and must write them
// the same way, so the few JavaScript-faithful helpers they share are exported here instead of copied.

// UTF16String is a string carried as UTF-16 units (see utf16String).
type UTF16String = utf16String

// ClubInitials is initials() in the TypeScript club and player services.
func ClubInitials(name string) UTF16String { return clubInitials(name) }

// MaskPublicName is maskPublicName() in @rotra/data/public-session/rules.
func MaskPublicName(name string) string { return maskPublicName(name) }

// JSTrim is String.prototype.trim.
func JSTrim(s string) string { return jsTrim(s) }

// QueryValue is URLSearchParams.get over a raw query string: the first value of key, decoded as a browser does.
func QueryValue(rawQuery, key string) (string, bool) { return queryValue(rawQuery, key) }
