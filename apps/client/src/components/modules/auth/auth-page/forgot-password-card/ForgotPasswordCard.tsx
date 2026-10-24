import { ForgotPasswordCardForm } from "./ForgotPasswordCardForm";

export function ForgotPasswordCard() {
	return (
		<div className="w-full rounded-xl border border-border bg-bg-surface p-8 shadow-card">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-2">
					<h2 className="text-2xl font-bold tracking-tight text-text-primary">
						Reset your password
					</h2>
					<p className="text-sm leading-relaxed text-text-secondary">
						Enter your email and we will send you a reset link.
					</p>
				</header>
				<ForgotPasswordCardForm />
			</div>
		</div>
	);
}
