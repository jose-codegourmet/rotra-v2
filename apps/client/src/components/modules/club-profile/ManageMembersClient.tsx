"use client";

import * as React from "react";
import { toast } from "sonner";
import { AddQueMasterDialog } from "@/components/modules/club-profile/AddQueMasterDialog";
import { ClubManageMembersTable } from "@/components/modules/club-profile/ClubManageMembersTable";
import { ProvisionBox } from "@/components/modules/club-profile/ProvisionBox";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog/AlertDialog";
import { Button } from "@/components/ui/button/Button";
import type { ManageMemberRow } from "@/constants/mock-club";
import { MOCK_MANAGE_MEMBER_ROWS } from "@/constants/mock-club";

export function ManageMembersClient({
	initialRows = MOCK_MANAGE_MEMBER_ROWS,
}: {
	initialRows?: ManageMemberRow[];
}) {
	const [rows, setRows] = React.useState<ManageMemberRow[]>(() => [
		...initialRows,
	]);
	const [addOpen, setAddOpen] = React.useState(false);
	const [pendingPromote, setPendingPromote] =
		React.useState<ManageMemberRow | null>(null);

	const players = React.useMemo(
		() => rows.filter((r) => r.role === "player"),
		[rows],
	);

	const confirmPromote = () => {
		if (!pendingPromote) return;
		setRows((prev) =>
			prev.map((r) =>
				r.id === pendingPromote.id ? { ...r, role: "que_master" as const } : r,
			),
		);
		toast.success(`${pendingPromote.name} added as Que Master (demo).`);
		setPendingPromote(null);
		setAddOpen(false);
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h2 className="text-title font-bold text-text-primary">Members</h2>
					<p className="text-small text-text-secondary mt-1">
						Operator-oriented grid — different from the public profile roster.
					</p>
				</div>
				<Button
					type="button"
					className="h-11 px-5 text-small font-black uppercase tracking-widest text-bg-base bg-accent rounded-md shadow-accent shrink-0"
					onClick={() => setAddOpen(true)}
				>
					Add Que Master
				</Button>
			</div>

			<ClubManageMembersTable rows={rows} setRows={setRows} />

			<div className="grid gap-4 md:grid-cols-2">
				<ProvisionBox title="Bulk assign QM">
					Multi-select and role changes will be built in a later phase.
				</ProvisionBox>
				<ProvisionBox title="Member import / export">
					CSV or roster sync placeholders.
				</ProvisionBox>
			</div>

			<AddQueMasterDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				players={players}
				onPickPlayer={setPendingPromote}
			/>

			<AlertDialog
				open={pendingPromote !== null}
				onOpenChange={(open) => {
					if (!open) setPendingPromote(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pendingPromote
								? `Promote ${pendingPromote.name} to Que Master?`
								: ""}
						</AlertDialogTitle>
						<AlertDialogDescription>
							They will appear as a Que Master in this table. This is a local
							mock update only.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Back</AlertDialogCancel>
						<AlertDialogAction type="button" onClick={confirmPromote}>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
