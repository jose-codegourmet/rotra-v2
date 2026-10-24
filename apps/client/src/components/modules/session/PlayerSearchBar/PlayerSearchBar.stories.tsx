"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { PlayerSearchBar } from "./PlayerSearchBar";

const meta: Meta<typeof PlayerSearchBar> = {
	title: "session/PlayerSearchBar",
	component: PlayerSearchBar,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PlayerSearchBar>;

function StatefulBar() {
	const [value, setValue] = useState("");
	return (
		<PlayerSearchBar
			value={value}
			onChange={setValue}
			onFilterClick={() => console.log("filter")}
		/>
	);
}

export const Interactive: Story = {
	render: () => <StatefulBar />,
};

export const Controlled: Story = {
	args: {
		value: "Marcus",
		onChange: () => {},
		placeholder: "Search…",
	},
};
