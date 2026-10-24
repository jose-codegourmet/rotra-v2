"use client";

import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { ClubMemberRow } from "@/constants/mock-club";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<ClubMemberRow>();

const columns = [
	columnHelper.accessor("name", {
		header: "Name",
		cell: (info) => (
			<span className="font-medium text-text-primary">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("email", {
		header: "Email",
		cell: (info) => (
			<span className="text-text-secondary">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("role", {
		header: "Role",
		cell: (info) => <RoleBadge role={info.getValue()} />,
	}),
	columnHelper.accessor("joinedAt", {
		header: "Joined",
		cell: (info) => (
			<span className="text-text-secondary">{info.getValue()}</span>
		),
	}),
];

function RoleBadge({ role }: { role: ClubMemberRow["role"] }) {
	const label =
		role === "que_master"
			? "Que Master"
			: role === "owner"
				? "Owner"
				: "Player";
	const className =
		role === "owner"
			? "bg-bg-elevated text-text-primary border border-border"
			: role === "que_master"
				? "bg-accent/15 text-accent border border-accent/30"
				: "bg-bg-base text-text-secondary border border-border";
	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
				className,
			)}
		>
			{label}
		</span>
	);
}

export function ClubProfileMembersTable({ data }: { data: ClubMemberRow[] }) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="rounded-lg border border-border bg-bg-surface overflow-x-auto">
			<table className="w-full min-w-[520px] text-left text-small">
				<thead>
					{table.getHeaderGroups().map((hg) => (
						<tr key={hg.id} className="border-b border-border bg-bg-base">
							{hg.headers.map((h) => (
								<th
									key={h.id}
									className="px-4 py-3 text-micro font-bold uppercase tracking-widest text-text-secondary"
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
							className="border-b border-border last:border-0 hover:bg-bg-elevated/40 transition-colors"
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
