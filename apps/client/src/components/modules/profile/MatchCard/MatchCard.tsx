import { CheckCircle2, XCircle } from "lucide-react";

import { MatchDateBlock } from "../MatchDateBlock/MatchDateBlock";

export interface Match {
	id: string;
	date: string;
	result: "W" | "L";
	resultLabel: string;
	yourTeam: string;
	yourTeamLabel: string;
	opponents: string;
	opponentsLabel: string;
	score: string;
	club: string;
}

interface MatchCardProps {
	match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
	return (
		<div className="bg-bg-surface hover:bg-bg-elevated transition-colors p-4 rounded-xl flex items-center justify-between group">
			{/* Left: date + teams */}
			<div className="flex items-center gap-6">
				<MatchDateBlock date={match.date} />

				{/* Teams + score chip */}
				<div className="flex items-center gap-4">
					<div className="text-right">
						<p className="text-xs font-bold text-text-primary">
							{match.yourTeam}
						</p>
						<p className="text-[9px] text-text-secondary uppercase tracking-tighter">
							{match.yourTeamLabel}
						</p>
					</div>
					<div className="px-2 py-1 bg-bg-overlay rounded font-black text-[11px] text-text-primary group-hover:bg-accent group-hover:text-bg-base transition-colors duration-default shrink-0">
						{match.score}
					</div>
					<div className="text-left">
						<p className="text-xs font-bold text-text-secondary">
							{match.opponents}
						</p>
						<p className="text-[9px] text-text-secondary uppercase tracking-tighter">
							{match.opponentsLabel}
						</p>
					</div>
				</div>
			</div>

			{/* Right: result */}
			<div className="flex items-center gap-6 shrink-0">
				<div className="text-right">
					<span
						className={`block text-[10px] font-black uppercase tracking-widest ${
							match.result === "W" ? "text-accent" : "text-error"
						}`}
					>
						{match.resultLabel}
					</span>
					<span className="text-[10px] text-text-secondary uppercase font-bold">
						{match.club}
					</span>
				</div>
				{match.result === "W" ? (
					<CheckCircle2
						size={20}
						strokeWidth={1.5}
						className="text-accent shrink-0"
					/>
				) : (
					<XCircle
						size={20}
						strokeWidth={1.5}
						className="text-text-disabled/30 shrink-0"
					/>
				)}
			</div>
		</div>
	);
}
