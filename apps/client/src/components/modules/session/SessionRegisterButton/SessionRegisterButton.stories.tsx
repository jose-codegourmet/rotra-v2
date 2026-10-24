import type { Meta, StoryObj } from "@storybook/react";

import { SessionRegisterButton } from "./SessionRegisterButton";

const meta: Meta<typeof SessionRegisterButton> = {
	title: "session/SessionRegisterButton",
	component: SessionRegisterButton,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionRegisterButton>;

export const Default: Story = {};
