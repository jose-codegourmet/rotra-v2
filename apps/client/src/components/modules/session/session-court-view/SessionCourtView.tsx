"use client";

import { Clock, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button/Button";
import {
	COURT_1_ID,
	COURT_VIEW_STATUS_LABELS,
	COURT_VIEW_STATUS_LEGEND,
	type CourtViewCourt,
	type CourtViewStatus,
	MOCK_SESSION_COURT,
	MOCK_SESSION_COURTS,
	type SessionCourtFixture,
} from "@/constants/mock-session-court";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<CourtViewStatus, string> = {
	active: "bg-accent",
	empty: "bg-text-disabled",
	onHold: "bg-warning",
};

const STATUS_FILLED: Record<CourtViewStatus, string> = {
	active: "bg-accent/15 text-accent",
	empty: "bg-bg-elevated text-text-secondary",
	onHold: "bg-warning/15 text-warning",
};

const STATUS_OUTLINE: Record<CourtViewStatus, string> = {
	active: "border-accent text-accent",
	empty: "border-border-strong text-text-secondary",
	onHold: "border-warning text-warning",
};

export type SessionCourtViewProps = {
	session?: SessionCourtFixture;
	courts?: CourtViewCourt[];
	initialHeld?: boolean;
};

function countLiveCourts(courts: CourtViewCourt[]): number {
	return courts.filter((court) => court.status === "active").length;
}

function liveCourtsLabel(count: number, session: SessionCourtFixture): string {
	const noun =
		count === 1 ? session.liveCourtSingular : session.liveCourtPlural;
	return `${count} ${noun}`;
}

export function SessionCourtView({
	session = MOCK_SESSION_COURT,
	courts: initialCourts = MOCK_SESSION_COURTS,
	initialHeld = false,
}: SessionCourtViewProps) {
	const [courts, setCourts] = useState<CourtViewCourt[]>(() =>
		initialHeld
			? initialCourts.map((court) =>
					court.id === COURT_1_ID
						? { ...court, status: "onHold" as const }
						: court,
				)
			: initialCourts,
	);

	const liveCount = countLiveCourts(courts);
	const court1 = courts.find((court) => court.id === COURT_1_ID);
	const court1Held = court1?.status === "onHold";

	const handleHoldCourt1 = () => {
		if (!court1 || court1.status === "empty") return;

		if (court1Held) {
			setCourts((current) =>
				current.map((court) =>
					court.id === COURT_1_ID
						? { ...court, status: "active" as const }
						: court,
				),
			);
			toast.success(session.resumeToast);
			return;
		}

		setCourts((current) =>
			current.map((court) =>
				court.id === COURT_1_ID
					? { ...court, status: "onHold" as const }
					: court,
			),
		);
		toast.success(session.holdToast);
	};

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-4">
			<header className="pt-6">
				<div>
					<p className="text-heading font-bold uppercase tracking-wide text-text-primary">
						ROTRA
					</p>
					<p className="text-small text-text-secondary">Run the game.</p>
				</div>
				<p className="mt-5 flex items-center gap-2 text-micro font-medium uppercase tracking-widest text-accent">
					<span
						className="size-2 shrink-0 rounded-full bg-accent"
						aria-hidden
					/>
					{liveCourtsLabel(liveCount, session)}
				</p>
			</header>

			<h1 className="mt-4 text-display font-bold tracking-tight text-text-primary">
				{session.headline}
			</h1>
			<p className="mt-2 text-body text-text-secondary">{session.subLine}</p>

			<ul className="mt-6 flex flex-col gap-4">
				{courts.map((court) => (
					<li key={court.id}>
						<CourtCard court={court} />
					</li>
				))}
			</ul>

			<section className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
				<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
					{session.statusLegendLabel}
				</p>
				<ul className="flex flex-wrap gap-2">
					{COURT_VIEW_STATUS_LEGEND.map((item) => (
						<li key={item.id}>
							<CourtStatusBadge status={item.id} appearance="outline" />
						</li>
					))}
				</ul>
			</section>

			<div className="sticky bottom-0 mt-auto bg-bg-base pt-3">
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={handleHoldCourt1}
					className="h-12 w-full rounded-lg border-text-primary text-small font-black uppercase tracking-widest"
				>
					{court1Held ? session.resumeCta : session.holdCta}
				</Button>
			</div>
		</div>
	);
}

SessionCourtView.displayName = "SessionCourtView";

function CourtStatusBadge({
	status,
	appearance,
}: {
	status: CourtViewStatus;
	appearance: "filled" | "outline";
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
				appearance === "filled"
					? STATUS_FILLED[status]
					: cn("border bg-transparent", STATUS_OUTLINE[status]),
			)}
		>
			<span
				className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
				aria-hidden
			/>
			{COURT_VIEW_STATUS_LABELS[status]}
		</span>
	);
}

function CourtCard({ court }: { court: CourtViewCourt }) {
	const isEmpty = court.status === "empty";

	return (
		<article className="rounded-xl border border-border bg-bg-surface p-4 shadow-card">
			<div className="flex items-center justify-between gap-3">
				<p className="flex items-center gap-2 text-small font-semibold text-text-primary">
					<LayoutGrid className="size-4 text-text-secondary" aria-hidden />
					{court.name}
				</p>
				<CourtStatusBadge status={court.status} appearance="filled" />
			</div>

			{isEmpty ? (
				<div className="flex flex-col items-center justify-center px-4 py-8 text-center">
					<LayoutGrid className="size-10 text-text-disabled" aria-hidden />
					<p className="mt-3 text-small text-text-secondary">
						{court.emptyMessage}
					</p>
				</div>
			) : (
				<>
					<div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
						<div>
							<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
								{court.teamA?.label}
							</p>
							<ul className="mt-1 space-y-0.5">
								{court.teamA?.players.map((name) => (
									<li
										key={name}
										className="text-small font-semibold text-text-primary"
									>
										{name}
									</li>
								))}
							</ul>
						</div>
						<p className="text-small text-text-secondary">vs</p>
						<div className="text-right">
							<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
								{court.teamB?.label}
							</p>
							<ul className="mt-1 space-y-0.5">
								{court.teamB?.players.map((name) => (
									<li
										key={name}
										className="text-small font-semibold text-text-primary"
									>
										{name}
									</li>
								))}
							</ul>
						</div>
					</div>

					<p className="mt-5 text-center text-display font-bold tabular-nums tracking-tight text-text-primary">
						{court.score}
					</p>
					<p className="mt-1 flex items-center justify-center gap-1.5 text-small text-text-secondary">
						<Clock className="size-3.5" aria-hidden />
						{court.elapsed}
					</p>
				</>
			)}
		</article>
	);
}
