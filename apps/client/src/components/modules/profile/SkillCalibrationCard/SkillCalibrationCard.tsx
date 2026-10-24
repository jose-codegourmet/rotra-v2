import { SkillRadarChart } from "@/components/modules/profile/SkillRadarChart/SkillRadarChart";
import { MOCK_PLAYER, SKILL_RATINGS } from "@/constants/mock-player";
import { SKILL_DIMENSIONS } from "@/constants/skills";
import type { ProfileViewUser } from "@/types/profile-view-user";

interface SkillCalibrationCardProps {
	user: ProfileViewUser;
}
export function SkillCalibrationCard({ user }: SkillCalibrationCardProps) {
	console.warn("[TODO] SkillCalibrationCard for user = ", user);
	const player = MOCK_PLAYER;
	const radarData = SKILL_DIMENSIONS.map((subject, i) => ({
		subject,
		value: SKILL_RATINGS[i] ?? 0,
		fullMark: 10,
	}));

	return (
		<section className="bg-bg-surface rounded-xl p-8 overflow-hidden relative">
			<div className="flex justify-between items-start mb-8">
				<div>
					<h3 className="text-xl font-black uppercase tracking-tight text-text-primary">
						Skill Calibration
					</h3>
					<p className="text-[11px] text-text-secondary uppercase tracking-widest mt-1">
						Multi-dimensional analysis based on last 50 matches
					</p>
				</div>
				<div className="bg-bg-elevated px-4 py-2 rounded border border-white/5 shrink-0">
					<span className="text-accent font-black text-lg">
						{player.skillOverall}
					</span>
					<span className="text-text-secondary text-[10px] uppercase font-bold ml-1">
						/ 10 Global
					</span>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row items-center gap-12">
				{/* Radar chart */}
				<div className="w-full lg:w-[260px] shrink-0">
					<SkillRadarChart data={radarData} />
				</div>

				{/* Breakdown bars */}
				<div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-8 w-full">
					{SKILL_DIMENSIONS.map((dimension, i) => {
						const value = SKILL_RATINGS[i] ?? 0;
						return (
							<div key={dimension} className="space-y-1">
								<div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
									<span className="text-text-secondary">{dimension}</span>
									<span className="text-text-primary">{value}</span>
								</div>
								<div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
									<div
										className="h-full bg-accent rounded-full"
										style={{ width: `${(value / 10) * 100}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
