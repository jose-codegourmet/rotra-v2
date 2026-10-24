import { Package } from "lucide-react";
import { MOCK_PLAYER } from "@/constants/mock-player";
import type { ProfileViewUser } from "@/types/profile-view-user";

interface CurrentGearCardProps {
	user: ProfileViewUser;
}
export function CurrentGearCard({ user }: CurrentGearCardProps) {
	const player = MOCK_PLAYER;
	console.warn("[TODO] CurrentGearCard for user = ", user);
	return (
		<div className="bg-bg-surface rounded-xl p-6">
			<h3 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
				<Package size={14} className="text-accent shrink-0" strokeWidth={1.5} />
				Current Gear
			</h3>
			<div className="space-y-3">
				{player.gear.flatMap((category) =>
					category.items.map((item) => (
						<div
							key={`${category.category}-${item.title}`}
							className="flex items-center gap-4 bg-bg-elevated p-3 rounded-lg border-l-2 border-accent"
						>
							<div className="w-10 h-10 rounded bg-bg-overlay flex items-center justify-center shrink-0">
								<span className="text-[10px] font-black uppercase text-text-disabled">
									{category.category.slice(0, 3)}
								</span>
							</div>
							<div>
								<p className="text-[10px] text-text-secondary uppercase font-bold">
									{category.category}
								</p>
								<p className="text-xs font-bold text-text-primary">
									{item.brand} {item.model}
								</p>
							</div>
						</div>
					)),
				)}
			</div>
		</div>
	);
}
