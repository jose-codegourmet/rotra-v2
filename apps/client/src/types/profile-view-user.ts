import type { User } from "@supabase/supabase-js";

import type { PublicProfileDto } from "@/types/public-profile";

/**
 * Supabase auth user or a minimal public profile payload for shared profile UI.
 */
export type ProfileViewUser =
	| User
	| {
			id: string;
			name: string;
			avatarUrl: string | null;
	  };

export function isSupabaseUser(u: ProfileViewUser): u is User {
	return "user_metadata" in u;
}

export function publicProfileDtoToViewUser(dto: PublicProfileDto): {
	id: string;
	name: string;
	avatarUrl: string | null;
} {
	return {
		id: dto.id,
		name: dto.name,
		avatarUrl: dto.avatarUrl,
	};
}
