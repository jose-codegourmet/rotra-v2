import { PlayerIdentity } from "@/components/modules/profile/PlayerIdentity/PlayerIdentity";
import { TierStrip } from "@/components/modules/profile/TierStrip/TierStrip";
import {
	avatarUrlFromAuthUser,
	displayNameFromAuthUser,
} from "@/lib/auth/supabase-user-display";
import {
	isSupabaseUser,
	type ProfileViewUser,
} from "@/types/profile-view-user";

interface PlayerHeaderCardProps {
	user: ProfileViewUser;
}
export function PlayerHeaderCard({ user }: PlayerHeaderCardProps) {
	const name = isSupabaseUser(user)
		? displayNameFromAuthUser({ user })
		: user.name;
	const initials = name
		.split(" ")
		.map((name) => name[0])
		.join("");
	const resolvedAvatar = isSupabaseUser(user)
		? avatarUrlFromAuthUser(user)
		: user.avatarUrl;
	return (
		<div className="bg-bg-surface rounded-xl p-8 relative overflow-hidden">
			<div
				className="absolute top-0 right-0 p-4 text-accent/20 text-[60px] rotate-12 select-none pointer-events-none leading-none"
				aria-hidden="true"
			>
				✦
			</div>

			<PlayerIdentity
				name={name}
				initials={initials}
				{...(resolvedAvatar ? { imageUrl: resolvedAvatar } : {})}
				level="IRON 3"
			/>

			<TierStrip tier="Warrior 2" tierPips={{ filled: 2, total: 5 }} />
		</div>
	);
}
