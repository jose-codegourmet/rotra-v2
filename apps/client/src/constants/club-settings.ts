import { Bell, Link, Lock, Shield, Users } from "lucide-react";

export const SETTINGS_SECTIONS = [
	{
		title: "General",
		items: [
			{
				icon: Shield,
				label: "Club Details",
				description: "Name, location, description",
				href: "#",
			},
			{
				icon: Lock,
				label: "Privacy & Visibility",
				description: "Public or private club",
				href: "#",
			},
		],
	},
	{
		title: "Membership",
		items: [
			{
				icon: Users,
				label: "Member Management",
				description: "Approve, remove, and manage roles",
				href: "#",
			},
			{
				icon: Lock,
				label: "Join Requests",
				description: "Auto-approve or manual review",
				href: "#",
			},
			{
				icon: Link,
				label: "Invite Links",
				description: "Create and manage invite links",
				href: "#",
			},
		],
	},
	{
		title: "Notifications",
		items: [
			{
				icon: Bell,
				label: "Club Notifications",
				description: "Session alerts and announcements",
				href: "#",
			},
		],
	},
];
