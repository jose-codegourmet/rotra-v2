"use client";

import {
	PlayerActiveView,
	PlayerLobby,
	QMActiveConsole,
	QMPreActiveLobby,
	SessionClosedView,
} from "@/components/modules/session";
import { useSessionLive } from "@/hooks/useSessionLive";

export interface SessionLiveClientProps {
	sessionId: string;
}

export function SessionLiveClient({ sessionId }: SessionLiveClientProps) {
	const { data: sessionLive, isLoading } = useSessionLive(sessionId);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-[1100px] p-4 md:p-8">
				<p className="text-small text-text-secondary">Loading session…</p>
			</div>
		);
	}

	if (!sessionLive) {
		return null;
	}

	const wrapperClass = "max-w-[1100px] mx-auto p-4 md:p-8";

	if (
		sessionLive.status === "closed" ||
		sessionLive.status === "completed" ||
		sessionLive.status === "cancelled"
	) {
		return (
			<div className={wrapperClass}>
				<SessionClosedView session={sessionLive} />
			</div>
		);
	}

	if (sessionLive.status === "open") {
		return (
			<div className={wrapperClass}>
				{sessionLive.isOwner ? (
					<QMPreActiveLobby session={sessionLive} />
				) : (
					<PlayerLobby session={sessionLive} />
				)}
			</div>
		);
	}

	if (sessionLive.status === "active") {
		return (
			<div className={wrapperClass}>
				{sessionLive.isOwner ? (
					<QMActiveConsole session={sessionLive} />
				) : (
					<PlayerActiveView session={sessionLive} />
				)}
			</div>
		);
	}

	return (
		<div className={wrapperClass}>
			<SessionClosedView session={sessionLive} />
		</div>
	);
}
