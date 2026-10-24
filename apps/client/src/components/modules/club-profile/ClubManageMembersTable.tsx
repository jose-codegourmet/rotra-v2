"use client";

import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	type Row,
	useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import { Pill } from "@/components/ui/pill/Pill";
import type { ManageMemberRow } from "@/constants/mock-club";

const columnHelper = createColumnHelper<ManageMemberRow>();

function ManageMemberRowActions({
	row,
	setRows,
}: {
	row: Row<ManageMemberRow>;
	setRows: React.Dispatch<React.SetStateAction<ManageMemberRow[]>>;
}) {
	const [menuOpen, setMenuOpen] = React.useState(false);
	const [confirm, setConfirm] = React.useState<{
		kind: "promoteQm" | "removeQm" | "deactivate" | "reactivate";
		target: ManageMemberRow;
	} | null>(null);
	const [viewOpen, setViewOpen] = React.useState(false);

	const closeConfirm = () => setConfirm(null);

	const applyPromote = (target: ManageMemberRow) => {
		setRows((prev) =>
			prev.map((r) =>
				r.id === target.id ? { ...r, role: "que_master" as const } : r,
			),
		);
		toast.success(`${target.name} is now a Que Master (demo).`);
	};

	const applyRemoveQm = (target: ManageMemberRow) => {
		setRows((prev) =>
			prev.map((r) =>
				r.id === target.id ? { ...r, role: "player" as const } : r,
			),
		);
		toast.success(`Removed Que Master role from ${target.name} (demo).`);
	};

	const applyDeactivate = (target: ManageMemberRow) => {
		setRows((prev) =>
			prev.map((r) =>
				r.id === target.id ? { ...r, status: "inactive" as const } : r,
			),
		);
		toast.success(`${target.name} marked inactive (demo).`);
	};

	const applyReactivate = (target: ManageMemberRow) => {
		setRows((prev) =>
			prev.map((r) =>
				r.id === target.id ? { ...r, status: "active" as const } : r,
			),
		);
		toast.success(`${target.name} restored to active (demo).`);
	};

	const onConfirmPrimary = () => {
		if (!confirm) return;
		const { kind, target } = confirm;
		if (kind === "promoteQm") applyPromote(target);
		if (kind === "removeQm") applyRemoveQm(target);
		if (kind === "deactivate") applyDeactivate(target);
		if (kind === "reactivate") applyReactivate(target);
		closeConfirm();
	};

	const isOwner = row.original.role === "owner";
	const isQm = row.original.role === "que_master";
	const isPlayer = row.original.role === "player";
	const isInactive = row.original.status === "inactive";

	return (
		<>
			<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="text-text-secondary hover:text-text-primary"
						aria-label={`Actions for ${row.original.name}`}
					>
						<MoreHorizontal />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuItem
						onSelect={() => {
							setMenuOpen(false);
							setViewOpen(true);
						}}
					>
						View details
					</DropdownMenuItem>
					{!isOwner && isPlayer && (
						<DropdownMenuItem
							onSelect={() => {
								setMenuOpen(false);
								setConfirm({ kind: "promoteQm", target: row.original });
							}}
						>
							Promote to Que Master
						</DropdownMenuItem>
					)}
					{!isOwner && isQm && (
						<DropdownMenuItem
							onSelect={() => {
								setMenuOpen(false);
								setConfirm({ kind: "removeQm", target: row.original });
							}}
							className="text-error focus:text-error focus:bg-error/10"
						>
							Remove Que Master role
						</DropdownMenuItem>
					)}
					{!isOwner && !isInactive && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onSelect={() => {
									setMenuOpen(false);
									setConfirm({ kind: "deactivate", target: row.original });
								}}
								className="text-error focus:text-error focus:bg-error/10"
							>
								Deactivate member
							</DropdownMenuItem>
						</>
					)}
					{!isOwner && isInactive && (
						<DropdownMenuItem
							onSelect={() => {
								setMenuOpen(false);
								setConfirm({ kind: "reactivate", target: row.original });
							}}
						>
							Reactivate member
						</DropdownMenuItem>
					)}
					{isOwner && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem disabled className="text-text-disabled">
								Club owner — role locked
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent showCloseButton>
					<DialogHeader>
						<DialogTitle>{row.original.name}</DialogTitle>
						<DialogDescription>Operator record (mock data)</DialogDescription>
					</DialogHeader>
					<dl className="flex flex-col gap-3 text-small">
						<div className="flex flex-col gap-0.5">
							<dt className="text-micro font-bold uppercase tracking-widest text-text-secondary">
								Email
							</dt>
							<dd className="text-text-primary">{row.original.email}</dd>
						</div>
						<div className="flex flex-col gap-0.5">
							<dt className="text-micro font-bold uppercase tracking-widest text-text-secondary">
								Role
							</dt>
							<dd className="text-text-primary capitalize">
								{row.original.role.replace("_", " ")}
							</dd>
						</div>
						<div className="flex flex-col gap-0.5">
							<dt className="text-micro font-bold uppercase tracking-widest text-text-secondary">
								Status
							</dt>
							<dd className="text-text-primary">{row.original.status}</dd>
						</div>
						<div className="flex flex-col gap-0.5">
							<dt className="text-micro font-bold uppercase tracking-widest text-text-secondary">
								Matches managed
							</dt>
							<dd className="text-text-primary tabular-nums">
								{row.original.matchesManaged.toLocaleString()}
							</dd>
						</div>
					</dl>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={confirm !== null}
				onOpenChange={(open) => {
					if (!open) closeConfirm();
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirm?.kind === "promoteQm" &&
								`Make ${confirm.target.name} a Que Master?`}
							{confirm?.kind === "removeQm" &&
								`Remove Que Master role from ${confirm.target.name}?`}
							{confirm?.kind === "deactivate" &&
								`Deactivate ${confirm.target.name}?`}
							{confirm?.kind === "reactivate" &&
								`Restore ${confirm.target.name} to active?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirm?.kind === "promoteQm" &&
								"They will be able to help run sessions and manage queues. This demo only updates the table on this page."}
							{confirm?.kind === "removeQm" &&
								"They will return to a regular player role. Demo only — no server update."}
							{confirm?.kind === "deactivate" &&
								"They will not appear as active until reactivated. Demo only."}
							{confirm?.kind === "reactivate" &&
								"This marks the member as active again in the mock roster."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Cancel</AlertDialogCancel>
						<AlertDialogAction
							type="button"
							onClick={onConfirmPrimary}
							className={
								confirm &&
								(confirm.kind === "removeQm" || confirm.kind === "deactivate")
									? "bg-error text-text-primary hover:opacity-90"
									: undefined
							}
						>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function buildColumns(
	setRows: React.Dispatch<React.SetStateAction<ManageMemberRow[]>>,
) {
	return [
		columnHelper.display({
			id: "operator",
			header: "Operator",
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="text-body font-semibold text-text-primary">
						{row.original.name}
					</span>
					<span className="text-micro text-text-secondary">
						{row.original.email}
					</span>
				</div>
			),
		}),
		columnHelper.accessor("joinedAt", {
			header: "Joined",
			cell: (info) => (
				<span className="text-small text-text-secondary">
					{info.getValue()}
				</span>
			),
		}),
		columnHelper.accessor("role", {
			header: "Role",
			cell: (info) => {
				const role = info.getValue();
				const label =
					role === "que_master"
						? "Que Master"
						: role === "owner"
							? "Owner"
							: "Player";
				return (
					<span className="text-small font-medium text-text-primary">
						{label}
					</span>
				);
			},
		}),
		columnHelper.accessor("status", {
			header: "Status",
			cell: (info) => {
				const v = info.getValue();
				return <Pill variant={v === "active" ? "accent" : "muted"}>{v}</Pill>;
			},
		}),
		columnHelper.accessor("matchesManaged", {
			header: "Matches",
			cell: (info) => (
				<span className="text-title font-semibold text-text-primary tabular-nums">
					{info.getValue().toLocaleString()}
				</span>
			),
		}),
		columnHelper.display({
			id: "actions",
			header: "",
			cell: ({ row }) => <ManageMemberRowActions row={row} setRows={setRows} />,
		}),
	];
}

export function ClubManageMembersTable({
	rows,
	setRows,
}: {
	rows: ManageMemberRow[];
	setRows: React.Dispatch<React.SetStateAction<ManageMemberRow[]>>;
}) {
	const columns = React.useMemo(() => buildColumns(setRows), [setRows]);

	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="rounded-lg border border-border bg-bg-base overflow-x-auto">
			<table className="w-full min-w-[720px] text-left text-small">
				<thead>
					{table.getHeaderGroups().map((hg) => (
						<tr key={hg.id} className="border-b border-border bg-bg-surface">
							{hg.headers.map((h) => (
								<th
									key={h.id}
									className="px-4 py-3 text-micro font-bold uppercase tracking-widest text-accent"
								>
									{h.isPlaceholder
										? null
										: flexRender(h.column.columnDef.header, h.getContext())}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr
							key={row.id}
							className="border-b border-border last:border-0 hover:bg-bg-surface/80"
						>
							{row.getVisibleCells().map((cell) => (
								<td key={cell.id} className="px-4 py-3 align-middle">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
