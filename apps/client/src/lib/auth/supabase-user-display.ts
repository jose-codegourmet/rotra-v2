import type { User as AuthUser } from "@supabase/supabase-js";

export function displayNameFromAuthUser({
	user,
	loading = false,
}: {
	user?: AuthUser | null;
	loading?: boolean;
}): string {
	return loading ? "…" : user ? _getDisplayName(user) : "Player";
}

function _getDisplayName(user: AuthUser): string {
	const meta = user.user_metadata as Record<string, unknown>;
	const full = meta.full_name ?? meta.name;
	if (typeof full === "string" && full.trim()) {
		return full.trim();
	}
	if (user.email) {
		return user.email;
	}
	return "Player";
}

/**
 * Facebook Graph user id for `profiles.facebook_id`, aligned with the DB trigger
 * (`raw_user_meta_data->>'provider_id'`).
 */
export function facebookIdFromAuthUser(user: AuthUser): string | null {
	const meta = user.user_metadata as Record<string, unknown>;
	const direct = meta.provider_id;
	if (typeof direct === "string" && direct.trim()) {
		return direct.trim();
	}
	for (const identity of user.identities ?? []) {
		if (identity.provider !== "facebook") continue;
		const raw = identity.identity_data;
		if (raw && typeof raw === "object") {
			const sub = (raw as { sub?: unknown }).sub;
			if (typeof sub === "string" && sub.trim()) {
				return sub.trim();
			}
		}
	}
	return null;
}

export function avatarUrlFromAuthUser(user: AuthUser): string | null {
	const meta = user.user_metadata as Record<string, unknown>;
	const avatar = meta.avatar_url ?? meta.picture;
	if (typeof avatar === "string" && avatar.startsWith("http")) {
		return avatar;
	}
	if (
		avatar &&
		typeof avatar === "object" &&
		avatar !== null &&
		"url" in avatar &&
		typeof (avatar as { url: string }).url === "string"
	) {
		const u = (avatar as { url: string }).url;
		return u.startsWith("http") ? u : null;
	}
	return null;
}

/** Minimal profile fields for display; DB wins over auth metadata. */
export type ProfileDisplaySource =
	| { name?: string | null; avatarUrl?: string | null }
	| null
	| undefined;

/**
 * Display name: `profiles.name` when present, else Facebook / email from auth user.
 */
export function displayName({
	profile,
	user,
	loading = false,
}: {
	profile?: ProfileDisplaySource;
	user?: AuthUser | null;
	loading?: boolean;
}): string {
	if (loading) return "…";
	const fromProfile = profile?.name?.trim();
	if (fromProfile) return fromProfile;
	return user ? _getDisplayName(user) : "Player";
}

/**
 * Avatar URL: `profiles.avatar_url` when a valid http(s) URL, else auth metadata.
 */
export function avatarUrl({
	profile,
	user,
}: {
	profile?: ProfileDisplaySource;
	user?: AuthUser | null;
}): string | null {
	const fromProfile = profile?.avatarUrl;
	if (typeof fromProfile === "string" && fromProfile.startsWith("http")) {
		return fromProfile;
	}
	return user ? avatarUrlFromAuthUser(user) : null;
}
