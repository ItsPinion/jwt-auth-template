UPDATE "users" SET "createdAt" = now() WHERE "createdAt" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "createdAt" SET NOT NULL;