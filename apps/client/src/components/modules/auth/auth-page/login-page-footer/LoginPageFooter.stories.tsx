import type { Meta, StoryObj } from "@storybook/react";
import { LoginPageFooter } from "./LoginPageFooter";

const meta: Meta<typeof LoginPageFooter> = {
	title: "Modules/Auth/LoginPageFooter",
	component: LoginPageFooter,
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;

type Story = StoryObj<typeof LoginPageFooter>;

export const Default: Story = {};

export const WithSystemStatus: Story = {
	args: {
		showSystemStatus: true,
	},
};
