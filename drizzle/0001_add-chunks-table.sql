CREATE TABLE "chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"bookmark_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"start_offset" integer,
	"end_offset" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "fk_chunks_bookmark_id" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chunks_bookmark_id" ON "chunks" USING btree ("bookmark_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_chunk_index" ON "chunks" USING btree ("chunk_index");--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "embedding";