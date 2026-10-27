export type AuthAudience = 'club' | 'player' | 'admin'
export type MockAccount = { id: string; name: string; audience: AuthAudience }
export type MockSession = { account: MockAccount }
export type SignInInput = { identifier: string; password: string }
