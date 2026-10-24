"use client";

import { Calendar, Clock, LayoutGrid, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button/Button";
import {
	MOCK_SESSION_JOIN,
	MOCK_SESSION_JOIN_META,
	MOCK_SESSION_JOIN_QUEUE,
	type SessionJoinFixture,
	type SessionJoinMetaCard,
	type SessionQueuePlayer,
} from "@/constants/mock-session-join";
import { SessionBrandHeader } from "../session-brand-header/SessionBrandHeader";
import { SessionCapacityCard } from "../session-capacity-card/SessionCapacityCard";
import { SessionQueueRoster } from "../session-queue-roster/SessionQueueRoster";

const META_ICONS = {
	calendar: Calendar,
	clock: Clock,
	courts: LayoutGrid,
	format: Users,
} as const;

export type SessionJoinViewProps = {
	session?: SessionJoinFixture;
	meta?: SessionJoinMetaCard[];
	queue?: SessionQueuePlayer[];
	joinedHref?: string;
};

export function SessionJoinView({
	session = MOCK_SESSION_JOIN,
	meta = MOCK_SESSION_JOIN_META,
	queue = MOCK_SESSION_JOIN_QUEUE,
	joinedHref = "/sessions/joined",
}: SessionJoinViewProps) {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-4">
			<SessionBrandHeader status={session.statusLine} />

			<h1 className="mt-4 text-display font-bold tracking-tight text-text-primary">
				{session.venue}
			</h1>
			<p className="mt-2 text-body text-text-secondary">
				{session.headlineSub}
			</p>

			<ul className="mt-6 grid grid-cols-2 gap-3">
				{meta.map((card) => {
					const Icon = META_ICONS[card.icon];
					return (
						<li
							key={card.id}
							className="rounded-xl border border-border bg-bg-surface p-3"
						>
							<p className="flex items-center gap-1.5 text-micro font-medium uppercase tracking-widest text-text-secondary">
								<Icon className="size-3.5" aria-hidden />
								{card.label}
							</p>
							<p className="mt-2 text-small font-semibold text-text-primary">
								{card.value}
							</p>
						</li>
					);
				})}
			</ul>

			<SessionCapacityCard
				className="mt-4"
				accepted={session.listingAccepted}
				courts={session.courts}
				playersPerCourt={session.playersPerCourt}
				showSpotsOpen
				footnote={session.shareFootnote}
			/>

			<SessionQueueRoster
				className="mt-6"
				players={queue}
				summary={session.listingQueueSummary}
			/>

			<div className="sticky bottom-0 mt-auto bg-bg-base pt-3">
				<Button
					asChild
					size="lg"
					className="h-12 w-full text-small font-black uppercase tracking-widest"
				>
					<Link href={joinedHref}>JOIN</Link>
				</Button>
			</div>
		</div>
	);
}

SessionJoinView.displayName = "SessionJoinView";
