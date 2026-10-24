import { SESSION_QUEUE_STATUS_LABELS } from "@/constants/mock-session-join";
import { cn } from "@/lib/utils";
import {
	type SessionQueueStatusBadgeVariants,
	sessionQueueStatusBadgeVariants,
} from "./SessionQueueStatusBadge.variants";

export type SessionQueueStatusBadgeProps = {
	status: NonNullable<SessionQueueStatusBadgeVariants["status"]>;
	className?: string;
};

export function SessionQueueStatusBadge({
	status,
	className,
}: SessionQueueStatusBadgeProps) {
	return (
		<span
			className={cn(sessionQueueStatusBadgeVariants({ status }), className)}
		>
			{SESSION_QUEUE_STATUS_LABELS[status]}
		</span>
	);
}

SessionQueueStatusBadge.displayName = "SessionQueueStatusBadge";
