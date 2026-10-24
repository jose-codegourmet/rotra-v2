import { SetPasswordCardForm } from "./SetPasswordCardForm";

export type SetPasswordCardProps = { mode: "invite" | "reset" };

export function SetPasswordCard({ mode }: SetPasswordCardProps) {
	return (
		<div className="w-full rounded-xl border border-border bg-bg-surface p-8 shadow-card">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-2">
					<h2 className="text-2xl font-bold tracking-tight text-text-primary">
						{mode === "reset" ? "Choose a new password" : "Set your password"}
					</h2>
					<p className="text-sm leading-relaxed text-text-secondary">
						{mode === "reset"
							? "Enter a new password for your ROTRA account."
							: "Choose a password for your ROTRA account."}
					</p>
				</header>
				<SetPasswordCardForm mode={mode} />
			</div>
		</div>
	);
}
