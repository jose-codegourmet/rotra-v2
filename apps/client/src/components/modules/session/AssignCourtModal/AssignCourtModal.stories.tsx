"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "@/components/ui/button/Button";
import { MOCK_ASSIGN_PLAYERS } from "@/constants/mock-session-ui";

import { AssignCourtModal } from "./AssignCourtModal";

const meta: Meta<typeof AssignCourtModal> = {
	title: "session/AssignCourtModal",
	component: AssignCourtModal,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AssignCourtModal>;

export const Open: Story = {
	args: {
		open: true,
		onOpenChange: () => {},
		courtTitle: "Assign court — Court 03",
		players: MOCK_ASSIGN_PLAYERS,
	},
	decorators: [
		(Story) => (
			<div className="min-h-[520px] relative">
				<Story />
			</div>
		),
	],
};

export const WithTrigger: Story = {
	render: function Render() {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-4">
				<Button type="button" onClick={() => setOpen(true)}>
					Open assign modal
				</Button>
				<AssignCourtModal
					open={open}
					onOpenChange={setOpen}
					courtTitle="Assign court — Court 03"
					players={MOCK_ASSIGN_PLAYERS}
				/>
			</div>
		);
	},
};
