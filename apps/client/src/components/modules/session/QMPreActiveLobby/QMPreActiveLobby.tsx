"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { useCloseSessionMutation } from "@/hooks/useCloseSessionMutation";
import { fetchPlayerProfile } from "@/hooks/usePlayerProfile/server";
import { useStartSessionMutation } from "@/hooks/useStartSessionMutation";
import {
	formatSessionCountdown,
	formatSessionDateTime,
} from "@/lib/sessions/session-display-utils";
import { cn } from "@/lib/utils";
import type { SessionLiveContext } from "@/types/session-live";

import { CloseSessionDialog } from "../CloseSessionDialog/CloseSessionDialog";
import { SessionRosterPanel } from "../SessionRosterPanel/SessionRosterPanel";

export interface QMPreActiveLobbyProps {
	session: SessionLiveContext;
	className?: string;
}

export function QMPreActiveLobby({
	session,
	className,
}: QMPreActiveLobbyProps) {
	const startMutation = useStartSessionMutation();
	const closeMutation = useCloseSessionMutation();
	const [closeOpen, setCloseOpen] = useState(false);
	const { data: profile } = useQuery({
		queryKey: ["profile", "me"],
		queryFn: fetchPlayerProfile,
		staleTime: 60_000,
	});

	const capacityPct =
		session.totalSlots > 0
			? Math.min(100, (session.acceptedCount / session.totalSlots) * 100)
			: 0;

	return (
		<div className={cn("mx-auto max-w-[720px] space-y-8", className)}>
			<header className="flex items-start justify-between gap-4">
				<div className="space-y-2">
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
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setCloseOpen(true)}
				>
					Close session
				</Button>
			</header>

			<section className="rounded-lg border border-border bg-bg-surface p-4">
				<div className="mb-2 flex items-center justify-between text-small">
					<span className="font-bold uppercase tracking-widest text-text-disabled">
						Capacity
					</span>
					<span className="text-text-primary">
						{session.acceptedCount} / {session.totalSlots} accepted
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
					<div
						className="h-full rounded-full bg-accent transition-all"
						style={{ width: `${capacityPct}%` }}
					/>
				</div>
			</section>

			<SessionRosterPanel
				sessionId={session.sessionId}
				viewerPlayerId={profile?.id ?? null}
			/>

			<div className="flex justify-center pt-4">
				<Button
					type="button"
					size="lg"
					className="min-w-[240px] font-black uppercase tracking-widest"
					disabled={startMutation.isPending}
					onClick={() => startMutation.mutate(session.sessionId)}
				>
					{startMutation.isPending ? "Starting…" : "Start session"}
				</Button>
			</div>

			<CloseSessionDialog
				open={closeOpen}
				onOpenChange={setCloseOpen}
				sessionTitle={session.sessionTitle}
				busy={closeMutation.isPending}
				onConfirm={() => {
					closeMutation.mutate(session.sessionId, {
						onSuccess: () => setCloseOpen(false),
					});
				}}
			/>
		</div>
	);
}
