"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group/InputGroup";
import { cn } from "@/lib/utils";

export type PasswordInputProps = React.ComponentProps<"input">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false);
	return (
		<InputGroup className="h-11 border-border bg-bg-base">
			<InputGroupInput
				{...props}
				type={visible ? "text" : "password"}
				className={cn("text-text-primary", className)}
			/>
			<InputGroupAddon align="inline-end">
				<InputGroupButton
					size="icon-sm"
					onClick={() => setVisible((current) => !current)}
					aria-label={visible ? "Hide password" : "Show password"}
					disabled={props.disabled}
				>
					{visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}
