import type { Metadata } from "next";

import { MOCK_CLUB } from "@/constants/mock-club";

export const metadata: Metadata = {
	title: "Club announcements — ROTRA",
	description: "Club announcements.",
};

export default async function ClubAnnouncementsPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-title font-bold text-text-primary tracking-tight mb-2">
					Announcements
				</h1>
				<p className="text-body text-text-secondary">
					Updates from {MOCK_CLUB.name}. Owner/QM publishing tools will live in{" "}
					<span className="text-text-primary font-medium">/manage</span> later.
				</p>
			</div>

			<ul className="flex flex-col gap-4">
				{MOCK_CLUB.announcements.map((a) => (
					<li
						key={a.id}
						className="rounded-lg border border-border bg-bg-surface p-4 shadow-card"
					>
						<div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
							<h2 className="text-body font-bold text-text-primary">
								{a.title}
							</h2>
							<span className="text-micro text-text-disabled uppercase tracking-widest">
								{a.date}
							</span>
						</div>
						<p className="text-body text-text-secondary leading-relaxed">
							{a.body}
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}
