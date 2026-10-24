-- CreateEnum
CREATE TYPE "invitation_status_enum" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "playing_level_enum" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "format_preference_enum" AS ENUM ('singles', 'doubles', 'both');

-- CreateEnum
CREATE TYPE "court_position_enum" AS ENUM ('front', 'back', 'both');

-- CreateEnum
CREATE TYPE "play_mode_enum" AS ENUM ('competitive', 'social', 'both');

-- CreateEnum
CREATE TYPE "gear_category_enum" AS ENUM ('racket', 'shoes', 'bag');

-- CreateEnum
CREATE TYPE "racket_balance_enum" AS ENUM ('head_heavy', 'head_light', 'even_balanced');

-- CreateEnum
CREATE TYPE "shoe_fit_enum" AS ENUM ('wide', 'narrow', 'standard');

-- CreateEnum
CREATE TYPE "club_status_enum" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "club_role_enum" AS ENUM ('member', 'que_master', 'owner');

-- CreateEnum
CREATE TYPE "member_status_enum" AS ENUM ('active', 'removed', 'left');

-- CreateEnum
CREATE TYPE "join_method_enum" AS ENUM ('invite_link', 'direct_invite', 'request');

-- CreateEnum
CREATE TYPE "join_request_status_enum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "membership_action_enum" AS ENUM ('joined', 'removed', 'left', 'blacklisted', 'unblacklisted', 'que_master_assigned', 'que_master_revoked', 'join_request_approved', 'join_request_rejected', 'invite_link_rotated', 'ownership_transferred');

-- CreateEnum
CREATE TYPE "session_origin_enum" AS ENUM ('player_organized', 'club_queue');

-- CreateEnum
CREATE TYPE "schedule_type_enum" AS ENUM ('mmr', 'fun_games');

