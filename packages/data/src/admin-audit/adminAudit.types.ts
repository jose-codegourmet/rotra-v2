/** What an Admin action was taken on (rotra-admin.html log entries' `t`: 'club', 'req', 'flag', config). */
export type AdminAuditTargetType =
  | 'player'
  | 'club'
  | 'contact_change_request'
  | 'feature_flag'
  | 'ranking_settings'
  | 'profile_character'

/**
 * Proposed action codes for admin_audit_events.action; no list is decided yet. Later Admin tickets
 * add theirs (license, contact change, ranking and feature flag actions) here.
 */
export type AdminAuditAction =
  | 'player_created'
  | 'player_updated'
  | 'player_archived'
  | 'player_restored'
  | 'player_removed'
  | 'player_link_issued'
  | 'club_created'
  | 'club_price_changed'
  | 'club_name_change_approved'
  | 'club_name_change_rejected'
  | 'license_activated'
  | 'license_renewed'
  | 'contact_change_submitted'
  | 'contact_change_approved'
  | 'contact_change_declined'
  | 'contact_change_applied'
  | 'contact_change_application_failed'
  | 'contact_change_application_retried'
  | 'feature_flag_created'
  | 'feature_flag_value_changed'
  | 'profile_character_added'
  | 'profile_character_shown'
  | 'profile_character_hidden'
  | 'profile_character_deleted'
  | 'profile_character_restored'

/**
 * One line of the Admin "Record of actions": who did what to which record, and when. Append-only;
 * the summary never carries passwords, tokens or unnecessary contact values (admin_audit_events).
 */
export type AdminAuditEvent = {
  id: string
  /** The signed-in Admin's email */
  actorEmail: string
  action: AdminAuditAction
  targetType: AdminAuditTargetType
  targetId: string
  /** ISO timestamp */
  at: string
  /** Plain-language description shown in the log */
  summary: string
}
