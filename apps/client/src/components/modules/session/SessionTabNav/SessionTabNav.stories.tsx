"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Tabs } from "@/components/ui/tabs/Tabs";
import type { SessionTabId } from "@/constants/mock-session-ui";

import { SessionTabNav } from "./SessionTabNav";

const meta: Meta<typeof SessionTabNav> = {
	title: "session/SessionTabNav",
	component: SessionTabNav,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionTabNav>;

export const Default: Story = {
	render: () => (
		<Tabs defaultValue="queue">
			<SessionTabNav />
		</Tabs>
	),
};

export const StandingActive: Story = {
	render: () => (
		<Tabs defaultValue="standing">
			<SessionTabNav />
		</Tabs>
	),
};

export const Interactive: Story = {
	render: function Render() {
		const [tab, setTab] = useState<SessionTabId>("queue");
		return (
			<Tabs value={tab} onValueChange={(v) => setTab(v as SessionTabId)}>
				<SessionTabNav />
			</Tabs>
		);
	},
};