-- CreateEnum
CREATE TYPE "session_status_enum" AS ENUM ('draft', 'open', 'active', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "session_visibility_enum" AS ENUM ('club_members', 'open');

-- CreateEnum
CREATE TYPE "match_format_enum" AS ENUM ('best_of_1', 'best_of_3');

-- CreateEnum
CREATE TYPE "markup_type_enum" AS ENUM ('flat', 'percentage');

-- CreateEnum
CREATE TYPE "admission_status_enum" AS ENUM ('accepted', 'waitlisted', 'reserved', 'exited');

-- CreateEnum
CREATE TYPE "player_session_status_enum" AS ENUM ('not_arrived', 'i_am_in', 'i_am_prepared', 'playing', 'waiting', 'resting', 'eating', 'suspended', 'exited');

-- CreateEnum
CREATE TYPE "join_session_method_enum" AS ENUM ('app', 'qr');

-- CreateEnum
CREATE TYPE "payment_status_enum" AS ENUM ('unpaid', 'paid', 'partial');

-- CreateEnum
CREATE TYPE "match_status_enum" AS ENUM ('queued', 'active', 'completed', 'voided');

-- CreateEnum
CREATE TYPE "team_enum" AS ENUM ('team_a', 'team_b');

-- CreateEnum
CREATE TYPE "winning_team_enum" AS ENUM ('team_a', 'team_b', 'draw');

-- CreateEnum
CREATE TYPE "match_result_enum" AS ENUM ('win', 'loss', 'draw', 'unscored');

-- CreateEnum
CREATE TYPE "reviewer_role_enum" AS ENUM ('player', 'que_master', 'umpire');

-- CreateEnum
CREATE TYPE "exp_reason_enum" AS ENUM ('match_played', 'match_won', 'review_submitted', 'high_rating_received', 'umpire_duty', 'profile_completed', 'session_attended', 'match_voided_reversal');

-- CreateEnum
CREATE TYPE "mmr_reason_enum" AS ENUM ('match_won', 'match_lost', 'match_voided_reversal');

-- CreateEnum
CREATE TYPE "flag_status_enum" AS ENUM ('active', 'resolved');

-- CreateEnum
CREATE TYPE "notification_type_enum" AS ENUM ('session_reminder_2h', 'session_reminder_1h', 'session_reminder_30m', 'session_reminder_5m', 'session_started', 'match_assigned', 'umpire_assigned', 'score_near_limit', 'match_completed', 'waitlist_promoted', 'payment_reminder', 'session_ended', 'review_window_closing', 'leaderboard_published', 'join_request_result', 'direct_invite_received', 'club_owner_application_result');

-- CreateEnum
CREATE TYPE "application_status_enum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "moderation_entity_enum" AS ENUM ('review', 'player', 'club');

-- CreateEnum
CREATE TYPE "moderation_status_enum" AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "environment_enum" AS ENUM ('production', 'staging', 'development');

-- CreateTable
CREATE TABLE "club_owner_applications" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "club_name" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "status" "application_status_enum" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_owner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kill_switches" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "environment" "environment_enum" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kill_switches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_config" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_flags" (
    "id" UUID NOT NULL,
    "reporter_id" UUID,
    "entity_type" "moderation_entity_enum" NOT NULL,
    "entity_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "moderation_status_enum" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "status" "club_status_enum" NOT NULL DEFAULT 'active',
    "auto_approve" BOOLEAN NOT NULL DEFAULT false,
    "invite_link_enabled" BOOLEAN NOT NULL DEFAULT true,
    "invite_token" TEXT,
    "invite_token_created_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_members" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "role" "club_role_enum" NOT NULL DEFAULT 'member',
    "status" "member_status_enum" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_join_requests" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "method" "join_method_enum" NOT NULL,
    "status" "join_request_status_enum" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_blacklist" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_membership_audit_log" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "action" "membership_action_enum" NOT NULL,
    "performed_by" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_membership_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exp_transactions" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "exp_reason_enum" NOT NULL,
    "match_id" UUID,
    "session_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mmr_transactions" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "mmr_reason_enum" NOT NULL,
    "match_id" UUID NOT NULL,
    "pre_mmr" INTEGER NOT NULL,
    "post_mmr" INTEGER NOT NULL,
    "is_calibration" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mmr_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_tier_config" (
    "id" UUID NOT NULL,
    "tier_name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "min_exp" INTEGER NOT NULL,
    "badge_label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_tier_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbagging_flags" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "club_id" UUID,
    "reason" TEXT NOT NULL,
    "status" "flag_status_enum" NOT NULL DEFAULT 'active',
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_note" TEXT,
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbagging_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "court_number" INTEGER NOT NULL,
    "umpire_id" UUID,
    "status" "match_status_enum" NOT NULL DEFAULT 'queued',
    "queue_position" INTEGER NOT NULL DEFAULT 0,
    "team_a_score" INTEGER,
    "team_b_score" INTEGER,
    "winning_team" "winning_team_enum",
    "score_submitted_by" UUID,
    "finalized_by" UUID,
    "finalized_at" TIMESTAMPTZ(6),
    "void_reason" TEXT,
    "voided_by" UUID,
    "voided_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_players" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "team" "team_enum" NOT NULL,
    "result" "match_result_enum",
    "review_submitted" BOOLEAN NOT NULL DEFAULT false,
    "review_submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "type" "notification_type_enum" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "scheduled_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "facebook_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(6),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "playing_level" "playing_level_enum",
    "format_preference" "format_preference_enum",
    "court_position" "court_position_enum",
    "play_mode" "play_mode_enum",
    "age" INTEGER,
    "playing_since" INTEGER,
    "playing_since_less_than_one_year" BOOLEAN NOT NULL DEFAULT false,
    "tournament_wins_last_year" TEXT,
    "exp_total" INTEGER NOT NULL DEFAULT 0,
    "mmr" INTEGER NOT NULL DEFAULT 1000,
    "mmr_matches_played" INTEGER NOT NULL DEFAULT 0,
    "calibration_completed_at" TIMESTAMPTZ(6),
    "profile_completed_bonus_claimed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invited_by" UUID,
    "status" "invitation_status_enum" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_by" UUID,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_items" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "category" "gear_category_enum" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "balance_type" "racket_balance_enum",
    "string_brand" TEXT,
    "string_model" TEXT,
    "string_tension" DECIMAL(5,2),
    "grip" TEXT,
    "shoe_size" DECIMAL(4,1),
    "fit_type" "shoe_fit_enum",
    "capacity" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gear_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_item_links" (
    "id" UUID NOT NULL,
    "gear_item_id" UUID NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gear_item_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_dimensions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sub_skills" JSONB NOT NULL DEFAULT '[]',
    "weight" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_self_assessments" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "dimension_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "external_ratings_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_self_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_reviews" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "reviewee_id" UUID NOT NULL,
    "reviewer_role" "reviewer_role_enum" NOT NULL,
    "text_review" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "profanity_flagged" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_review_ratings" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "dimension_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "match_review_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_skill_ratings" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "dimension_id" UUID NOT NULL,
    "current_rating" DECIMAL(3,1) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_skill_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_sessions" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "origin" "session_origin_enum" NOT NULL,
    "schedule_type" "schedule_type_enum",
    "status" "session_status_enum" NOT NULL DEFAULT 'draft',
    "visibility" "session_visibility_enum" NOT NULL DEFAULT 'club_members',
    "location" TEXT NOT NULL,
    "address" TEXT,
    "date_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "num_courts" INTEGER NOT NULL,
    "players_per_court" INTEGER NOT NULL,
    "total_slots" INTEGER NOT NULL,
    "match_format" "match_format_enum" NOT NULL DEFAULT 'best_of_1',
    "score_limit" INTEGER NOT NULL DEFAULT 21,
    "match_duration_estimate_minutes" INTEGER NOT NULL DEFAULT 15,
    "shuttle_type" TEXT,
    "shuttle_cost_per_tube" DECIMAL(10,2),
    "shuttles_used" INTEGER NOT NULL DEFAULT 0,
    "court_cost" DECIMAL(10,2),
    "markup_type" "markup_type_enum",
    "markup_amount" DECIMAL(10,2),
    "smart_monitor_threshold" DECIMAL(3,2) NOT NULL DEFAULT 0.90,
    "attendance_window_minutes" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_registrations" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "admission_status" "admission_status_enum" NOT NULL DEFAULT 'waitlisted',
    "waitlist_position" INTEGER,
    "join_method" "join_session_method_enum" NOT NULL DEFAULT 'app',
    "player_status" "player_session_status_enum" NOT NULL DEFAULT 'not_arrived',
    "payment_status" "payment_status_enum" NOT NULL DEFAULT 'unpaid',
    "payment_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "per_player_cost" DECIMAL(10,2),
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_club_apps_player_id" ON "club_owner_applications"("player_id");

-- CreateIndex
CREATE INDEX "idx_club_apps_status" ON "club_owner_applications"("status");

-- CreateIndex
CREATE INDEX "idx_club_apps_created" ON "club_owner_applications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_kill_switches_key_env" ON "kill_switches"("key", "environment");

-- CreateIndex
CREATE INDEX "idx_kill_switches_enabled" ON "kill_switches"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "kill_switches_key_environment_key" ON "kill_switches"("key", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "platform_config_key_key" ON "platform_config"("key");

-- CreateIndex
CREATE INDEX "idx_platform_config_key" ON "platform_config"("key");

-- CreateIndex
CREATE INDEX "idx_moderation_entity" ON "moderation_flags"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_moderation_status" ON "moderation_flags"("status");

-- CreateIndex
CREATE INDEX "idx_moderation_reporter" ON "moderation_flags"("reporter_id");

-- CreateIndex
CREATE INDEX "idx_moderation_created" ON "moderation_flags"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_invite_token_key" ON "clubs"("invite_token");

-- CreateIndex
CREATE INDEX "idx_clubs_owner_id" ON "clubs"("owner_id");

-- CreateIndex
CREATE INDEX "idx_clubs_invite_token" ON "clubs"("invite_token");

-- CreateIndex
CREATE INDEX "idx_clubs_status" ON "clubs"("status");

-- CreateIndex
CREATE INDEX "idx_club_members_club_id" ON "club_members"("club_id");

-- CreateIndex
CREATE INDEX "idx_club_members_player_id" ON "club_members"("player_id");

-- CreateIndex
CREATE INDEX "idx_club_members_status" ON "club_members"("status");

-- CreateIndex
CREATE INDEX "idx_club_members_role" ON "club_members"("role");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_club_id_player_id_key" ON "club_members"("club_id", "player_id");

-- CreateIndex
CREATE INDEX "idx_join_requests_club_id" ON "club_join_requests"("club_id");

-- CreateIndex
CREATE INDEX "idx_join_requests_player_id" ON "club_join_requests"("player_id");

-- CreateIndex
CREATE INDEX "idx_join_requests_status" ON "club_join_requests"("status");

-- CreateIndex
CREATE INDEX "idx_club_blacklist_club_id" ON "club_blacklist"("club_id");

-- CreateIndex
CREATE INDEX "idx_club_blacklist_player_id" ON "club_blacklist"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_blacklist_club_id_player_id_key" ON "club_blacklist"("club_id", "player_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_club_id" ON "club_membership_audit_log"("club_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_player_id" ON "club_membership_audit_log"("player_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_created_at" ON "club_membership_audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_exp_transactions_player_id" ON "exp_transactions"("player_id");

-- CreateIndex
CREATE INDEX "idx_exp_transactions_match_id" ON "exp_transactions"("match_id");

-- CreateIndex
CREATE INDEX "idx_exp_transactions_session_id" ON "exp_transactions"("session_id");

-- CreateIndex
CREATE INDEX "idx_exp_transactions_reason" ON "exp_transactions"("reason");

-- CreateIndex
CREATE INDEX "idx_exp_transactions_created_at" ON "exp_transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_mmr_transactions_player_id" ON "mmr_transactions"("player_id");

-- CreateIndex
CREATE INDEX "idx_mmr_transactions_match_id" ON "mmr_transactions"("match_id");

-- CreateIndex
CREATE INDEX "idx_mmr_transactions_created_at" ON "mmr_transactions"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ranking_tier_config_tier_name_key" ON "ranking_tier_config"("tier_name");

-- CreateIndex
CREATE INDEX "idx_sandbagging_player_id" ON "sandbagging_flags"("player_id");

-- CreateIndex
CREATE INDEX "idx_sandbagging_status" ON "sandbagging_flags"("status");

-- CreateIndex
CREATE INDEX "idx_sandbagging_club_id" ON "sandbagging_flags"("club_id");

-- CreateIndex
CREATE INDEX "idx_matches_session_id" ON "matches"("session_id");

-- CreateIndex
CREATE INDEX "idx_matches_status" ON "matches"("status");

-- CreateIndex
CREATE INDEX "idx_matches_umpire_id" ON "matches"("umpire_id");

-- CreateIndex
CREATE INDEX "idx_matches_queue_position" ON "matches"("session_id", "queue_position");

-- CreateIndex
CREATE INDEX "idx_match_players_match_id" ON "match_players"("match_id");

-- CreateIndex
CREATE INDEX "idx_match_players_player_id" ON "match_players"("player_id");

-- CreateIndex
CREATE INDEX "idx_match_players_team" ON "match_players"("team");

-- CreateIndex
CREATE INDEX "idx_match_players_result" ON "match_players"("result");

-- CreateIndex
CREATE UNIQUE INDEX "match_players_match_id_player_id_key" ON "match_players"("match_id", "player_id");

-- CreateIndex
CREATE INDEX "idx_notifications_recipient_id" ON "notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "idx_notifications_is_read" ON "notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_scheduled_at" ON "notifications"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_facebook_id_key" ON "profiles"("facebook_id");

-- CreateIndex
CREATE INDEX "idx_profiles_facebook_id" ON "profiles"("facebook_id");

-- CreateIndex
CREATE INDEX "idx_profiles_email" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "idx_profiles_is_verified" ON "profiles"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "email_invitations_token_key" ON "email_invitations"("token");

-- CreateIndex
CREATE INDEX "idx_email_invitations_token" ON "email_invitations"("token");

-- CreateIndex
CREATE INDEX "idx_email_invitations_email" ON "email_invitations"("email");

-- CreateIndex
CREATE INDEX "idx_email_invitations_status" ON "email_invitations"("status");

-- CreateIndex
CREATE INDEX "idx_gear_items_player_id" ON "gear_items"("player_id");

-- CreateIndex
CREATE INDEX "idx_gear_items_category" ON "gear_items"("category");

-- CreateIndex
CREATE INDEX "idx_gear_item_links_gear_item_id" ON "gear_item_links"("gear_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_dimensions_name_key" ON "skill_dimensions"("name");

-- CreateIndex
CREATE INDEX "idx_skill_dimensions_active" ON "skill_dimensions"("is_active");

-- CreateIndex
CREATE INDEX "idx_self_assessments_player_id" ON "player_self_assessments"("player_id");

-- CreateIndex
CREATE INDEX "idx_self_assessments_dimension_id" ON "player_self_assessments"("dimension_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_self_assessments_player_id_dimension_id_key" ON "player_self_assessments"("player_id", "dimension_id");

-- CreateIndex
CREATE INDEX "idx_match_reviews_match_id" ON "match_reviews"("match_id");

-- CreateIndex
CREATE INDEX "idx_match_reviews_reviewer_id" ON "match_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "idx_match_reviews_reviewee_id" ON "match_reviews"("reviewee_id");

-- CreateIndex
CREATE INDEX "idx_match_reviews_submitted_at" ON "match_reviews"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "match_reviews_match_id_reviewer_id_reviewee_id_key" ON "match_reviews"("match_id", "reviewer_id", "reviewee_id");

-- CreateIndex
CREATE INDEX "idx_review_ratings_review_id" ON "match_review_ratings"("review_id");

-- CreateIndex
CREATE INDEX "idx_review_ratings_dimension_id" ON "match_review_ratings"("dimension_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_review_ratings_review_id_dimension_id_key" ON "match_review_ratings"("review_id", "dimension_id");

-- CreateIndex
CREATE INDEX "idx_skill_ratings_player_id" ON "player_skill_ratings"("player_id");

-- CreateIndex
CREATE INDEX "idx_skill_ratings_dimension_id" ON "player_skill_ratings"("dimension_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_skill_ratings_player_id_dimension_id_key" ON "player_skill_ratings"("player_id", "dimension_id");

-- CreateIndex
CREATE INDEX "idx_queue_sessions_club_id" ON "queue_sessions"("club_id");

-- CreateIndex
CREATE INDEX "idx_queue_sessions_host_id" ON "queue_sessions"("host_id");

-- CreateIndex
CREATE INDEX "idx_queue_sessions_status" ON "queue_sessions"("status");

-- CreateIndex
CREATE INDEX "idx_queue_sessions_date_time" ON "queue_sessions"("date_time");

-- CreateIndex
CREATE INDEX "idx_queue_sessions_origin" ON "queue_sessions"("origin");

-- CreateIndex
CREATE INDEX "idx_queue_sessions_schedule" ON "queue_sessions"("schedule_type");

-- CreateIndex
CREATE INDEX "idx_session_reg_session_id" ON "session_registrations"("session_id");

-- CreateIndex
CREATE INDEX "idx_session_reg_player_id" ON "session_registrations"("player_id");

-- CreateIndex
CREATE INDEX "idx_session_reg_admission" ON "session_registrations"("admission_status");

-- CreateIndex
CREATE INDEX "idx_session_reg_player_status" ON "session_registrations"("player_status");

-- CreateIndex
CREATE INDEX "idx_session_reg_payment" ON "session_registrations"("payment_status");

-- CreateIndex
CREATE INDEX "idx_session_reg_waitlist" ON "session_registrations"("session_id", "waitlist_position");

-- CreateIndex
CREATE UNIQUE INDEX "session_registrations_session_id_player_id_key" ON "session_registrations"("session_id", "player_id");

-- AddForeignKey
ALTER TABLE "club_owner_applications" ADD CONSTRAINT "club_owner_applications_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_owner_applications" ADD CONSTRAINT "club_owner_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kill_switches" ADD CONSTRAINT "kill_switches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_config" ADD CONSTRAINT "platform_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_join_requests" ADD CONSTRAINT "club_join_requests_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_join_requests" ADD CONSTRAINT "club_join_requests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_blacklist" ADD CONSTRAINT "club_blacklist_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_blacklist" ADD CONSTRAINT "club_blacklist_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_blacklist" ADD CONSTRAINT "club_blacklist_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_membership_audit_log" ADD CONSTRAINT "club_membership_audit_log_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_membership_audit_log" ADD CONSTRAINT "club_membership_audit_log_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_membership_audit_log" ADD CONSTRAINT "club_membership_audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exp_transactions" ADD CONSTRAINT "exp_transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exp_transactions" ADD CONSTRAINT "exp_transactions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exp_transactions" ADD CONSTRAINT "exp_transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "queue_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mmr_transactions" ADD CONSTRAINT "mmr_transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mmr_transactions" ADD CONSTRAINT "mmr_transactions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_tier_config" ADD CONSTRAINT "ranking_tier_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbagging_flags" ADD CONSTRAINT "sandbagging_flags_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbagging_flags" ADD CONSTRAINT "sandbagging_flags_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbagging_flags" ADD CONSTRAINT "sandbagging_flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "queue_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_umpire_id_fkey" FOREIGN KEY ("umpire_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_score_submitted_by_fkey" FOREIGN KEY ("score_submitted_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_invitations" ADD CONSTRAINT "email_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_invitations" ADD CONSTRAINT "email_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_items" ADD CONSTRAINT "gear_items_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_item_links" ADD CONSTRAINT "gear_item_links_gear_item_id_fkey" FOREIGN KEY ("gear_item_id") REFERENCES "gear_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_self_assessments" ADD CONSTRAINT "player_self_assessments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_self_assessments" ADD CONSTRAINT "player_self_assessments_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "skill_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reviews" ADD CONSTRAINT "match_reviews_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reviews" ADD CONSTRAINT "match_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reviews" ADD CONSTRAINT "match_reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_review_ratings" ADD CONSTRAINT "match_review_ratings_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "match_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_review_ratings" ADD CONSTRAINT "match_review_ratings_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "skill_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skill_ratings" ADD CONSTRAINT "player_skill_ratings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skill_ratings" ADD CONSTRAINT "player_skill_ratings_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "skill_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_sessions" ADD CONSTRAINT "queue_sessions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_sessions" ADD CONSTRAINT "queue_sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "queue_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_registrations" ADD CONSTRAINT "session_registrations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
