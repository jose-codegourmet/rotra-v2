import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "404 — Page Not Found · ROTRA",
	description: "This page does not exist.",
};

export default function NotFoundPage() {
	return (
		<div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-6 text-center">
			{/* Decorative number */}
			<p className="text-[120px] font-black text-text-primary leading-none tracking-tighter select-none">
				4<span className="text-accent">0</span>4
			</p>

			{/* Label */}
			<p className="text-micro font-bold uppercase tracking-widest text-accent mt-2">
				Page Not Found
			</p>

			{/* Description */}
			<p className="text-body text-text-secondary mt-4 max-w-sm">
				The page you&apos;re looking for doesn&apos;t exist or may have been
				moved.
			</p>

			{/* Actions */}
			<div className="flex items-center gap-3 mt-8">
				<Link
					href="/dashboard"
					className="h-11 px-6 flex items-center text-small font-black uppercase tracking-widest text-bg-base bg-gradient-to-br from-accent to-accent-dim rounded-md shadow-accent transition-transform active:scale-95"
				>
					Go Home
				</Link>
				<Link
					href="/explore"
					className="h-11 px-6 flex items-center text-small font-black uppercase tracking-widest text-text-primary border border-border rounded-md hover:bg-bg-elevated transition-colors duration-default"
				>
					Explore Clubs
				</Link>
			</div>

			{/* Footer hint */}
			<p className="text-small text-text-disabled mt-12">ROTRA</p>
		</div>
	);
}
