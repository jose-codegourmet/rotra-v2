import {
	CalendarClock,
	ChevronRight,
	MapPin,
	Plus,
	Trophy,
	Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button/Button";
import { MY_CLUBS } from "@/constants/mock-clubs";

export const metadata: Metadata = {
	title: "Clubs — ROTRA",
	description: "Your clubs and memberships.",
};

export default function ClubsPage() {
	return (
		<div className="max-w-[1400px] mx-auto p-4 md:p-8">
			<div className="flex flex-col gap-6">
				{/* Page header */}
				<div className="flex items-start justify-between gap-4 flex-wrap">
					<div>
						<p className="text-micro font-bold uppercase tracking-widest text-accent mb-1">
							Clubs
						</p>
						<h1 className="text-display font-bold text-text-primary tracking-tight">
							Your Clubs
						</h1>
						<p className="text-body text-text-secondary mt-2">
							Manage your club memberships and sessions.
						</p>
					</div>
					<Button
						size="lg"
						className="shrink-0 uppercase tracking-widest font-black"
						asChild
					>
						<Link href="/clubs/apply" className="gap-2">
							<Plus size={16} strokeWidth={2} />
							<span className="hidden sm:inline">Apply to start a club</span>
							<span className="sm:hidden">Apply</span>
						</Link>
					</Button>
				</div>

				<div className="rounded-lg border border-border bg-bg-surface p-5 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<p className="text-heading font-semibold text-text-primary">
							Run your own sessions
						</p>
						<p className="text-small text-text-secondary mt-1 max-w-xl">
							Apply to start a club, grow a community, and host sessions on
							ROTRA.
						</p>
					</div>
					<Button variant="default" asChild>
						<Link href="/clubs/apply" className="gap-2 shrink-0">
							<Plus size={16} strokeWidth={2} />
							Apply to start a club
						</Link>
					</Button>
				</div>

				{/* My clubs */}
				{MY_CLUBS.length > 0 ? (
					<div className="flex flex-col gap-4">
						{MY_CLUBS.map((club) => (
							<div
								key={club.id}
								className="bg-bg-surface border border-border rounded-lg p-5 shadow-card hover:bg-bg-elevated transition-colors duration-default cursor-pointer"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex flex-col gap-1 flex-1 min-w-0">
										{/* Club name + role badge */}
										<div className="flex items-center gap-2 flex-wrap">
											<h2 className="text-heading font-semibold text-text-primary">
												{club.name}
											</h2>
											<span className="text-micro font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full">
												{club.role}
											</span>
										</div>

										{/* Location */}
										<div className="flex items-center gap-1 text-small text-text-secondary">
											<MapPin
												size={13}
												strokeWidth={1.5}
												className="shrink-0"
											/>
											<span>
												{club.location}
												{"venueName" in club && club.venueName
													? ` · ${club.venueName}`
													: null}
											</span>
										</div>

										{/* Stats row */}
										<div className="flex items-center gap-4 mt-2">
											<div className="flex items-center gap-1 text-small text-text-secondary">
												<Users size={13} strokeWidth={1.5} />
												<span>{club.members} members</span>
											</div>
											<div className="flex items-center gap-1 text-small text-text-secondary">
												<CalendarClock size={13} strokeWidth={1.5} />
												<span>{club.nextSession}</span>
											</div>
										</div>

										{/* Active session indicator */}
										{club.activeSessions > 0 && (
											<div className="flex items-center gap-1.5 mt-2">
												<span className="size-2 rounded-full bg-accent animate-pulse" />
												<span className="text-small font-bold text-accent uppercase tracking-widest">
													Live Session
												</span>
											</div>
										)}
									</div>

									<ChevronRight
										size={18}
										strokeWidth={1.5}
										className="text-text-disabled shrink-0 mt-1"
									/>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-20 gap-4">
						<Trophy size={40} strokeWidth={1} className="text-text-disabled" />
						<div className="text-center">
							<p className="text-heading font-semibold text-text-primary">
								No clubs yet
							</p>
							<p className="text-body text-text-secondary mt-1">
								Create a club or explore existing ones to join.
							</p>
						</div>
						<Button
							size="lg"
							className="uppercase tracking-widest font-black"
							asChild
						>
							<Link href="/clubs/apply" className="gap-2">
								<Plus size={16} strokeWidth={2} />
								Apply to start a club
							</Link>
						</Button>
					</div>
				)}

				{/* Discover more clubs link */}
				<div className="border-t border-border pt-4">
					<Link
						href="/explore"
						className="flex items-center justify-between p-4 bg-bg-surface border border-border rounded-lg hover:bg-bg-elevated transition-colors duration-default"
					>
						<div>
							<p className="text-body font-semibold text-text-primary">
								Discover more clubs
							</p>
							<p className="text-small text-text-secondary">
								Browse public clubs and request to join
							</p>
						</div>
						<ChevronRight
							size={18}
							strokeWidth={1.5}
							className="text-text-disabled shrink-0"
						/>
					</Link>
				</div>
			</div>
		</div>
	);
}
