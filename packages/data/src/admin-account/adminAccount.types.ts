export type AdminAccount = { id: string; email: string }
export type AdminSession =
  | { kind: 'owner'; account: AdminAccount }
  | { kind: 'denied'; accountDescription: string }
  | { kind: 'signed-out'; sessionEnded: boolean }
export type AdminSignInInput = { email: string; password: string }
