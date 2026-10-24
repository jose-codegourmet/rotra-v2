import type {
	CourtCardData,
	NextQueueItem,
	PlayerQueueCardData,
	StandingRow,
} from "@/constants/mock-session-ui";
import { cn } from "@/lib/utils";
import { CourtCard } from "../CourtCard/CourtCard";
import { NextQueueRow } from "../NextQueueRow/NextQueueRow";
import { PlayerQueueCard } from "../PlayerQueueCard/PlayerQueueCard";
import { StandingMiniTable } from "../StandingMiniTable/StandingMiniTable";

export interface ActiveQueueViewProps {
	inGameCourts: CourtCardData[];
	inactiveCourts: CourtCardData[];
	nextQueue: NextQueueItem[];
	standingRows: StandingRow[];
	roster: PlayerQueueCardData[];
	className?: string;
	onAssignCourt?: (courtId: string) => void;
}

function SectionTitle({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"text-micro font-black uppercase tracking-[0.2em] text-text-disabled mb-3",
				className,
			)}
		>
			{children}
		</p>
	);
}

export function ActiveQueueView({
	inGameCourts,
	inactiveCourts,
	nextQueue,
	standingRows,
	roster,
	className,
	onAssignCourt,
}: ActiveQueueViewProps) {
	return (
		<div className={cn("flex flex-col gap-8", className)}>
			<div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
				<div className="flex-1 min-w-0 flex flex-col gap-8">
					<section>
						<SectionTitle>In game courts</SectionTitle>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{inGameCourts.map((court) => (
								<CourtCard key={court.id} court={court} />
							))}
						</div>
					</section>

					<section>
						<SectionTitle>Inactive / maintenance</SectionTitle>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{inactiveCourts.map((court) => (
								<CourtCard
									key={court.id}
									court={court}
									{...(onAssignCourt
										? {
												onAssignClick: () => onAssignCourt(court.id),
											}
										: {})}
								/>
							))}
						</div>
					</section>

					<section>
						<div className="flex items-center justify-between gap-4 mb-3">
							<SectionTitle className="mb-0">
								Next matches in queue
							</SectionTitle>
							<button
								type="button"
								className="text-micro font-bold uppercase tracking-widest text-accent hover:underline shrink-0"
							>
								Manage all
							</button>
						</div>
						<div className="flex flex-col gap-2">
							{nextQueue.map((item) => (
								<NextQueueRow key={item.id} item={item} />
							))}
						</div>
					</section>
				</div>

				<aside className="w-full xl:w-[260px] shrink-0">
					<StandingMiniTable rows={standingRows} viewAllHref="#" />
				</aside>
			</div>

			<section>
				<div className="flex items-center justify-between gap-4 mb-3">
					<SectionTitle className="mb-0">Players in queue</SectionTitle>
					<button
						type="button"
						className="text-micro font-bold uppercase tracking-widest text-accent hover:underline"
					>
						Filter & sort
					</button>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{roster.map((p) => (
						<PlayerQueueCard key={p.id} player={p} />
					))}
				</div>
			</section>
		</div>
	);
}
