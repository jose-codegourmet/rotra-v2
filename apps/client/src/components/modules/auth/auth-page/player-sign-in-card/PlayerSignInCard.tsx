import { LoginCardCopyright } from "@/components/modules/auth/auth-page/login-card/LoginCardCopyright";
import { PlayerSignInCardForm } from "./PlayerSignInCardForm";

export type PlayerSignInCardProps = { nextPath?: string | undefined };

export function PlayerSignInCard({ nextPath }: PlayerSignInCardProps) {
	return (
		<div className="w-full rounded-xl border border-border bg-bg-surface p-8 shadow-card">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-2">
					<h2 className="text-2xl font-bold tracking-tight text-text-primary">
						Sign in
					</h2>
					<p className="text-sm leading-relaxed text-text-secondary">
						Use your email and password to get back to your sessions.
					</p>
				</header>
				<PlayerSignInCardForm nextPath={nextPath} />
				<LoginCardCopyright />
			</div>
		</div>
	);
}
