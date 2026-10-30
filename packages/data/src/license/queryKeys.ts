export const licenseKeys = {
  all: ['license'] as const,
  list: (id: string) => ['license', 'list', id] as const,
  detail: (id: string) => ['license', 'detail', id] as const,
  /** Admin A-LICENSE payment history for one club, newest first */
  terms: (clubId: string) => [...licenseKeys.all, 'terms', clubId] as const,
  /** The outcome of one Activate/Renew command, as Check status found it */
  operation: (sourceCommandId: string) =>
    [...licenseKeys.all, 'operation', sourceCommandId] as const,
}
