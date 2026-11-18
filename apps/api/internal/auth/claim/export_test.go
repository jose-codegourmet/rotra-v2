package claim

// SetAfterLinkRead installs the test seam and returns its reset.
func SetAfterLinkRead(f func(stage string)) func() {
	afterLinkRead = f
	return func() { afterLinkRead = nil }
}
