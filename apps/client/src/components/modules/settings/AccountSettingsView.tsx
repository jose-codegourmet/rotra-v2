"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChangePlayerPasswordForm } from "@/components/modules/settings/change-player-password-form/ChangePlayerPasswordForm";
import { DeletePlayerAccountSection } from "@/components/modules/settings/delete-player-account-section/DeletePlayerAccountSection";
import { FacebookManagedPasswordInfo } from "@/components/modules/settings/facebook-managed-password-info/FacebookManagedPasswordInfo";
import { UpdatePlayerNameForm } from "@/components/modules/settings/update-player-name-form/UpdatePlayerNameForm";

export type AccountSettingsViewProps = {
	profileId: string;
	name: string;
	email: string | null;
	isTesterAccount: boolean;
	isFacebookUser: boolean;
};

function SettingsSection({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div>
				<h2 className="text-body font-semibold text-text-primary">{title}</h2>
				<p className="mt-1 text-small text-text-secondary">{description}</p>
			</div>
			<div className="rounded-lg border border-border bg-bg-surface p-5 shadow-card">
				{children}
			</div>
		</section>
	);
}

function passwordSectionDescription(isFacebookUser: boolean): string {
	if (isFacebookUser) {
		return "Your account uses Facebook sign-in. Password changes are managed on Facebook.";
	}
	return "Manage your account password.";
}

export function AccountSettingsView({
	name,
	email,
	isFacebookUser,
}: AccountSettingsViewProps) {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
			<div>
				<Link
					href="/settings"
					className="text-small font-bold uppercase tracking-widest text-accent"
				>
					← Settings
				</Link>
				<h1 className="mt-2 text-display font-bold text-text-primary tracking-tight">
					Account
				</h1>
				<p className="mt-2 text-body text-text-secondary">
					Update your display name, password, or permanently delete your
					account.
				</p>
			</div>

			<SettingsSection
				title="Profile information"
				description="Update your display name. Email is managed by your sign-in provider and cannot be changed here."
			>
				<UpdatePlayerNameForm
					key={name}
					name={name}
					email={email}
					onSuccess={() => undefined}
					onError={() => undefined}
				/>
			</SettingsSection>

			<SettingsSection
				title="Password"
				description={passwordSectionDescription(isFacebookUser)}
			>
				{isFacebookUser ? (
					<FacebookManagedPasswordInfo />
				) : (
					<ChangePlayerPasswordForm
						onSuccess={() => undefined}
						onError={() => undefined}
					/>
				)}
			</SettingsSection>

			<section className="flex flex-col gap-3">
				<div>
					<h2 className="text-body font-semibold text-text-primary">
						Account deletion
					</h2>
					<p className="mt-1 text-small text-text-secondary">
						Remove your ROTRA account from the platform.
					</p>
				</div>
				<DeletePlayerAccountSection name={name} email={email} />
			</section>
		</div>
	);
}

AccountSettingsView.displayName = "AccountSettingsView";
