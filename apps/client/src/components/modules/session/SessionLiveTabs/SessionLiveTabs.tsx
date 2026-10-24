"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button/Button";
import { Tabs, TabsContent } from "@/components/ui/tabs/Tabs";
import type { SessionTabId } from "@/constants/mock-session-ui";
import {
	MOCK_ASSIGN_PLAYERS,
	MOCK_CHART_POINTS,
	MOCK_COURTS,
	MOCK_FINANCIAL_LINES,
	MOCK_KPIS,
	MOCK_LEDGER,
	MOCK_NEXT_QUEUE,
	MOCK_ROSTER,
	MOCK_STANDING_FULL,
	MOCK_STANDING_MINI,
	SESSION_TAB_IDS,
} from "@/constants/mock-session-ui";
import { useCloseSessionMutation } from "@/hooks/useCloseSessionMutation";
import { useLeaveSessionMutation } from "@/hooks/useLeaveSessionMutation";

import { ActiveQueueView } from "../ActiveQueueView/ActiveQueueView";
import { AssignCourtModal } from "../AssignCourtModal/AssignCourtModal";
import { CloseSessionDialog } from "../CloseSessionDialog/CloseSessionDialog";
import { LeaveSessionDialog } from "../LeaveSessionDialog/LeaveSessionDialog";
import { SessionFinancialsView } from "../SessionFinancialsView/SessionFinancialsView";
import { SessionStandingView } from "../SessionStandingView/SessionStandingView";
import { SessionStatisticsView } from "../SessionStatisticsView/SessionStatisticsView";
import { SessionTabNav } from "../SessionTabNav/SessionTabNav";

export interface SessionLiveTabsProps {
	/** Small label above tabs, e.g. club or session name */
	sessionLabel?: string;
	/** When set, shows the Leave session control wired to this session */
	sessionId?: string;
	/** When true, shows Close session instead of Leave session */
	isOwner?: boolean;
	/** Required for close confirmation when isOwner is true */
	sessionTitle?: string | null;
	className?: string;
}

function isSessionTabId(value: string): value is SessionTabId {
	return SESSION_TAB_IDS.includes(value as SessionTabId);
}

export function SessionLiveTabs({
	sessionLabel = "Live session",
	sessionId,
	isOwner = false,
	sessionTitle,
	className,
}: SessionLiveTabsProps) {
	const [tab, setTab] = useState<SessionTabId>("queue");
	const [assignOpen, setAssignOpen] = useState(false);
	const [assignTitle, setAssignTitle] = useState("Assign court");
	const [leaveOpen, setLeaveOpen] = useState(false);
	const [closeOpen, setCloseOpen] = useState(false);
	const leaveMutation = useLeaveSessionMutation();
	const closeMutation = useCloseSessionMutation();

	const closeConfirmationTitle = sessionTitle?.trim() || sessionLabel;

	const { inGameCourts, inactiveCourts } = useMemo(() => {
		const active = MOCK_COURTS.filter((c) => c.variant === "active");
		const empty = MOCK_COURTS.filter((c) => c.variant === "empty");
		return { inGameCourts: active, inactiveCourts: empty };
	}, []);

	return (
		<div className={className}>
			<Tabs
				value={tab}
				onValueChange={(value) => {
					if (isSessionTabId(value)) setTab(value);
				}}
			>
				<div className="mb-6 flex flex-col gap-4">
					<div className="flex items-start justify-between gap-4">
						<p className="text-micro font-bold uppercase tracking-widest text-accent">
							{sessionLabel}
						</p>
						{sessionId ? (
							isOwner ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setCloseOpen(true)}
								>
									Close session
								</Button>
							) : (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setLeaveOpen(true)}
								>
									Leave session
								</Button>
							)
						) : null}
					</div>
					<SessionTabNav />
				</div>

				<TabsContent value="queue">
					<ActiveQueueView
						inGameCourts={inGameCourts}
						inactiveCourts={inactiveCourts}
						nextQueue={MOCK_NEXT_QUEUE}
						standingRows={MOCK_STANDING_MINI}
						roster={MOCK_ROSTER}
						onAssignCourt={(courtId) => {
							const court = MOCK_COURTS.find((c) => c.id === courtId);
							setAssignTitle(
								court ? `Assign court — ${court.label}` : "Assign court",
							);
							setAssignOpen(true);
						}}
					/>
				</TabsContent>
				<TabsContent value="standing">
					<SessionStandingView rows={MOCK_STANDING_FULL} />
				</TabsContent>
				<TabsContent value="statistics">
					<SessionStatisticsView
						kpis={MOCK_KPIS}
						chartData={MOCK_CHART_POINTS}
					/>
				</TabsContent>
				<TabsContent value="financials">
					<SessionFinancialsView
						ledger={MOCK_LEDGER}
						lineItems={MOCK_FINANCIAL_LINES}
						totalCost="$636.50"
						profit="+$148.50"
					/>
				</TabsContent>
			</Tabs>

			<AssignCourtModal
				open={assignOpen}
				onOpenChange={setAssignOpen}
				courtTitle={assignTitle}
				players={MOCK_ASSIGN_PLAYERS}
			/>

			{sessionId && isOwner ? (
				<CloseSessionDialog
					open={closeOpen}
					onOpenChange={setCloseOpen}
					sessionTitle={closeConfirmationTitle}
					busy={closeMutation.isPending}
					onConfirm={() => {
						closeMutation.mutate(sessionId, {
							onSuccess: () => setCloseOpen(false),
						});
					}}
				/>
			) : null}

			{sessionId && !isOwner ? (
				<LeaveSessionDialog
					open={leaveOpen}
					onOpenChange={setLeaveOpen}
					busy={leaveMutation.isPending}
					onConfirm={() => {
						leaveMutation.mutate(sessionId);
					}}
				/>
			) : null}
		</div>
	);
}
