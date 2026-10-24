import type { Metadata } from "next";
import { ForgotPasswordCard } from "@/components/modules/auth/auth-page/forgot-password-card/ForgotPasswordCard";
import { LoginPageFooter } from "@/components/modules/auth/auth-page/login-page-footer/LoginPageFooter";
import DarkVeil from "@/components/ui/dark-veil/DarkVeil";
import { Logo } from "@/components/ui/logo/Logo";

export const metadata: Metadata = {
	title: "Reset Password — ROTRA",
	robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-bg-base">
			<div className="absolute inset-0">
				<DarkVeil speed={1.4} />
			</div>
			<div className="absolute inset-0 bg-bg-base/55" />
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/4 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
				<div className="absolute bottom-1/4 right-1/3 h-[320px] w-[320px] rounded-full bg-accent-dim/5 blur-3xl" />
			</div>
			<main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-12">
				<div className="animate-auth-fade-up mb-8 flex flex-col items-center text-center">
					<Logo variant="dark" className="w-48" />
					<p className="mt-3 text-xs font-medium tracking-[0.2em] text-text-disabled uppercase">
						Run the game.
					</p>
				</div>
				<div className="animate-auth-fade-up-delayed w-full max-w-[420px]">
					<ForgotPasswordCard />
				</div>
			</main>
			<LoginPageFooter />
		</div>
	);
}
