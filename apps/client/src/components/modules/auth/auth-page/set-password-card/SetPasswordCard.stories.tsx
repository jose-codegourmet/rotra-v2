import type { Meta, StoryObj } from "@storybook/react";
import { QueryProvider } from "@/providers/QueryProvider";
import { SetPasswordCard } from "./SetPasswordCard";

const meta: Meta<typeof SetPasswordCard> = {
	title: "Modules/Auth/SetPasswordCard",
	component: SetPasswordCard,
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
type Story = StoryObj<typeof SetPasswordCard>;
export const Invite: Story = { args: { mode: "invite" } };
export const Reset: Story = { args: { mode: "reset" } };
