"use client";

import { UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SessionDiscoveryItem } from "@/types/session-discovery";

interface PlayerAvatarStackProps {
	session: SessionDiscoveryItem;
	compact?: boolean;
	className?: string;
}

export function PlayerAvatarStack({
	session,
	compact = false,
	className,
}: PlayerAvatarStackProps) {
	const { recentPlayers, acceptedCount, id: sessionId } = session;
	const avatarSize = compact ? "size-5" : "size-6";

	if (acceptedCount === 0) {
		return (
			<p
				className={cn("text-[10px] font-medium text-text-secondary", className)}
			>
				Be the first to join
			</p>
		);
	}

	const visiblePlayers = recentPlayers.slice(0, 3);
	const overflowCount = Math.max(acceptedCount - 3, 0);

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div className="flex items-center">
				{visiblePlayers.map((player, index) => (
					<div
						key={player.id}
						className={cn(
							avatarSize,
							"relative overflow-hidden rounded-full border-2 border-bg-base bg-bg-elevated",
							index > 0 && "-ml-2",
						)}
						style={{ zIndex: visiblePlayers.length - index }}
					>
						{player.avatarUrl ? (
							<Image
								src={player.avatarUrl}
								alt=""
								fill
								className="object-cover"
								sizes={compact ? "20px" : "24px"}
								unoptimized
							/>
						) : (
							<div className="flex size-full items-center justify-center">
								<UserIcon
									size={compact ? 10 : 12}
									strokeWidth={1.5}
									className="text-text-secondary"
								/>
							</div>
						)}
					</div>
				))}
			</div>
			{overflowCount > 0 ? (
				<Link
					href={`/find-sessions/${sessionId}`}
					className="text-[10px] font-bold text-accent hover:underline"
					onClick={(event) => event.stopPropagation()}
				>
					+{overflowCount} recently joined
				</Link>
			) : (
				<span className="text-[10px] font-medium text-text-secondary">
					{acceptedCount} joined
				</span>
			)}
		</div>
	);
}
