"use client";

import { Calendar, Clock, Lock, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button/Button";
import { Pill } from "@/components/ui/pill/Pill";
import {
	MOCK_SESSION_ATTENDANCE,
	MOCK_SESSION_ATTENDANCE_META,
	type SessionAttendanceFixture,
	type SessionAttendanceMetaCard,
} from "@/constants/mock-session-attendance";
import { cn } from "@/lib/utils";

const META_ICONS = {
	location: MapPin,
	date: Calendar,
	window: Clock,
	format: Users,
} as const;

export type SessionAttendanceViewProps = {
	session?: SessionAttendanceFixture;
	meta?: SessionAttendanceMetaCard[];
	initialArrived?: boolean;
};

export function SessionAttendanceView({
	session = MOCK_SESSION_ATTENDANCE,
	meta = MOCK_SESSION_ATTENDANCE_META,
	initialArrived = false,
}: SessionAttendanceViewProps) {
	const [arrived, setArrived] = useState(initialArrived);

	const handleIAmIn = () => {
		if (arrived) return;
		setArrived(true);
		toast.success(session.checkInToast);
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
				<p className="mt-5 flex items-center gap-2 text-micro font-medium uppercase tracking-widest text-text-secondary">
					<span
						className={cn(
							"size-2 shrink-0 rounded-full",
							arrived ? "bg-accent" : "bg-warning",
						)}
						aria-hidden
					/>
					{arrived ? session.arrivedStatus : session.arrivalStatus}
				</p>
			</header>

			<h1 className="mt-4 text-display font-bold tracking-tight text-text-primary">
				{session.headline}
			</h1>
			<p className="mt-2 text-small text-text-secondary">{session.subLine}</p>
			<p className="text-small text-text-secondary">{session.subLinkLine}</p>

			<section className="mt-6 rounded-xl border border-border bg-bg-surface p-4">
				<div className="flex items-start justify-between gap-3">
					<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
						{session.statusLabel}
					</p>
					<Pill
						variant="accent"
						className="gap-1.5 font-semibold shadow-accent"
					>
						<span className="size-1.5 rounded-full bg-accent" aria-hidden />
						{session.acceptedBadge}
					</Pill>
				</div>
				<p className="mt-2 text-heading font-semibold text-text-primary">
					{arrived ? session.arrivedStatusValue : session.statusValue}
				</p>
			</section>

			<section className="mt-4 rounded-xl border border-border bg-bg-surface p-3">
				<ul className="grid grid-cols-2 gap-2">
					{meta.map((card) => {
						const Icon = META_ICONS[card.icon];
						return (
							<li key={card.id} className="rounded-lg bg-bg-elevated p-3">
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
				<p className="mt-3 px-1 text-small text-text-secondary">
					<span className="font-semibold text-accent">
						{session.acceptedCount} accepted
					</span>
					{` • ${session.waitlistRest}`}
				</p>
			</section>

			<section className="mt-4 rounded-xl border border-border bg-bg-surface p-4">
				<div className="flex items-center justify-between gap-3">
					<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
						{session.attendanceTitle}
					</p>
					<p className="text-micro text-text-secondary">
						{session.stepProgress}
					</p>
				</div>

				<div className="mt-4 flex items-start gap-3">
					<div
						className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
						aria-hidden
					>
						<MapPin className="size-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
							{arrived ? session.step1ArrivedEyebrow : session.step1Eyebrow}
						</p>
						<p className="mt-1 text-small font-semibold text-text-primary">
							{session.step1Title}
						</p>
						<p className="mt-0.5 text-small text-text-secondary">
							{arrived
								? session.step1ArrivedDescription
								: session.step1Description}
						</p>
					</div>
					<Pill variant="accent" className="font-semibold shadow-accent">
						{arrived ? session.step1ArrivedBadge : session.step1Badge}
					</Pill>
				</div>

				<div className="my-4 border-t border-border" />

				<div className="flex items-start gap-3">
					<div
						className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-text-disabled"
						aria-hidden
					>
						<Lock className="size-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-micro font-medium uppercase tracking-widest text-text-secondary">
							{session.step2Eyebrow}
						</p>
						<p className="mt-1 text-small font-semibold text-text-secondary">
							{session.step2Title}
						</p>
						<p className="mt-0.5 text-small text-text-secondary">
							{session.step2Description}
						</p>
					</div>
					<Pill variant="muted" className="font-semibold">
						{session.step2Badge}
					</Pill>
				</div>
			</section>

			<div className="sticky bottom-0 mt-auto bg-bg-base pt-3">
				<Button
					type="button"
					size="lg"
					disabled={arrived}
					onClick={handleIAmIn}
					className="h-12 w-full text-small font-black uppercase tracking-widest"
				>
					{arrived ? session.arrivedCtaLabel : session.ctaLabel}
				</Button>
			</div>
		</div>
	);
}

SessionAttendanceView.displayName = "SessionAttendanceView";
