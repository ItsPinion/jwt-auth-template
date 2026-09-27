DROP INDEX "refresh_token_hash_idx";--> statement-breakpoint
ALTER TABLE "refreshTokens" ADD COLUMN "absoluteExpiresAt" timestamp DEFAULT now() + interval '90 days' NOT NULL;--> statement-breakpoint
ALTER TABLE "refreshTokens" ADD CONSTRAINT "refreshTokens_tokenHash_key" UNIQUE("tokenHash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refreshTokens" ("userId");