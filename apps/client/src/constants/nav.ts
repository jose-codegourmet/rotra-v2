import { Bell, CalendarClock, Gauge, Trophy, User } from "lucide-react";

export type NavItemId =
	| "home"
	| "clubs"
	| "find-sessions"
	| "profile"
	| "notifications";

export const NAV_ITEMS = [
	{ id: "home" as NavItemId, label: "Home", Icon: Gauge, href: "/dashboard" },
	{ id: "clubs" as NavItemId, label: "Clubs", Icon: Trophy, href: "/clubs" },
	{
		id: "find-sessions" as NavItemId,
		label: "Find Sessions",
		Icon: CalendarClock,
		href: "/find-sessions",
	},
	{
		id: "profile" as NavItemId,
		label: "Profile",
		Icon: User,
		href: "/profile",
	},
	{
		id: "notifications" as NavItemId,
		label: "Notifications",
		Icon: Bell,
		href: "/notifications",
	},
];
