import { NotificationItem } from "@/components/modules/notifications/notification-item/NotificationItem";
import type { Notification } from "@/constants/mock-notifications";

export interface NotificationsViewProps {
	notifications: Notification[];
}

export function NotificationsView({ notifications }: NotificationsViewProps) {
	return (
		<div className="mx-auto max-w-3xl space-y-6 px-4 md:px-0">
			<header className="flex h-14 min-h-14 items-center border-b border-border bg-bg-base">
				<h1 className="text-heading font-semibold text-text-primary">
					Notifications
				</h1>
			</header>
			<p className="text-small text-text-secondary">
				Session, club, and match alerts for your account.
			</p>
			{notifications.length === 0 ? (
				<p className="rounded-lg border border-border bg-bg-surface px-4 py-8 text-center text-body text-text-secondary">
					You&apos;re all caught up.
				</p>
			) : (
				<ul className="divide-y divide-border rounded-lg border border-border bg-bg-surface">
					{notifications.map((item) => (
						<li key={item.id}>
							<NotificationItem
								notification={item}
								compact={false}
								className="px-4 py-3"
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

NotificationsView.displayName = "NotificationsView";
