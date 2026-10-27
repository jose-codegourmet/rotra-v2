export const licenseKeys = {
  all: ['license'] as const,
  list: (id: string) => ['license', 'list', id] as const,
  detail: (id: string) => ['license', 'detail', id] as const,
}
