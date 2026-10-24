/**
 * Stub until Supabase codegen is wired. Replace by running:
 *
 *   supabase gen types typescript --project-id <ref> > packages/db/src/supabase-database.types.ts
 *
 * Or with the local CLI + linked project:
 *
 *   supabase gen types typescript --local > packages/db/src/supabase-database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
