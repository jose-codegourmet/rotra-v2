import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
	title: "UI/Input",
	component: Input,
	tags: ["autodocs"],
	argTypes: {
		type: {
			control: "select",
			options: ["text", "email", "password", "search", "number", "tel", "url"],
		},
		disabled: { control: "boolean" },
	},
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
	args: {
		placeholder: "Placeholder",
		type: "text",
	},
};

export const WithValue: Story = {
	args: {
		defaultValue: "Hello",
		type: "text",
	},
};

export const Disabled: Story = {
	args: {
		placeholder: "Disabled",
		disabled: true,
	},
};

export const Invalid: Story = {
	args: {
		placeholder: "Invalid",
		"aria-invalid": true,
	},
};
