import type { Meta, StoryObj } from "@storybook/react";
import { QueryProvider } from "@/providers/QueryProvider";
import { ForgotPasswordCard } from "./ForgotPasswordCard";

const meta: Meta<typeof ForgotPasswordCard> = {
	title: "Modules/Auth/ForgotPasswordCard",
	component: ForgotPasswordCard,
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
type Story = StoryObj<typeof ForgotPasswordCard>;
export const Default: Story = {};
