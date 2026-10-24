import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { ClubScheduleCalendarPlaceholder } from "@/components/modules/club-profile/ClubScheduleCalendarPlaceholder";
import { MOCK_CLUB } from "@/constants/mock-club";

export const metadata: Metadata = {
	title: "Club schedule — ROTRA",
	description: "Club schedule and venues.",
};

export default async function ClubSchedulePage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-title font-bold text-text-primary tracking-tight mb-2">
					Schedule
				</h1>
				<p className="text-body text-text-secondary max-w-2xl">
					{MOCK_CLUB.scheduleSummary}
				</p>
			</div>

			<ClubScheduleCalendarPlaceholder />

			<div>
				<h2 className="text-small font-bold uppercase tracking-widest text-accent mb-4">
					Courts & addresses
				</h2>
				<ul className="flex flex-col gap-4">
					{MOCK_CLUB.venues.map((v) => (
						<li
							key={v.name}
							className="rounded-lg border border-border bg-bg-surface p-4 shadow-card"
						>
							<p className="text-body font-semibold text-text-primary mb-1">
								{v.name}
							</p>
							<div className="flex items-start gap-2 text-small text-text-secondary mb-2">
								<MapPin
									size={14}
									strokeWidth={1.5}
									className="shrink-0 mt-0.5"
								/>
								<span>{v.address}</span>
							</div>
							{v.timeWindows && (
								<p className="text-small text-text-primary font-medium">
									{v.timeWindows}
								</p>
							)}
							{v.note && (
								<p className="text-small text-text-secondary mt-2">{v.note}</p>
							)}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
