import type { Meta, StoryObj } from "@storybook/react";
import { QueryProvider } from "@/providers/QueryProvider";
import { PlayerSignUpCard } from "./PlayerSignUpCard";

const meta: Meta<typeof PlayerSignUpCard> = {
	title: "Modules/Auth/PlayerSignUpCard",
	component: PlayerSignUpCard,
	decorators: [
		(Story) => (
			<QueryProvider>
				<div className="w-[420px] bg-bg-base p-6">
					<Story />
				</div>
			</QueryProvider>
		),
	],
};
export default meta;
type Story = StoryObj<typeof PlayerSignUpCard>;
export const Default: Story = {};
