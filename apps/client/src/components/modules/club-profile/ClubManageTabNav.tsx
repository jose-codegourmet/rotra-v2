"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const triggerClass =
	"inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-label font-semibold transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

const tabs = [
	{ href: "members", label: "Members" },
	{ href: "requests", label: "Requests" },
	{ href: "statistics", label: "Statistics" },
	{ href: "settings", label: "Settings" },
	{ href: "blacklist", label: "Blacklist" },
] as const;

export function ClubManageTabNav({ clubId }: { clubId: string }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const qs = searchParams.toString();
	const suffix = qs ? `?${qs}` : "";
	const base = `/clubs/${clubId}/manage`;

	return (
		<div className="mb-6 -mx-1 px-1 overflow-x-auto">
			<nav
				className="inline-flex min-w-full gap-1 rounded-lg border border-border bg-bg-surface p-1 md:flex-wrap"
				aria-label="Club administration"
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
