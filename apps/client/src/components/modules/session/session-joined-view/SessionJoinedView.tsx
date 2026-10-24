"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Pill } from "@/components/ui/pill/Pill";
import {
	MOCK_SESSION_JOIN,
	MOCK_SESSION_JOINED_QUEUE,
	SESSION_QUEUE_LEGEND,
	type SessionJoinFixture,
	type SessionQueuePlayer,
	type SessionQueueStatus,
} from "@/constants/mock-session-join";
import { cn } from "@/lib/utils";
import { SessionBrandHeader } from "../session-brand-header/SessionBrandHeader";
import { SessionCapacityCard } from "../session-capacity-card/SessionCapacityCard";
import { SessionQueueRoster } from "../session-queue-roster/SessionQueueRoster";
import {
	buildDecorativeQrCells,
	shareJoinLink,
} from "./SessionJoinedView.helpers";

const LEGEND_DOT: Record<SessionQueueStatus, string> = {
	accepted: "bg-accent",
	waitlisted: "bg-warning",
	reserved: "bg-text-disabled",
};

export type SessionJoinedViewProps = {
	session?: SessionJoinFixture;
	queue?: SessionQueuePlayer[];
};

function DecorativeJoinQr({ className }: { className?: string }) {
	const cells = buildDecorativeQrCells();
	const size = cells.length;

	return (
		<svg
			viewBox={`0 0 ${size} ${size}`}
			className={cn("size-[7.25rem] rounded-md bg-text-primary p-1", className)}
			role="img"
			aria-label="Decorative session join QR"
		>
			<rect width={size} height={size} className="fill-text-primary" />
			{cells.flatMap((line, row) =>
				line.flatMap((on, col) =>
					on
						? [
								<rect
									key={`${row}-${col}`}
									x={col}
									y={row}
									width={1}
									height={1}
									className="fill-bg-base"
								/>,
							]
						: [],
				),
			)}
		</svg>
	);
}

export function SessionJoinedView({
	session = MOCK_SESSION_JOIN,
	queue = MOCK_SESSION_JOINED_QUEUE,
}: SessionJoinedViewProps) {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-4">
			<SessionBrandHeader status={session.joinedStatusLine} />

			<h1 className="mt-4 text-display font-bold tracking-tight text-text-primary">
				You’re accepted
			</h1>
			<p className="mt-2 text-body text-text-secondary">{session.joinedSub}</p>

			<section className="mt-6 rounded-xl border border-border bg-bg-surface p-4">
				<div className="flex items-center justify-between gap-3">
					<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
						YOUR STATUS
					</p>
					<Pill variant="accent" className="gap-1.5 font-semibold">
						<span className="size-1.5 rounded-full bg-accent" aria-hidden />
						ACCEPTED
					</Pill>
				</div>
				<SessionCapacityCard
					className="mt-4 border-0 bg-transparent p-0"
					accepted={session.joinedAccepted}
					courts={session.courts}
					playersPerCourt={session.playersPerCourt}
				/>
				<ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
					{SESSION_QUEUE_LEGEND.map((item) => (
						<li
							key={item.id}
							className="flex items-center gap-1.5 text-micro font-medium uppercase tracking-widest text-text-secondary"
						>
							<span
								className={cn("size-1.5 rounded-full", LEGEND_DOT[item.status])}
								aria-hidden
							/>
							{item.label}
						</li>
					))}
				</ul>
			</section>

			<section className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-bg-surface p-4">
				<DecorativeJoinQr />
				<div className="min-w-0 flex-1">
					<p className="text-heading font-semibold text-text-primary">
						{session.qrTitle}
					</p>
					<p className="mt-1 text-small text-text-secondary">
						{session.qrDescription}
					</p>
					<p className="mt-2 text-small text-text-secondary">
						{session.shareFootnote}
					</p>
				</div>
			</section>

			<SessionQueueRoster
				className="mt-6"
				players={queue}
				summary={session.joinedQueueSummary}
			/>

			<div className="sticky bottom-0 mt-auto bg-bg-base pt-3">
				<Button
					type="button"
					variant="secondary"
					size="lg"
					className="h-12 w-full text-small font-black uppercase tracking-widest"
					onClick={() => {
						void shareJoinLink(session);
					}}
				>
					<Share2 className="size-4" aria-hidden />
					SHARE QR
				</Button>
			</div>
		</div>
	);
}

SessionJoinedView.displayName = "SessionJoinedView";
