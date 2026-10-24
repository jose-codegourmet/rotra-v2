"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "./InputOTP";

function OtpSix() {
	const [value, setValue] = useState("");
	return (
		<InputOTP maxLength={6} value={value} onChange={setValue}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	);
}

function OtpWithSeparator() {
	const [value, setValue] = useState("");
	return (
		<InputOTP maxLength={6} value={value} onChange={setValue}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
			</InputOTPGroup>
			<InputOTPSeparator />
			<InputOTPGroup>
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	);
}

const meta: Meta<typeof InputOTP> = {
	title: "UI/InputOTP",
	component: InputOTP,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InputOTP>;

export const Default: Story = {
	render: () => <OtpSix />,
};

export const WithSeparator: Story = {
	render: () => <OtpWithSeparator />,
};
