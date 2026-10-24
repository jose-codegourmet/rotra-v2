import { LoginCardCopyright } from "@/components/modules/auth/auth-page/login-card/LoginCardCopyright";
import { PlayerSignUpCardForm } from "./PlayerSignUpCardForm";

export function PlayerSignUpCard() {
	return (
		<div className="w-full rounded-xl border border-border bg-bg-surface p-8 shadow-card">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-2">
					<h2 className="text-2xl font-bold tracking-tight text-text-primary">
						Create your account
					</h2>
					<p className="text-sm leading-relaxed text-text-secondary">
						Set up an email and password to start playing on ROTRA.
					</p>
				</header>
				<PlayerSignUpCardForm />
				<LoginCardCopyright />
			</div>
		</div>
	);
}
