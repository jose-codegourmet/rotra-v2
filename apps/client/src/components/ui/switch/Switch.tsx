"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
	type SwitchVariants,
	switchThumbVariants,
	switchVariants,
} from "./Switch.variants";

export type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> &
	SwitchVariants;

export const Switch = React.forwardRef<
	React.ComponentRef<typeof SwitchPrimitive.Root>,
	SwitchProps
>(({ className, size, ...props }, ref) => (
	<SwitchPrimitive.Root
		ref={ref}
		data-slot="switch"
		className={cn(switchVariants({ size }), className)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			data-slot="switch-thumb"
			className={cn(switchThumbVariants({ size }))}
		/>
	</SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
