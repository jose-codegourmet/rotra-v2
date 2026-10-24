"use client";
import Link from "next/link";

export function LoginCardCopyright() {
	return (
		<footer>
			<p className="text-center text-[0.6875rem] leading-relaxed text-text-disabled">
				By continuing, you agree to our{" "}
				<Link
					href="/terms"
					className="text-text-secondary underline underline-offset-4 transition-colors duration-150 hover:text-text-primary"
				>
					Terms of Service
				</Link>{" "}
				and{" "}
				<Link
					href="/privacy"
					className="text-text-secondary underline underline-offset-4 transition-colors duration-150 hover:text-text-primary"
				>
					Privacy Policy
				</Link>
				.
			</p>
		</footer>
	);
}
