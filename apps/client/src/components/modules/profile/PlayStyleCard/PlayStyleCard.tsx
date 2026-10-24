import { Zap } from "lucide-react";
import { MOCK_PLAYER } from "@/constants/mock-player";
import type { ProfileViewUser } from "@/types/profile-view-user";

interface PlayStyleCardProps {
	user: ProfileViewUser;
}

export function PlayStyleCard({ user }: PlayStyleCardProps) {
	console.warn("[TODO] PlayStyleCard for user = ", user);
	const player = MOCK_PLAYER;
	return (
		<div className="bg-bg-surface rounded-xl p-6">
			<h3 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
				<Zap size={14} className="text-accent shrink-0" strokeWidth={2} />
				Play Style
			</h3>
			<div className="flex flex-wrap gap-2">
				{player.playStyle.map((tag) => (
					<span
						key={tag}
						className="px-3 py-1 bg-bg-elevated border border-white/5 rounded text-[10px] font-bold uppercase tracking-widest text-text-primary hover:bg-accent hover:text-bg-base transition-colors duration-default cursor-default"
					>
						{tag}
					</span>
				))}
			</div>
		</div>
	);
}
