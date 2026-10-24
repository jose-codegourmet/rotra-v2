import type { Meta, StoryObj } from "@storybook/react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { MobileHeader } from "./MobileHeader";

const meta: Meta<typeof MobileHeader> = {
	title: "Navigation/MobileHeader",
	component: MobileHeader,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<Provider store={store}>
				<Story />
			</Provider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof MobileHeader>;

export const Default: Story = {
	args: {
		unreadCount: 8,
	},
};
