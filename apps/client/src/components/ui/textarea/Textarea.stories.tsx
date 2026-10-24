import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
	title: "UI/Textarea",
	component: Textarea,
	tags: ["autodocs"],
	argTypes: {
		disabled: { control: "boolean" },
		rows: { control: "number" },
	},
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
	args: {
		placeholder: "Write something…",
		rows: 4,
	},
};

export const WithValue: Story = {
	args: {
		defaultValue: "Existing content",
		rows: 4,
	},
};

export const Disabled: Story = {
	args: {
		placeholder: "Disabled",
		disabled: true,
		rows: 4,
	},
};

export const Invalid: Story = {
	args: {
		placeholder: "Invalid",
		"aria-invalid": true,
		rows: 4,
	},
};
