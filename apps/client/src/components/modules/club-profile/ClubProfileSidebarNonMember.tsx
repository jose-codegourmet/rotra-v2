"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MOCK_CLUB } from "@/constants/mock-club";

export function ClubProfileSidebarNonMember({ clubId }: { clubId: string }) {
	const searchParams = useSearchParams();
	const qs = searchParams.toString();
	const q = qs ? `?${qs}` : "";

	return (
		<div className="flex flex-col gap-4 lg:sticky lg:top-24">
			<div className="bg-bg-surface border border-border rounded-lg p-4 shadow-card">
				<p className="text-small font-bold uppercase tracking-widest text-text-secondary mb-3">
					Club stats
				</p>
				<div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
					{[
						{ label: "Members", value: MOCK_CLUB.stats.members },
						{ label: "Que Masters", value: MOCK_CLUB.stats.queMasters },
						{ label: "Sessions", value: MOCK_CLUB.stats.sessions },
					].map((stat) => (
						<div
							key={stat.label}
							className="bg-bg-base border border-border rounded-lg p-3 flex lg:flex-row flex-col lg:items-center lg:justify-between gap-1"
						>
							<span className="text-small text-text-secondary uppercase tracking-widest">
								{stat.label}
							</span>
							<span className="text-title font-semibold text-text-primary">
								{stat.value}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="bg-bg-surface border border-border rounded-lg p-4 shadow-card">
				<p className="text-small font-bold uppercase tracking-widest text-text-secondary mb-3">
					Members
				</p>
				<div className="flex items-center">
					{MOCK_CLUB.members.map((initial, i) => (
						<div
							key={i}
							className="size-9 rounded-full bg-bg-elevated border-2 border-bg-base flex items-center justify-center text-small font-bold text-text-secondary -ml-2 first:ml-0"
						>
							{initial}
						</div>
					))}
					{MOCK_CLUB.totalMembers > MOCK_CLUB.members.length && (
						<div className="size-9 rounded-full bg-bg-elevated border-2 border-bg-base flex items-center justify-center text-small font-bold text-text-secondary -ml-2">
							+{MOCK_CLUB.totalMembers - MOCK_CLUB.members.length}
						</div>
					)}
				</div>
			</div>

			<div className="bg-bg-surface border border-border rounded-lg p-4 shadow-card">
				<button
					type="button"
					className="w-full h-12 flex items-center justify-center text-small font-black uppercase tracking-widest text-bg-base bg-accent rounded-md hover:opacity-90 transition-opacity duration-default"
				>
					Request to Join
				</button>
				<p className="text-micro text-text-disabled text-center mt-3">
					Join flow is UI-only for now.
				</p>
			</div>

			<div className="hidden lg:block">
				<Link
					href={`/clubs/${clubId}/members${q}`}
					className="text-small font-bold uppercase tracking-widest text-accent hover:underline"
				>
					View public roster preview →
				</Link>
			</div>
		</div>
	);
}
