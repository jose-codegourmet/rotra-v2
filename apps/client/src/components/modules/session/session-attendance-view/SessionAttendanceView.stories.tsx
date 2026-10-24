import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_SESSION_ATTENDANCE,
	MOCK_SESSION_ATTENDANCE_META,
} from "@/constants/mock-session-attendance";
import { SessionAttendanceView } from "./SessionAttendanceView";

const meta: Meta<typeof SessionAttendanceView> = {
	title: "session/SessionAttendanceView",
	component: SessionAttendanceView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof SessionAttendanceView>;

export const Default: Story = {
	args: {
		session: MOCK_SESSION_ATTENDANCE,
		meta: MOCK_SESSION_ATTENDANCE_META,
		initialArrived: false,
	},
};

export const Arrived: Story = {
	args: {
		session: MOCK_SESSION_ATTENDANCE,
		meta: MOCK_SESSION_ATTENDANCE_META,
		initialArrived: true,
	},
};
