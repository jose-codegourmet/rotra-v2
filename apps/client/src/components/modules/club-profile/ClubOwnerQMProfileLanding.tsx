import { CalendarClock, MapPin, Settings2 } from "lucide-react";
import Link from "next/link";

import {
	clubDemoQueryString,
	type DemoClubRole,
} from "@/constants/club-demo-role";
import { MOCK_CLUB } from "@/constants/mock-club";

export function ClubOwnerQMProfileLanding({
	clubId,
	role,
	searchParams,
}: {
	clubId: string;
	role: DemoClubRole;
	searchParams: Record<string, string | string[] | undefined>;
}) {
	const q = clubDemoQueryString(searchParams);
	const manageHref = `/clubs/${clubId}/manage/members${q}`;
	const isOwner = role === "owner";

	return (
		<div className="max-w-[1100px] mx-auto p-4 md:p-8">
			<div className="bg-bg-surface border border-border rounded-xl p-6 md:p-8 shadow-card">
				<p className="text-micro font-bold uppercase tracking-widest text-accent mb-2">
					{role === "que_master" ? "Que Master" : "Club Owner"} · Operations
				</p>
				<h1 className="text-display font-bold text-text-primary tracking-tight mb-2">
					{MOCK_CLUB.name}
				</h1>
				<div className="flex items-center gap-1 text-body text-text-secondary mb-6">
					<MapPin size={15} strokeWidth={1.5} className="shrink-0" />
					<span>{MOCK_CLUB.location}</span>
				</div>

				<p className="text-body text-text-secondary leading-relaxed max-w-2xl mb-8">
					You’re using the operator landing. The public tabbed club profile is
					for players and guests. Open club administration to manage members,
					requests, and settings.
				</p>

				<div className="flex flex-col sm:flex-row gap-3 mb-10">
					<Link
						href={manageHref}
						className="inline-flex h-12 items-center justify-center gap-2 px-6 text-small font-black uppercase tracking-widest text-bg-base bg-accent rounded-md shadow-accent hover:opacity-90 transition-opacity"
					>
						<Settings2 size={18} strokeWidth={1.5} />
						Open club administration
					</Link>
				</div>

				<div className="h-px bg-border mb-6" />
				<p className="text-small font-bold uppercase tracking-widest text-text-secondary mb-3">
					Upcoming sessions
				</p>
				<div className="flex flex-col gap-2">
					{MOCK_CLUB.upcomingSessions.slice(0, 2).map((session) => (
						<div
							key={session.id}
							className="flex items-center justify-between rounded-lg border border-border bg-bg-base px-4 py-3"
						>
							<div className="flex flex-col gap-0.5">
								<span className="text-body font-semibold text-text-primary">
									{session.date}
								</span>
								<span className="flex items-center gap-1 text-small text-text-secondary">
									<CalendarClock size={13} strokeWidth={1.5} />
									{session.venue} · {session.time}
								</span>
							</div>
							<span className="text-small font-bold text-accent">
								{session.slots}/{session.total}
							</span>
						</div>
					))}
				</div>

				{isOwner && (
					<p className="text-micro text-text-disabled mt-8 max-w-xl">
						Delete club (owner-only) will route through the admin portal;
						interim contact{" "}
						<span className="text-text-secondary">jose@codegourmet.io</span> —
						UI stub lives in Manage → Settings.
					</p>
				)}
			</div>
		</div>
	);
}
