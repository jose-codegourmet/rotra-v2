/** What an Admin action was taken on (rotra-admin.html log entries' `t`: 'club' or 'req'). */
export type AdminAuditTargetType = 'club' | 'contact_change_request'

/**
 * One line of the Admin "Record of actions": who did what to which record, and when. Append-only;
 * never carries passwords, tokens or unnecessary contact values (admin_audit_events).
 */
export type AdminAuditEvent = {
  id: string
  /** The signed-in Admin's email */
  actor: string
  targetType: AdminAuditTargetType
  targetId: string
  /** ISO timestamp */
  at: string
  /** Plain-language description shown in the log */
  text: string
}
