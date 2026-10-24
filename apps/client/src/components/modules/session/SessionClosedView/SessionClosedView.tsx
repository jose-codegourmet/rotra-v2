import { formatSessionDateTime } from "@/lib/sessions/session-display-utils";
import { cn } from "@/lib/utils";
import type { SessionLiveContext } from "@/types/session-live";

export interface SessionClosedViewProps {
	session: SessionLiveContext;
	className?: string;
}

export function SessionClosedView({
	session,
	className,
}: SessionClosedViewProps) {
	const statusLabel =
		session.status === "cancelled"
			? "Cancelled"
			: session.status === "completed"
				? "Completed"
				: "Closed";

	return (
		<div
			className={cn(
				"mx-auto max-w-[720px] rounded-lg border border-border bg-bg-surface p-8 text-center space-y-3",
				className,
			)}
		>
			<p className="text-micro font-bold uppercase tracking-widest text-text-disabled">
				{statusLabel}
			</p>
			<h1 className="text-xl font-black text-text-primary">
				{session.sessionTitle}
			</h1>
			<p className="text-small text-text-secondary">
				{session.location} · {formatSessionDateTime(session.dateTime)}
			</p>
			<p className="text-small text-text-secondary">
				This session is no longer active. History and standings will appear here
				in a future update.
			</p>
		</div>
	);
}
