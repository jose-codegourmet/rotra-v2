import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSettingsView } from "@/components/modules/settings/AccountSettingsView";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
	title: "Account Settings — ROTRA",
	description: "Manage your account name, password, and deletion.",
};

export default async function AccountSettingsPage() {
	const profile = await getCurrentProfile();
	if (!profile) {
		redirect("/login");
	}

	let email: string | null = null;
	let isFacebookUser = false;
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		email = user?.email ?? null;
		isFacebookUser =
			user?.identities?.some((identity) => identity.provider === "facebook") ??
			false;
	} catch {
		email = null;
		isFacebookUser = false;
	}

	return (
		<div className="max-w-[800px] mx-auto p-4 md:p-8">
			<AccountSettingsView
				profileId={profile.id}
				name={profile.name}
				email={email}
				isTesterAccount={profile.isTesterAccount}
				isFacebookUser={isFacebookUser}
			/>
		</div>
	);
}
