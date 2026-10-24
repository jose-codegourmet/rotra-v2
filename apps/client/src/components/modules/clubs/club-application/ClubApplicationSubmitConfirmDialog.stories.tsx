import type { Meta, StoryObj } from "@storybook/react";

import { ClubApplicationSubmitConfirmDialog } from "./ClubApplicationSubmitConfirmDialog";

const meta: Meta<typeof ClubApplicationSubmitConfirmDialog> = {
	title: "modules/clubs/ClubApplicationSubmitConfirmDialog",
	component: ClubApplicationSubmitConfirmDialog,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ClubApplicationSubmitConfirmDialog>;

export const Submit: Story = {
	args: {
		open: true,
		onOpenChange: () => {},
		isUpdate: false,
		busy: false,
		onConfirm: () => {},
	},
};

export const Update: Story = {
	args: {
		open: true,
		onOpenChange: () => {},
		isUpdate: true,
		busy: false,
		onConfirm: () => {},
	},
};
