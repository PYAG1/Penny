CREATE TYPE "public"."content_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('image', 'webpage', 'youtube');--> statement-breakpoint
CREATE TABLE "content_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"chunk_index" integer NOT NULL,
	"start_offset" integer,
	"end_offset" integer,
	"section" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "content_type" NOT NULL,
	"url" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content_preview" text,
	"image_url" text,
	"status" "content_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"processing_attempts" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_content_chunks_content_id" ON "content_chunks" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_content_chunks_embedding" ON "content_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_contents_type" ON "contents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_contents_status" ON "contents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contents_created_at" ON "contents" USING btree ("created_at");