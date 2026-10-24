import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginCard } from "./login-card/LoginCard";

const meta: Meta<typeof LoginCard> = {
	title: "Modules/Auth/LoginCard",
	component: LoginCard,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => {
			const queryClient = new QueryClient();
			return (
				<QueryClientProvider client={queryClient}>
					<div className="w-full max-w-[420px] bg-black p-6">
						<Story />
					</div>
				</QueryClientProvider>
			);
		},
	],
};

export default meta;

type Story = StoryObj<typeof LoginCard>;

export const Default: Story = {};
