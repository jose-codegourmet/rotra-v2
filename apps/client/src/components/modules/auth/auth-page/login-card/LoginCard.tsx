import { LoginCardCopyright } from "@/components/modules/auth/auth-page/login-card/LoginCardCopyright";
import { LoginCardForm } from "./LoginCardForm";

export function LoginCard() {
	return (
		<div
			className="w-full rounded-xl border border-border bg-bg-surface p-8"
			style={{
				boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
				<header
					style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
				>
					<h2 className="text-2xl font-bold tracking-tight text-text-primary">
						Welcome to ROTRA
					</h2>
					<p className="text-sm leading-relaxed text-text-secondary">
						Sign in to access your sessions, player queue, and court activity.
					</p>
				</header>

				<LoginCardForm />

				<LoginCardCopyright />
			</div>
		</div>
	);
}
