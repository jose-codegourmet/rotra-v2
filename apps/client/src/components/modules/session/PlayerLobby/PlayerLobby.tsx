"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { useLeaveSessionMutation } from "@/hooks/useLeaveSessionMutation";
import { fetchPlayerProfile } from "@/hooks/usePlayerProfile/server";
import {
	admissionBadgeLabel,
	formatSessionCountdown,
	formatSessionDateTime,
} from "@/lib/sessions/session-display-utils";
import { cn } from "@/lib/utils";
import type { SessionLiveContext } from "@/types/session-live";

import { LeaveSessionDialog } from "../LeaveSessionDialog/LeaveSessionDialog";
import { SessionRegisterButton } from "../SessionRegisterButton/SessionRegisterButton";
import { SessionRosterPanel } from "../SessionRosterPanel/SessionRosterPanel";
import { StatusPill } from "../StatusPill/StatusPill";

export interface PlayerLobbyProps {
	session: SessionLiveContext;
	className?: string;
}

function admissionPillVariant(
	status: string,
): "playing" | "waiting" | "ready" | "away" {
	switch (status) {
		case "accepted":
		case "reserved":
			return "ready";
		case "waitlisted":
			return "waiting";
		default:
			return "away";
	}
}

export function PlayerLobby({ session, className }: PlayerLobbyProps) {
	const leaveMutation = useLeaveSessionMutation();
	const [leaveOpen, setLeaveOpen] = useState(false);
	const reg = session.viewerRegistration;
	const { data: profile } = useQuery({
		queryKey: ["profile", "me"],
		queryFn: fetchPlayerProfile,
		staleTime: 60_000,
	});

	return (
		<div className={cn("mx-auto max-w-[720px] space-y-8", className)}>
			<header className="space-y-2">
				<p className="text-micro font-bold uppercase tracking-widest text-accent">
					{session.sessionLabel}
				</p>
				<h1 className="text-2xl font-black tracking-tight text-text-primary">
					{session.sessionTitle}
				</h1>
				<p className="text-small text-text-secondary">
					{session.location} · {formatSessionDateTime(session.dateTime)}
				</p>
				<p className="inline-flex rounded-full bg-bg-elevated px-3 py-1 text-micro font-bold uppercase tracking-widest text-text-secondary">
					{formatSessionCountdown(session.dateTime)}
				</p>
				{reg ? (
					<StatusPill status={admissionPillVariant(reg.admissionStatus)}>
						{admissionBadgeLabel(reg.admissionStatus)}
					</StatusPill>
				) : null}
			</header>

			<SessionRosterPanel
				sessionId={session.sessionId}
				viewerPlayerId={profile?.id ?? null}
			/>

			<div className="flex flex-wrap gap-3">
				{!reg ? <SessionRegisterButton /> : null}
				{reg && reg.admissionStatus !== "exited" ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setLeaveOpen(true)}
					>
						Leave session
					</Button>
				) : null}
			</div>

			<LeaveSessionDialog
				open={leaveOpen}
				onOpenChange={setLeaveOpen}
				busy={leaveMutation.isPending}
				onConfirm={() => leaveMutation.mutate(session.sessionId)}
			/>
		</div>
	);
}
