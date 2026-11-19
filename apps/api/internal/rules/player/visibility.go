package player

// The profile visibility levels (players.profile_visibility).
const (
	VisibilityPublic        = "public"
	VisibilityPrivate       = "private"
	VisibilityAlwaysPrivate = "always_private"
)

// NameViewer is who is looking at a name. QueueMaster is the Queue Master of a session the player joined.
type NameViewer struct{ SignedIn, IsSelf, QueueMaster bool }

// IsNameMasked is isNameMasked (D-2026-11-12-01): whether another person sees this player's name masked. Public is never
// masked. Private is masked for visitors who are not signed in. Always private is masked for everyone except the player and
// the Queue Master of a session they joined. The picture and banner are never masked by this rule.
func IsNameMasked(visibility string, v NameViewer) bool {
	if v.IsSelf {
		return false
	}
	switch visibility {
	case VisibilityAlwaysPrivate:
		return !v.QueueMaster
	case VisibilityPrivate:
		return !v.SignedIn
	}
	return false
}

// DirectoryProfile is the part of a profile Hide me from Player Information reads.
type DirectoryProfile struct{ HiddenFromDirectory bool }

// IsListedInDirectory is isListedInDirectory: a profile is listed unless its switch is on. No profile is listed.
func IsListedInDirectory(profile *DirectoryProfile) bool {
	return profile == nil || !profile.HiddenFromDirectory
}
