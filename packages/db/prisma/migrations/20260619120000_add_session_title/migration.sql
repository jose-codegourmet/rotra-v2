-- Add optional session title (distinct from venue location label)
ALTER TABLE "queue_sessions" ADD COLUMN "title" TEXT;
