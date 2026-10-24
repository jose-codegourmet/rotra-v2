import type { Metadata } from "next";
import Link from "next/link";
import { LoginPageFooter } from "@/components/modules/auth/auth-page/login-page-footer/LoginPageFooter";
import { PlayerSignInCard } from "@/components/modules/auth/auth-page/player-sign-in-card/PlayerSignInCard";
import DarkVeil from "@/components/ui/dark-veil/DarkVeil";
import { Logo } from "@/components/ui/logo/Logo";

export const metadata: Metadata = {
	title: "Login — ROTRA",
};

const ERROR_MESSAGES: Record<string, string> = {
	oauth: "We could not complete that sign-in. Try again.",
	auth: "We could not complete that sign-in. Try again.",
	session_expired: "Your session expired. Please sign in again.",
	invalid_link: "That link is invalid. Request a new one.",
	reset_expired: "That reset link expired. Request a new one.",
	invite_expired: "That invitation link expired. Ask for a new invitation.",
};

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{
		next?: string;
		error?: string;
		reset?: string;
		password?: string;
	}>;
}) {
	const params = await searchParams;
	const message =
		params.reset === "1"
			? "Password updated. Sign in with your new password."
			: params.password === "1"
				? "Password saved. Sign in to continue."
				: params.error
					? ERROR_MESSAGES[params.error]
					: undefined;
	return (
		<div className="relative min-h-screen overflow-hidden bg-bg-base">
			{/* Dark Veil animated WebGL background */}
			<div className="absolute inset-0">
				<DarkVeil speed={1.4} />
			</div>

			{/* Readability overlay */}
			<div className="absolute inset-0 bg-bg-base/55" />

			{/* Radial depth accents */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/4 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
				<div className="absolute bottom-1/4 right-1/3 h-[320px] w-[320px] rounded-full bg-accent-dim/5 blur-3xl" />
			</div>

			{/* Main content — centered column */}
			<main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-12">
				{/* Brand block */}
				<div className="animate-auth-fade-up mb-8 flex flex-col items-center text-center">
					<Logo variant="dark" className="w-48" />
					<p className="mt-3 text-xs font-medium tracking-[0.2em] text-text-disabled uppercase">
						Run the game.
					</p>
				</div>

				{/* Auth card */}
				<div className="animate-auth-fade-up-delayed w-full max-w-[420px]">
					{message ? (
						<div
							className="mb-4 rounded-lg border border-border bg-bg-surface p-3 text-sm text-text-secondary"
							role="status"
						>
							{message}
							{params.error === "reset_expired" ? (
								<>
									{" "}
									<Link
										href="/forgot-password"
										className="font-semibold text-accent underline underline-offset-4"
									>
										Request another link.
									</Link>
								</>
							) : null}
						</div>
					) : null}
					<PlayerSignInCard nextPath={params.next} />
				</div>
			</main>

			<LoginPageFooter showSystemStatus />
		</div>
	);
}
