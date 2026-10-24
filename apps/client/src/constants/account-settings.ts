import {
	Bell,
	Globe,
	Lock,
	Moon,
	Shield,
	Smartphone,
	User,
} from "lucide-react";

export const SETTINGS_SECTIONS = [
	{
		title: "Account",
		items: [
			{
				icon: User,
				label: "Profile Information",
				description: "Name, email, account deletion",
				href: "/settings/account",
			},
			{
				icon: Lock,
				label: "Password & Security",
				description: "Change password (tester accounts)",
				href: "/settings/account",
			},
			{
				icon: Globe,
				label: "Language & Region",
				description: "Language, timezone, currency",
				href: "#",
			},
		],
	},
	{
		title: "Preferences",
		items: [
			{
				icon: Bell,
				label: "Notifications",
				description: "Session alerts, club updates",
				href: "#",
			},
			{
				icon: Moon,
				label: "Appearance",
				description: "Light, dark, or system theme",
				href: "#",
			},
			{
				icon: Smartphone,
				label: "App & Display",
				description: "Font size, accessibility",
				href: "#",
			},
		],
	},
	{
		title: "Privacy",
		items: [
			{
				icon: Shield,
				label: "Privacy Settings",
				description: "Who can see your profile",
				href: "#",
			},
			{
				icon: Lock,
				label: "Blocked Players",
				description: "Manage blocked accounts",
				href: "#",
			},
		],
	},
];
