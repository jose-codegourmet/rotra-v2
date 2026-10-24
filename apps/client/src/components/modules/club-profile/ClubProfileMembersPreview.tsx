import type { ClubMemberRow } from "@/constants/mock-club";

import { cn } from "@/lib/utils";

function RoleBadge({ role }: { role: ClubMemberRow["role"] }) {
	const label =
		role === "que_master"
			? "Que Master"
			: role === "owner"
				? "Owner"
				: "Member";
	const className =
		role === "owner"
			? "text-text-primary"
			: role === "que_master"
				? "text-accent"
				: "text-text-secondary";
	return (
		<span
			className={cn(
				"text-micro font-bold uppercase tracking-widest",
				className,
			)}
		>
			{label}
		</span>
	);
}

export function ClubProfileMembersPreview({ rows }: { rows: ClubMemberRow[] }) {
	return (
		<div className="flex flex-col gap-3">
			<p className="text-small text-text-secondary leading-relaxed">
				Public view: club owner, all Que Masters, and a sample of members. Join
				the club to see the full roster.
			</p>
			<ul className="flex flex-col gap-2">
				{rows.map((row) => (
					<li
						key={row.id}
						className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-surface px-4 py-3"
					>
						<div className="flex flex-col gap-0.5 min-w-0">
							<span className="text-body font-semibold text-text-primary truncate">
								{row.name}
							</span>
							<span className="text-small text-text-secondary truncate">
								{row.email}
							</span>
						</div>
						<RoleBadge role={row.role} />
					</li>
				))}
			</ul>
		</div>
	);
}
