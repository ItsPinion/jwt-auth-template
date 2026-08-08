CREATE TYPE "role" AS ENUM('student', 'teacher', 'admin');--> statement-breakpoint
CREATE TABLE "refreshTokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" uuid NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(255) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'student'::"role" NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "refresh_token_hash_idx" ON "refreshTokens" ("tokenHash");--> statement-breakpoint
ALTER TABLE "refreshTokens" ADD CONSTRAINT "refreshTokens_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;