import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design System/Typography",
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

const SAMPLE = "The quick brown fox jumps over the lazy dog";

const typeScale = [
	{ token: "display", size: "28px", weight: "700", lh: "1.2", ls: "-0.5px" },
	{ token: "title", size: "22px", weight: "600", lh: "1.3", ls: "-0.3px" },
	{ token: "heading", size: "18px", weight: "600", lh: "1.4", ls: "-0.2px" },
	{ token: "body", size: "15px", weight: "400", lh: "1.5", ls: "0px" },
	{ token: "small", size: "13px", weight: "400", lh: "1.4", ls: "0.1px" },
	{ token: "label", size: "12px", weight: "500", lh: "1.2", ls: "0.5px" },
	{ token: "micro", size: "10px", weight: "500", lh: "1.2", ls: "0.8px" },
] as const;

const weights = [
	{ value: 300, label: "Light" },
	{ value: 400, label: "Regular" },
	{ value: 500, label: "Medium" },
	{ value: 700, label: "Bold" },
	{ value: 900, label: "Black" },
] as const;

export const TypeScale: Story = {
	render: () => (
		<div className="font-sans space-y-1 p-8">
			{typeScale.map(({ token, size, weight, lh, ls }) => (
				<div
					key={token}
					className="flex items-baseline gap-8 py-3 border-b border-border last:border-0"
				>
					<div className="w-28 shrink-0">
						<code className="text-micro text-accent">{`text-${token}`}</code>
						<div className="text-micro text-text-disabled mt-1">
							{size} / w{weight} / lh{lh} / ls{ls}
						</div>
					</div>
					{/* biome-ignore lint/suspicious/noExplicitAny: dynamic Tailwind token */}
					<p className={`text-text-primary text-${token as any} leading-none`}>
						{SAMPLE}
					</p>
				</div>
			))}
		</div>
	),
};

export const Weights: Story = {
	render: () => (
		<div className="font-sans space-y-1 p-8">
			{weights.map(({ value, label }) => (
				<div
					key={value}
					className="flex items-baseline gap-8 py-3 border-b border-border last:border-0"
				>
					<div className="w-28 shrink-0 text-small text-text-secondary">
						{label} <span className="text-text-disabled">{value}</span>
					</div>
					<p
						className="text-body text-text-primary"
						style={{ fontWeight: value }}
					>
						{SAMPLE}
					</p>
				</div>
			))}
		</div>
	),
};

export const Italic: Story = {
	render: () => (
		<div className="font-sans space-y-1 p-8">
			{weights.map(({ value, label }) => (
				<div
					key={value}
					className="flex items-baseline gap-8 py-3 border-b border-border last:border-0"
				>
					<div className="w-28 shrink-0 text-small text-text-secondary">
						{label} <span className="text-text-disabled">{value}</span>
					</div>
					<p
						className="text-body text-text-primary italic"
						style={{ fontWeight: value }}
					>
						{SAMPLE}
					</p>
				</div>
			))}
		</div>
	),
};
