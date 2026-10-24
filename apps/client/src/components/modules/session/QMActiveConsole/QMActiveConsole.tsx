"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { Tabs, TabsContent } from "@/components/ui/tabs/Tabs";
import {
	QM_TAB_IDS,
	QM_TAB_LABELS,
	type QMTabId,
} from "@/constants/session-tabs";
import { useCloseSessionMutation } from "@/hooks/useCloseSessionMutation";
import { useSessionConsole } from "@/hooks/useSessionConsole/client";
import { cn } from "@/lib/utils";
import type { SessionLiveContext } from "@/types/session-live";

import { ActiveQueueView } from "../ActiveQueueView/ActiveQueueView";
import { CloseSessionDialog } from "../CloseSessionDialog/CloseSessionDialog";
import { ConsoleTabNav } from "../ConsoleTabNav/ConsoleTabNav";
import { CourtCard } from "../CourtCard/CourtCard";
import { PlayerQueueCard } from "../PlayerQueueCard/PlayerQueueCard";
import { SessionFinancialsView } from "../SessionFinancialsView/SessionFinancialsView";

export interface QMActiveConsoleProps {
	session: SessionLiveContext;
	className?: string;
}

function isQMTabId(value: string): value is QMTabId {
	return (QM_TAB_IDS as readonly string[]).includes(value);
}

export function QMActiveConsole({ session, className }: QMActiveConsoleProps) {
	const [tab, setTab] = useState<QMTabId>("courts");
	const [closeOpen, setCloseOpen] = useState(false);
	const closeMutation = useCloseSessionMutation();
	const { data: consoleData, isLoading } = useSessionConsole(session.sessionId);

	return (
		<div className={cn("mx-auto max-w-[1100px]", className)}>
			<Tabs
				value={tab}
				onValueChange={(value) => {
					if (isQMTabId(value)) setTab(value);
				}}
			>
				<div className="mb-6 flex flex-col gap-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-micro font-bold uppercase tracking-widest text-accent">
								{session.sessionLabel}
							</p>
							<p className="text-small text-text-secondary">Live session</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setCloseOpen(true)}
						>
							Close session
						</Button>
					</div>
					<ConsoleTabNav tabIds={QM_TAB_IDS} labels={QM_TAB_LABELS} />
				</div>

				{isLoading || !consoleData ? (
					<p className="text-small text-text-secondary">Loading session…</p>
				) : (
					<>
						<TabsContent value="courts" className="space-y-6">
							<div>
								<p className="text-micro font-black uppercase tracking-[0.2em] text-text-disabled mb-3">
									In game courts
								</p>
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
									{consoleData.courts.map((court) => (
										<CourtCard key={court.id} court={court} />
									))}
								</div>
							</div>
							<div>
								<p className="text-micro font-black uppercase tracking-[0.2em] text-text-disabled mb-3">
									Inactive / maintenance
								</p>
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
									{consoleData.inactiveCourts.map((court) => (
										<CourtCard key={court.id} court={court} />
									))}
								</div>
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

						<TabsContent value="players">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{consoleData.roster.map((player) => (
									<PlayerQueueCard key={player.id} player={player} />
								))}
							</div>
						</TabsContent>

						<TabsContent value="requests">
							<p className="text-small text-text-secondary">
								Match requests will appear here when the request workflow is
								enabled.
							</p>
						</TabsContent>

						<TabsContent value="collections">
							<SessionFinancialsView
								ledger={consoleData.ledgerPlayers.map((p) => ({
									id: p.id,
									name: p.displayName,
									subtitle: p.admissionStatus,
									games: 0,
									timeRange: "—",
									payment: "pending",
								}))}
								lineItems={[]}
								totalCost="—"
								profit="—"
							/>
						</TabsContent>

						<TabsContent value="feed">
							<p className="text-small text-text-secondary">
								Session feed and announcements will appear here in a future
								update.
							</p>
						</TabsContent>
					</>
				)}
			</Tabs>

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
