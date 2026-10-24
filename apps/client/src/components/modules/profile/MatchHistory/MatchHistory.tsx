import Link from "next/link";
import { MatchCard } from "@/components/modules/profile/MatchCard/MatchCard";
import { MOCK_PLAYER } from "@/constants/mock-player";
import type { ProfileViewUser } from "@/types/profile-view-user";

interface MatchHistoryProps {
	user: ProfileViewUser;
	maxMatchPerView: number;
	viewAllHref?: string;
}

export function MatchHistory({
	user,
	maxMatchPerView,
	viewAllHref,
}: MatchHistoryProps) {
	console.warn("[TODO] MatchHistory for user = ", user);
	const player = MOCK_PLAYER;
	const visibleMatches = player.recentMatches.slice(0, maxMatchPerView);

	return (
		<section>
			<div className="flex justify-between items-end mb-6">
				<h3 className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
					Recent Match Performance
				</h3>
				{viewAllHref ? (
					<Link
						href={viewAllHref}
						className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
					>
						View All Matches
					</Link>
				) : (
					<button
						type="button"
						className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
					>
						View All Matches
					</button>
				)}
			</div>

			<div className="space-y-2">
				{visibleMatches.map((match) => (
					<MatchCard key={match.id} match={match} />
				))}
			</div>
		</section>
	);
}
