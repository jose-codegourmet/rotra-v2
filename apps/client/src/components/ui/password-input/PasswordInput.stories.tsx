import type { Meta, StoryObj } from "@storybook/react";
import { PasswordInput } from "./PasswordInput";

const meta: Meta<typeof PasswordInput> = {
	title: "UI/PasswordInput",
	component: PasswordInput,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {
	args: { placeholder: "Password", autoComplete: "current-password" },
};

export const Invalid: Story = {
	args: { placeholder: "Password", "aria-invalid": true },
};
