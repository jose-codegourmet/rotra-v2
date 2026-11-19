package register

// SetAfterStage installs the seam that runs between the staging and the claim; the returned function removes it.
func SetAfterStage(f func()) func() {
	afterStage = f
	return func() { afterStage = nil }
}
