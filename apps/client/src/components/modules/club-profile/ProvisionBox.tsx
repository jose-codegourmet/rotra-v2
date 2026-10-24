import type { ReactNode } from "react";

export function ProvisionBox({
	title,
	children,
}: {
	title: string;
	children?: ReactNode;
}) {
	return (
		<div className="rounded-lg border border-dashed border-border bg-bg-surface/60 p-4">
			<p className="text-micro font-bold uppercase tracking-widest text-accent mb-2">
				{title}
			</p>
			<div className="text-small text-text-secondary">
				{children ?? "Reserved for refined UI."}
			</div>
		</div>
	);
}
