export const sessionPaymentKeys = { all: ['session-payment'] as const, detail: (id: string) => ['session-payment', id] as const }
