import { Button } from "@/components/ui/button/Button";

export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-display text-text-primary">ROTRA Client</h1>
				<p className="text-body text-text-secondary">
					Player-facing app — coming soon.
				</p>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button>Default</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="link">Link</Button>
			</div>
		</main>
	);
}
