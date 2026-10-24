import type { Meta, StoryObj } from "@storybook/react";
import { QueryProvider } from "@/providers/QueryProvider";
import { PlayerSignInCard } from "./PlayerSignInCard";

const meta: Meta<typeof PlayerSignInCard> = {
	title: "Modules/Auth/PlayerSignInCard",
	component: PlayerSignInCard,
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
type Story = StoryObj<typeof PlayerSignInCard>;
export const Default: Story = {};
