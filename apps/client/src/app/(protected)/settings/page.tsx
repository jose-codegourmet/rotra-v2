import { ChevronRight, LogOut, Trash2 } from "lucide-react";
import type { Metadata } from "next";

import { SettingsProfileCard } from "@/components/modules/settings/settings-profile-card/SettingsProfileCard";
import { SETTINGS_SECTIONS } from "@/constants/account-settings";

export const metadata: Metadata = {
	title: "Settings — ROTRA",
	description: "Manage your account and app preferences.",
};

export default function SettingsPage() {
	return (
		<div className="max-w-[800px] mx-auto p-4 md:p-8">
			<div className="flex flex-col gap-6">
				{/* Page header */}
				<div>
					<p className="text-micro font-bold uppercase tracking-widest text-accent mb-1">
						Account
					</p>
					<h1 className="text-display font-bold text-text-primary tracking-tight">
						Settings
					</h1>
					<p className="text-body text-text-secondary mt-2">
						Manage your account and preferences.
					</p>
				</div>

				<SettingsProfileCard />

				{/* Settings sections */}
				{SETTINGS_SECTIONS.map((section) => (
					<div key={section.title} className="flex flex-col gap-2">
						<p className="text-small font-bold uppercase tracking-widest text-text-secondary px-1">
							{section.title}
						</p>
						<div className="bg-bg-surface border border-border rounded-lg overflow-hidden shadow-card">
							{section.items.map((item, idx) => {
								const Icon = item.icon;
								return (
									<a
										key={item.label}
										href={item.href}
										className={`flex items-center gap-4 px-5 py-4 hover:bg-bg-elevated transition-colors duration-default ${
											idx < section.items.length - 1
												? "border-b border-border"
												: ""
										}`}
									>
										<div className="size-9 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
											<Icon
												size={18}
												strokeWidth={1.5}
												className="text-text-secondary"
											/>
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-body font-medium text-text-primary">
												{item.label}
											</p>
											<p className="text-small text-text-secondary">
												{item.description}
											</p>
										</div>
										<ChevronRight
											size={16}
											strokeWidth={1.5}
											className="text-text-disabled shrink-0"
										/>
									</a>
								);
							})}
						</div>
					</div>
				))}

				{/* Session + account actions */}
				<div className="flex flex-col gap-2">
					<p className="text-small font-bold uppercase tracking-widest text-text-secondary px-1">
						Session
					</p>
					<div className="bg-bg-surface border border-border rounded-lg overflow-hidden shadow-card">
						<button
							type="button"
							className="w-full flex items-center gap-4 px-5 py-4 hover:bg-bg-elevated transition-colors duration-default border-b border-border"
						>
							<div className="size-9 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
								<LogOut
									size={18}
									strokeWidth={1.5}
									className="text-text-secondary"
								/>
							</div>
							<div className="flex-1 text-left">
								<p className="text-body font-medium text-text-primary">
									Log Out
								</p>
								<p className="text-small text-text-secondary">
									Sign out of your account
								</p>
							</div>
							<ChevronRight
								size={16}
								strokeWidth={1.5}
								className="text-text-disabled shrink-0"
							/>
						</button>
						<button
							type="button"
							className="w-full flex items-center gap-4 px-5 py-4 hover:bg-error/5 transition-colors duration-default"
						>
							<div className="size-9 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
								<Trash2 size={18} strokeWidth={1.5} className="text-error" />
							</div>
							<div className="flex-1 text-left">
								<p className="text-body font-medium text-error">
									Delete Account
								</p>
								<p className="text-small text-text-secondary">
									Permanently remove your account and data
								</p>
							</div>
							<ChevronRight
								size={16}
								strokeWidth={1.5}
								className="text-text-disabled shrink-0"
							/>
						</button>
					</div>
				</div>

				{/* App version */}
				<p className="text-small text-text-disabled text-center pb-4">
					ROTRA v0.1.0 · Beta
				</p>
			</div>
		</div>
	);
}
