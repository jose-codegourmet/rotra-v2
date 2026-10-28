export const publicSessionKeys = {
  all: ['public-session'] as const,
  detail: (slug: string) => ['public-session', 'detail', slug] as const,
  myRequest: (slug: string) => ['public-session', 'my-request', slug] as const,
}
