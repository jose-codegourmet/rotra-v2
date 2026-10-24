"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const triggerClass =
	"inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-label font-bold uppercase tracking-widest transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

const tabs = [
	{ href: "overview", label: "Overview" },
	{ href: "schedule", label: "Schedule" },
	{ href: "rules", label: "Rules" },
	{ href: "members", label: "Members" },
	{ href: "announcements", label: "Announcements" },
] as const;

export function ClubProfileTabNav({ clubId }: { clubId: string }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const qs = searchParams.toString();
	const suffix = qs ? `?${qs}` : "";
	const base = `/clubs/${clubId}`;

	return (
		<div className="mb-6 -mx-1 px-1 overflow-x-auto scrollbar-thin">
			<nav
				className="inline-flex min-w-full gap-1 rounded-lg border border-border bg-bg-surface p-1 md:flex-wrap"
				aria-label="Club profile sections"
			>
				{tabs.map((tab) => {
					const href = `${base}/${tab.href}${suffix}`;
					const active = pathname === `${base}/${tab.href}`;
					return (
						<Link
							key={tab.href}
							href={href}
							className={cn(
								triggerClass,
								active
									? "bg-accent text-bg-base shadow-accent"
									: "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
							)}
						>
							{tab.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
