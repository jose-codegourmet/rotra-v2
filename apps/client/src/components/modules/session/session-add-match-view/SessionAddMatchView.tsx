"use client";

import { Check, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button/Button";
import { Pill } from "@/components/ui/pill/Pill";
import {
	type AddMatchPlayer,
	type AddMatchTeamSlot,
	MOCK_ADD_MATCH_POOL,
	MOCK_ADD_MATCH_TEAM_A,
	MOCK_ADD_MATCH_TEAM_B,
	MOCK_SESSION_ADD_MATCH,
	type SessionAddMatchFixture,
} from "@/constants/mock-session-add-match";
import { cn } from "@/lib/utils";

export type SessionAddMatchViewProps = {
	session?: SessionAddMatchFixture;
	teamA?: AddMatchTeamSlot[];
	teamB?: AddMatchTeamSlot[];
	pool?: AddMatchPlayer[];
};

export function SessionAddMatchView({
	session = MOCK_SESSION_ADD_MATCH,
	teamA = MOCK_ADD_MATCH_TEAM_A,
	teamB = MOCK_ADD_MATCH_TEAM_B,
	pool = MOCK_ADD_MATCH_POOL,
}: SessionAddMatchViewProps) {
	const handleAddMatch = () => {
		toast.success(session.addToast);
	};

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-4">
			<header className="flex items-start justify-between gap-4 pt-6">
				<div>
					<p className="text-heading font-bold uppercase tracking-wide text-text-primary">
						ROTRA
					</p>
					<p className="text-small text-text-secondary">Run the game.</p>
				</div>
				<Pill variant="accent" className="gap-1.5 font-semibold">
					<span className="size-1.5 rounded-full bg-accent" aria-hidden />
					{session.roleBadge}
				</Pill>
			</header>

			<p className="mt-5 flex items-center gap-2 text-micro font-medium uppercase tracking-widest text-accent">
				<span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
				{session.eyebrow}
			</p>

			<h1 className="mt-4 text-display font-bold tracking-tight text-text-primary">
				{session.headline}
			</h1>
			<p className="mt-2 text-body text-text-secondary">{session.subLine}</p>

			<section className="mt-6 rounded-xl border border-border bg-bg-surface p-4 shadow-card">
				<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
					<TeamColumn
						label={session.teamALabel}
						slots={teamA}
						session={session}
					/>
					<p className="text-small text-text-secondary">{session.vsLabel}</p>
					<TeamColumn
						label={session.teamBLabel}
						slots={teamB}
						session={session}
					/>
				</div>
			</section>

			<section className="mt-6">
				<div className="flex items-center justify-between gap-3">
					<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
						{session.waitingLabel}
					</p>
					<p className="text-micro text-text-secondary">
						{session.waitingHint}
						{" · "}
						<span className="font-semibold text-accent">
							{session.selectedCount} of {session.slotCount}
						</span>
					</p>
				</div>

				<ul className="mt-2 flex flex-col gap-2">
					{pool.map((player) => (
						<li key={player.id}>
							<WaitingPlayerRow player={player} />
						</li>
					))}
				</ul>
			</section>

			<div className="sticky bottom-0 mt-auto bg-bg-base pt-3">
				<Button
					type="button"
					size="lg"
					onClick={handleAddMatch}
					className="h-12 w-full text-small font-black uppercase tracking-widest"
				>
					{session.ctaLabel}
				</Button>
			</div>
		</div>
	);
}

SessionAddMatchView.displayName = "SessionAddMatchView";

function InitialsAvatar({ initials }: { initials: string }) {
	return (
		<span
			className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-small font-semibold text-text-primary"
			aria-hidden
		>
			{initials}
		</span>
	);
}

function TeamColumn({
	label,
	slots,
	session,
}: {
	label: string;
	slots: AddMatchTeamSlot[];
	session: SessionAddMatchFixture;
}) {
	return (
		<div className="min-w-0">
			<p className="flex items-center gap-1.5 text-micro font-medium uppercase tracking-widest text-text-secondary">
				<Users className="size-3.5" aria-hidden />
				{label}
			</p>
			<ul className="mt-2 flex flex-col gap-2">
				{slots.map((slot, index) => (
					<li key={slot?.id ?? `open-${index}`}>
						<TeamSlotCard slot={slot} openLabel={session.openSlotLabel} />
					</li>
				))}
			</ul>
		</div>
	);
}

function TeamSlotCard({
	slot,
	openLabel,
}: {
	slot: AddMatchTeamSlot;
	openLabel: string;
}) {
	if (!slot) {
		return (
			<div className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-border-strong px-2 py-2 text-text-secondary">
				<Plus className="size-4 shrink-0" aria-hidden />
				<span className="text-small">{openLabel}</span>
			</div>
		);
	}

	return (
		<div className="flex min-h-11 items-center gap-2 rounded-lg bg-bg-elevated px-2 py-2">
			<InitialsAvatar initials={slot.initials} />
			<p className="min-w-0 truncate text-small font-semibold text-text-primary">
				{slot.name}
			</p>
		</div>
	);
}

function WaitingPlayerRow({ player }: { player: AddMatchPlayer }) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-xl px-3 py-3",
				player.selected ? "bg-accent/15" : "bg-bg-surface",
			)}
		>
			<InitialsAvatar initials={player.initials} />
			<div className="min-w-0 flex-1">
				<p className="text-small font-semibold text-text-primary">
					{player.name}
				</p>
				<p className="text-small text-text-secondary">{player.waitLabel}</p>
			</div>
			{player.selected ? (
				<span
					className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-bg-base"
					aria-hidden
				>
					<Check className="size-3.5" strokeWidth={3} />
				</span>
			) : (
				<span
					className="size-6 shrink-0 rounded-full border-2 border-border-strong"
					aria-hidden
				/>
			)}
		</div>
	);
}
