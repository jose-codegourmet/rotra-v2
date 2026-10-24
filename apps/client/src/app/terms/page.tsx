import { TermsOfServiceContent } from "@rotra/legal-content";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/logo/Logo";

export const metadata: Metadata = {
	title: "Terms of Service — ROTRA",
	description: "Terms governing your use of ROTRA websites and applications.",
};

export default function TermsOfServicePage() {
	return (
		<div className="min-h-screen bg-bg-base">
			<header className="border-b border-border px-4 py-6 md:px-6">
				<div className="mx-auto flex max-w-[480px] items-center justify-between gap-4">
					<Link
						href="/login"
						className="inline-flex items-center"
						aria-label="ROTRA"
					>
						<Logo variant="dark" className="h-8 w-auto" />
					</Link>
					<Link
						href="/login"
						className="text-label uppercase tracking-wide text-text-secondary transition-colors hover:text-accent"
					>
						Back to login
					</Link>
				</div>
			</header>
			<main className="mx-auto max-w-[480px] px-4 pb-16 pt-10 md:px-6">
				<TermsOfServiceContent />
			</main>
		</div>
	);
}
