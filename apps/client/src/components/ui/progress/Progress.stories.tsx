import type { Meta, StoryObj } from "@storybook/react";

import { Progress, ProgressLabel, ProgressValue } from "./Progress";

const meta: Meta<typeof Progress> = {
	title: "UI/Progress",
	component: Progress,
	tags: ["autodocs"],
	argTypes: {
		value: { control: { type: "range", min: 0, max: 100, step: 1 } },
	},
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Zero: Story = {
	args: { value: 0 },
	render: (args) => (
		<Progress {...args}>
			<ProgressLabel>Upload</ProgressLabel>
			<ProgressValue />
		</Progress>
	),
};

export const ThirtyThree: Story = {
	args: { value: 33 },
	render: (args) => (
		<Progress {...args}>
			<ProgressLabel>Upload</ProgressLabel>
			<ProgressValue />
		</Progress>
	),
};

export const SixtySix: Story = {
	args: { value: 66 },
	render: (args) => (
		<Progress {...args}>
			<ProgressLabel>Upload</ProgressLabel>
			<ProgressValue />
		</Progress>
	),
};

export const Complete: Story = {
	args: { value: 100 },
	render: (args) => (
		<Progress {...args}>
			<ProgressLabel>Upload</ProgressLabel>
			<ProgressValue />
		</Progress>
	),
};
