package google

// ChallengeOf is the S256 challenge of a verifier, for the RFC 7636 vector.
func ChallengeOf(verifier string) string { return challengeOf(verifier) }
