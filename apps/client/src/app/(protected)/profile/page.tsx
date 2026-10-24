import { Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProfileLeftColumn } from "@/components/modules/profile/layout/ProfileLeftColumn";
import { ProfileRightColumn } from "@/components/modules/profile/layout/ProfileRightColumn";

export const metadata: Metadata = {
	title: "Player Profile — ROTRA",
	description: "View player profile.",
};

export default async function PlayerProfilePage() {
	return (
		<>
			<div className="flex items-center justify-between px-4 md:px-8 pt-8">
				<h1 className="text-display font-bold text-text-primary tracking-tight">
					Profile
				</h1>
				<Link
					href="/settings/account"
					className="inline-flex items-center gap-2 text-small font-bold uppercase tracking-widest text-accent hover:opacity-90 transition-opacity duration-default"
				>
					<Settings size={18} strokeWidth={1.5} aria-hidden />
					Edit account
				</Link>
			</div>
			<div className="pb-12 px-4 md:px-8 flex flex-col lg:flex-row gap-8">
				<ProfileLeftColumn />
				<ProfileRightColumn />
			</div>
		</>
	);
}
