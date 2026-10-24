import type { Metadata } from "next";

import { MOCK_CLUB } from "@/constants/mock-club";

export const metadata: Metadata = {
	title: "Club rules — ROTRA",
	description: "Club rules and policies.",
};

export default async function ClubRulesPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<p className="text-micro font-bold uppercase tracking-widest text-accent mb-1">
					Official handbook
				</p>
				<h1 className="text-title font-bold text-text-primary tracking-tight">
					{MOCK_CLUB.name} — Rules
				</h1>
			</div>

			<ul className="flex flex-col gap-4">
				{MOCK_CLUB.rules.map((rule) => (
					<li
						key={rule.title}
						className="rounded-lg border border-border border-l-2 border-l-accent bg-bg-surface p-4 shadow-card"
					>
						<h2 className="text-body font-bold text-text-primary mb-2">
							{rule.title}
						</h2>
						<p className="text-body text-text-secondary leading-relaxed">
							{rule.body}
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}
