export const sessionCostKeys = { all: ['session-cost'] as const, detail: (id: string) => ['session-cost', id] as const }
