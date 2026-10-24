import type { Meta, StoryObj } from "@storybook/react";

import {
	Field,
	FieldDescription,
	FieldLabel,
} from "@/components/ui/field/Field";
import { Slider } from "./Slider";

const meta: Meta<typeof Slider> = {
	title: "UI/Slider",
	component: Slider,
	tags: ["autodocs"],
	argTypes: {
		min: { control: "number" },
		max: { control: "number" },
		disabled: { control: "boolean" },
	},
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
	args: {
		defaultValue: [50],
		min: 0,
		max: 100,
	},
};

export const Range: Story = {
	args: {
		defaultValue: [20, 80],
		min: 0,
		max: 100,
	},
};

export const Disabled: Story = {
	args: {
		defaultValue: [50],
		min: 0,
		max: 100,
		disabled: true,
	},
};

export const WithField: Story = {
	render: () => (
		<Field className="w-full max-w-sm">
			<FieldLabel htmlFor="slider-volume">Volume</FieldLabel>
			<Slider id="slider-volume" defaultValue={[50]} min={0} max={100} />
			<FieldDescription>Adjust the playback volume.</FieldDescription>
		</Field>
	),
};
