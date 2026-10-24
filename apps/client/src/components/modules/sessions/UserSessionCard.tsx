"use client";

import { CalendarClock, Check } from "lucide-react";
import Link from "next/link";
import { formatDistanceKm } from "@/lib/geo/haversine";
import {
	formatAdmissionStatusLabel,
	formatUserSessionDate,
	formatUserSessionTimeRange,
	isUserSessionDone,
	USER_SESSION_STATUS_CONFIG,
} from "@/lib/sessions/user-session-utils";
import { cn } from "@/lib/utils";
import type { UserSessionItem } from "@/types/user-sessions";

export interface UserSessionWithDistance extends UserSessionItem {
	distanceKm: number | null;
}

interface UserSessionCardProps {
	session: UserSessionWithDistance;
	className?: string;
}

export function UserSessionCard({ session, className }: UserSessionCardProps) {
	const config = USER_SESSION_STATUS_CONFIG[session.status];
	const isLive = session.status === "active";
	const isDone = isUserSessionDone(session.status);
	const isCompleted = session.status === "completed";

	const cardClass = cn(
		"bg-bg-surface border border-border rounded-lg p-4 shadow-card flex flex-col gap-3 transition-colors duration-default",
		isLive && "lg:col-span-2",
		isDone && "opacity-90",
		className,
	);

	const statusBlock = (
		<div className="flex items-center gap-2">
			{config.dotColor ? (
				<span
					className={cn("size-2 rounded-full animate-pulse", config.dotColor)}
				/>
			) : null}
			<span
				className={cn(
					"text-micro font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1",
					config.className,
				)}
			>
				{isCompleted ? <Check size={10} strokeWidth={3} /> : null}
				{config.label}
			</span>
			{session.clubName ? (
				<span className="text-small text-text-disabled ml-auto truncate">
					{session.clubName}
				</span>
			) : null}
		</div>
	);

	const dateBlock = (
		<div>
			<p className="text-heading font-semibold text-text-primary">
				{formatUserSessionDate(session)}
			</p>
			<div className="flex items-center gap-1 text-small text-text-secondary mt-0.5">
				<CalendarClock size={13} strokeWidth={1.5} />
				<span>
					{session.location}
					{session.venueAddress ? ` · ${session.venueAddress}` : ""}
					{" · "}
					{formatUserSessionTimeRange(session)}
				</span>
			</div>
			{session.distanceKm != null ? (
				<p className="text-small text-text-disabled mt-1">
					{formatDistanceKm(session.distanceKm)}
				</p>
			) : null}
		</div>
	);

	const slotsText = (
		<div className="flex flex-col gap-0.5 min-w-0">
			<span className="text-small text-text-secondary">
				{session.acceptedCount}/{session.totalSlots} slots ·{" "}
				<span
					className={cn(
						session.admissionStatus === "accepted" && "text-accent font-bold",
					)}
				>
					{formatAdmissionStatusLabel(session.admissionStatus)}
				</span>
			</span>
			<span className="text-small text-text-secondary">
				{session.playersPerCourt} players per court
			</span>
		</div>
	);

	const completedFooter = (
		<div className="flex items-center justify-between">
			<span className="text-small text-text-secondary">
				{session.acceptedCount} players registered
			</span>
			<span className="h-9 px-4 inline-flex items-center text-small font-bold uppercase tracking-widest text-text-secondary border border-border rounded-md">
				View Session
			</span>
		</div>
	);

	const activeFooter = (
		<div className="flex items-center justify-between">{slotsText}</div>
	);

	return (
		<Link
			href={session.href}
			className={cn(cardClass, "cursor-pointer hover:bg-bg-elevated")}
		>
			{statusBlock}
			{dateBlock}
			{isDone ? completedFooter : activeFooter}
		</Link>
	);
}
