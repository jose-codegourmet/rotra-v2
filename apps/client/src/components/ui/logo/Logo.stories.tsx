import type { Meta, StoryObj } from "@storybook/react";
import { Logo } from "./Logo";

const meta: Meta<typeof Logo> = {
	title: "UI/Logo",
	component: Logo,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["dark", "light"],
			description:
				"'dark' uses white marks (for dark backgrounds); 'light' uses dark marks (for light backgrounds)",
		},
	},
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Logo>;

// --- Full wordmark stories (container wide enough to show full logo) ---

export const Dark: Story = {
	args: { variant: "dark" },
	decorators: [
		(Story) => (
			<div
				style={{
					width: 280,
					padding: "32px 24px",
					background: "#0b0b0c",
					borderRadius: 12,
				}}
			>
				<Story />
			</div>
		),
	],
};

export const Light: Story = {
	args: { variant: "light" },
	decorators: [
		(Story) => (
			<div
				style={{
					width: 280,
					padding: "32px 24px",
					background: "#ffffff",
					borderRadius: 12,
					border: "1px solid #e4e4e9",
				}}
			>
				<Story />
			</div>
		),
	],
};

// --- Mini (icon-only) stories — container narrower than 160px breakpoint ---

export const DarkMini: Story = {
	name: "Dark — Mini",
	args: { variant: "dark" },
	decorators: [
		(Story) => (
			<div
				style={{
					width: 80,
					padding: "24px 16px",
					background: "#0b0b0c",
					borderRadius: 12,
				}}
			>
				<Story />
			</div>
		),
	],
};

export const LightMini: Story = {
	name: "Light — Mini",
	args: { variant: "light" },
	decorators: [
		(Story) => (
			<div
				style={{
					width: 80,
					padding: "24px 16px",
					background: "#ffffff",
					borderRadius: 12,
					border: "1px solid #e4e4e9",
				}}
			>
				<Story />
			</div>
		),
	],
};

// --- Side-by-side overview ---

export const AllVariants: Story = {
	name: "All Variants",
	render: () => (
		<div style={{ display: "grid", gap: 24 }}>
			<div style={{ display: "flex", gap: 24, alignItems: "center" }}>
				{/* Full — dark */}
				<div
					style={{
						width: 280,
						padding: "24px 20px",
						background: "#0b0b0c",
						borderRadius: 10,
					}}
				>
					<Logo variant="dark" />
				</div>
				{/* Mini — dark */}
				<div
					style={{
						width: 80,
						padding: "20px 16px",
						background: "#0b0b0c",
						borderRadius: 10,
					}}
				>
					<Logo variant="dark" />
				</div>
			</div>
			<div style={{ display: "flex", gap: 24, alignItems: "center" }}>
				{/* Full — light */}
				<div
					style={{
						width: 280,
						padding: "24px 20px",
						background: "#ffffff",
						borderRadius: 10,
						border: "1px solid #e4e4e9",
					}}
				>
					<Logo variant="light" />
				</div>
				{/* Mini — light */}
				<div
					style={{
						width: 80,
						padding: "20px 16px",
						background: "#ffffff",
						borderRadius: 10,
						border: "1px solid #e4e4e9",
					}}
				>
					<Logo variant="light" />
				</div>
			</div>
		</div>
	),
};
