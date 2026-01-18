CREATE EXTENSION IF NOT EXISTS vector;
CREATE TYPE "public"."bookmark_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."bookmark_type" AS ENUM('image', 'webpage', 'youtube');--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "bookmark_type" NOT NULL,
	"url" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content_preview" text,
	"image_url" text,
	"embedding" vector(1536),
	"status" "bookmark_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"processing_attempts" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "idx_bookmarks_type" ON "bookmarks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_status" ON "bookmarks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_created_at" ON "bookmarks" USING btree ("created_at");