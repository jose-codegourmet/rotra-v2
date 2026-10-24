"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { Tabs, TabsContent } from "@/components/ui/tabs/Tabs";
import {
	PLAYER_TAB_IDS,
	PLAYER_TAB_LABELS,
	type PlayerTabId,
} from "@/constants/session-tabs";
import { useLeaveSessionMutation } from "@/hooks/useLeaveSessionMutation";
import { useSessionConsole } from "@/hooks/useSessionConsole/client";
import {
	admissionBadgeLabel,
	formatSessionDateTime,
} from "@/lib/sessions/session-display-utils";
import { cn } from "@/lib/utils";
import type { SessionLiveContext } from "@/types/session-live";

import { ActiveQueueView } from "../ActiveQueueView/ActiveQueueView";
import { ConsoleTabNav } from "../ConsoleTabNav/ConsoleTabNav";
import { CourtCard } from "../CourtCard/CourtCard";
import { LeaveSessionDialog } from "../LeaveSessionDialog/LeaveSessionDialog";
import { SessionStandingView } from "../SessionStandingView/SessionStandingView";
import { StatusPill } from "../StatusPill/StatusPill";

export interface PlayerActiveViewProps {
	session: SessionLiveContext;
	className?: string;
}

function isPlayerTabId(value: string): value is PlayerTabId {
	return (PLAYER_TAB_IDS as readonly string[]).includes(value);
}

export function PlayerActiveView({
	session,
	className,
}: PlayerActiveViewProps) {
	const [tab, setTab] = useState<PlayerTabId>("overview");
	const [leaveOpen, setLeaveOpen] = useState(false);
	const leaveMutation = useLeaveSessionMutation();
	const { data: consoleData, isLoading } = useSessionConsole(session.sessionId);
	const reg = session.viewerRegistration;

	return (
		<div className={cn("mx-auto max-w-[1100px]", className)}>
			<Tabs
				value={tab}
				onValueChange={(value) => {
					if (isPlayerTabId(value)) setTab(value);
				}}
			>
				<div className="mb-6 flex flex-col gap-4">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<p className="text-micro font-bold uppercase tracking-widest text-accent">
								{session.sessionLabel}
							</p>
							{reg ? (
								<StatusPill status="playing">
									{admissionBadgeLabel(reg.admissionStatus)}
								</StatusPill>
							) : null}
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setLeaveOpen(true)}
						>
							Leave session
						</Button>
					</div>
					<ConsoleTabNav tabIds={PLAYER_TAB_IDS} labels={PLAYER_TAB_LABELS} />
				</div>

				{isLoading || !consoleData ? (
					<p className="text-small text-text-secondary">Loading session…</p>
				) : (
					<>
						<TabsContent value="overview" className="space-y-4">
							<div className="rounded-lg border border-border bg-bg-surface p-4 space-y-2">
								<p className="text-small text-text-secondary">
									{session.location} · {formatSessionDateTime(session.dateTime)}
								</p>
								<p className="text-small text-text-primary">
									{session.acceptedCount} / {session.totalSlots} players ·{" "}
									{session.numCourts} courts
								</p>
								<p className="text-micro font-bold uppercase tracking-widest text-accent">
									Live
								</p>
							</div>
						</TabsContent>

						<TabsContent value="courts">
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{consoleData.courts.map((court) => (
									<CourtCard key={court.id} court={court} />
								))}
							</div>
						</TabsContent>

						<TabsContent value="queue">
							<ActiveQueueView
								inGameCourts={consoleData.courts}
								inactiveCourts={consoleData.inactiveCourts}
								nextQueue={consoleData.nextQueue}
								standingRows={consoleData.standingRows.slice(0, 3)}
								roster={consoleData.roster}
							/>
						</TabsContent>

						<TabsContent value="feed">
							<p className="text-small text-text-secondary">
								Session feed will appear here in a future update.
							</p>
						</TabsContent>

						<TabsContent value="standings">
							{consoleData.standingRows.length > 0 ? (
								<SessionStandingView rows={consoleData.standingRows} />
							) : (
								<p className="text-small text-text-secondary">
									No completed matches yet.
								</p>
							)}
						</TabsContent>
					</>
				)}
			</Tabs>

			<LeaveSessionDialog
				open={leaveOpen}
				onOpenChange={setLeaveOpen}
				busy={leaveMutation.isPending}
				onConfirm={() => leaveMutation.mutate(session.sessionId)}
			/>
		</div>
	);
}
