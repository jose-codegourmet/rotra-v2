import { CalendarClock, MapPin, MoreVertical } from "lucide-react";
import type { Metadata } from "next";

import { MOCK_CLUB } from "@/constants/mock-club";

export const metadata: Metadata = {
	title: "Club overview — ROTRA",
	description: "Club overview, mission, and upcoming sessions.",
};

export default async function ClubOverviewPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<div className="flex items-start justify-between gap-4">
					<h1 className="text-display font-bold text-text-primary tracking-tight">
						{MOCK_CLUB.name}
					</h1>
					<button
						type="button"
						className="text-text-disabled hover:text-text-primary transition-colors duration-default mt-1"
						aria-label="More options"
					>
						<MoreVertical size={20} strokeWidth={1.5} />
					</button>
				</div>

				<div className="flex items-center gap-1 text-body text-text-secondary">
					<MapPin size={15} strokeWidth={1.5} className="shrink-0" />
					<span>{MOCK_CLUB.location}</span>
				</div>

				<div className="flex items-center gap-2 text-small text-text-secondary flex-wrap">
					<span className="px-2 py-0.5 bg-accent/10 text-accent text-micro font-bold uppercase tracking-widest rounded-full">
						{MOCK_CLUB.status}
					</span>
					<span>· Est. {MOCK_CLUB.founded}</span>
				</div>
			</div>

			<div className="h-px bg-border" />

			<div className="bg-bg-surface border border-border rounded-lg p-4 shadow-card border-l-2 border-l-accent">
				<p className="text-micro font-bold uppercase tracking-widest text-accent mb-2">
					Mission
				</p>
				<p className="text-body text-text-secondary leading-relaxed italic">
					{MOCK_CLUB.mission}
				</p>
				<div className="flex flex-wrap gap-2 mt-4">
					{MOCK_CLUB.tags.map((tag) => (
						<span
							key={tag}
							className="rounded-full border border-border bg-bg-base px-3 py-1 text-micro font-bold uppercase tracking-widest text-text-secondary"
						>
							{tag}
						</span>
					))}
				</div>
			</div>

			<p className="text-body text-text-secondary leading-relaxed">
				{MOCK_CLUB.description}
			</p>

			<div className="flex flex-col gap-3">
				<p className="text-small font-bold uppercase tracking-widest text-text-secondary">
					Upcoming sessions
				</p>
				{MOCK_CLUB.upcomingSessions.length > 0 ? (
					MOCK_CLUB.upcomingSessions.map((session) => (
						<div
							key={session.id}
							className="bg-bg-surface border border-border rounded-lg p-4 shadow-card flex items-center justify-between cursor-pointer hover:bg-bg-elevated transition-colors duration-default"
						>
							<div className="flex flex-col gap-1">
								<p className="text-body font-semibold text-text-primary">
									{session.date}
								</p>
								<div className="flex items-center gap-1 text-small text-text-secondary">
									<CalendarClock size={13} strokeWidth={1.5} />
									<span>
										{session.venue} · {session.time}
									</span>
								</div>
							</div>
							<span
								className={`text-small font-bold ${
									session.slots > 0 ? "text-accent" : "text-text-disabled"
								}`}
							>
								{session.slots}/{session.total} slots
							</span>
						</div>
					))
				) : (
					<p className="text-small text-text-disabled">No upcoming sessions.</p>
				)}
			</div>

			<div className="flex items-center gap-2 text-small text-text-secondary pt-2">
				<div className="size-6 rounded-full bg-bg-elevated flex items-center justify-center text-micro font-bold text-text-secondary">
					{MOCK_CLUB.owner.initials}
				</div>
				<span>
					Owned by{" "}
					<span className="text-text-primary font-medium">
						{MOCK_CLUB.owner.name}
					</span>
				</span>
			</div>
		</div>
	);
}
