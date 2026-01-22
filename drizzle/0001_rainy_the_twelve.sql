ALTER TYPE "public"."content_type" ADD VALUE 'document';--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "file_url" text;