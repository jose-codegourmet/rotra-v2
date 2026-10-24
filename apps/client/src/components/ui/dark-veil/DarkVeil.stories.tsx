"use client";

import type { Meta, StoryObj } from "@storybook/react";
import DarkVeil from "./DarkVeil";

const meta: Meta<typeof DarkVeil> = {
	title: "UI/DarkVeil",
	component: DarkVeil,
	tags: ["autodocs"],
	argTypes: {
		hueShift: { control: { type: "range", min: 0, max: 360, step: 1 } },
		noiseIntensity: {
			control: { type: "range", min: 0, max: 0.2, step: 0.01 },
		},
		scanlineIntensity: {
			control: { type: "range", min: 0, max: 1, step: 0.05 },
		},
		speed: { control: { type: "range", min: 0, max: 2, step: 0.05 } },
		scanlineFrequency: {
			control: { type: "range", min: 0, max: 0.05, step: 0.001 },
		},
		warpAmount: { control: { type: "range", min: 0, max: 2, step: 0.05 } },
		resolutionScale: {
			control: { type: "range", min: 0.25, max: 1, step: 0.05 },
		},
	},
};

export default meta;
type Story = StoryObj<typeof DarkVeil>;

export const Default: Story = {
	args: {
		hueShift: 78,
		noiseIntensity: 0,
		scanlineIntensity: 0,
		speed: 0.5,
		scanlineFrequency: 0,
		warpAmount: 0,
		resolutionScale: 1,
	},
	render: (args) => (
		<div className="relative h-64 w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-bg-base">
			<DarkVeil {...args} />
		</div>
	),
};
