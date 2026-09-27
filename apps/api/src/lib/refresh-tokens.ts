import { and, eq, isNull } from "drizzle-orm";
import { db, refreshTokensTable } from "../db";

/**
 * Revokes every refresh token belonging to a user. Used when token reuse is
 * detected (a rotated-out token is replayed), which means a token was likely
 * stolen — the safest response is to end all sessions and force a fresh login.
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokensTable.userId, userId),
        isNull(refreshTokensTable.revokedAt),
      ),
    );
}

/**
 * Atomically claims a refresh token for rotation: revokes it only if it is
 * still active. Returns the claimed row, or undefined if another request
 * already claimed (rotated) it — which also makes concurrent refreshes safe.
 */
export async function claimRefreshToken(
  tokenId: string,
): Promise<{ id: string } | undefined> {
  const [claimed] = await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokensTable.id, tokenId),
        isNull(refreshTokensTable.revokedAt),
      ),
    )
    .returning({ id: refreshTokensTable.id });

  return claimed;
}
