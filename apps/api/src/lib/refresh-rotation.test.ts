/**
 * Behavioral tests for refresh-token rotation: reuse detection, the atomic
 * claim that makes concurrent refreshes safe, the absolute session cap, and
 * stale-row purging. The drizzle client is faked with an in-memory token
 * table so the state machine can be exercised without a real Postgres.
 */
import { expect, mock, test } from "bun:test";

process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_SECRET = "test-refresh-secret";
process.env.REFRESH_EXPIRES_IN = "30d";
process.env.ACCESS_TOKEN_EXPIRES_IN = "15m";

type Row = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
};

const state = {
  tokens: [] as Row[],
  inserted: [] as Row[],
  // Each select() chain resolves the next entry, in call order.
  selectQueue: [] as unknown[][],
  // "all" = revoke every active row for user-1 (revokeAllUserTokens),
  // "one" = claim only the row named by claimRowId (claimRefreshToken).
  updateMode: "one" as "all" | "one",
  // "one" = delete the row named by claimRowId (expired-row cleanup),
  // "stale" = delete user-1's expired rows (purgeStaleTokens).
  deleteMode: "one" as "one" | "stale",
  claimRowId: "",
};

const fakeDb = {
  select() {
    let table: unknown = null;
    const q = {
      from(t: unknown) {
        table = t;
        return q;
      },
      where() {
        return q;
      },
      limit() {
        return q;
      },
      then(resolve: (rows: unknown[]) => unknown) {
        void table;
        resolve(state.selectQueue.shift() ?? []);
      },
    };
    return q;
  },
  insert() {
    return {
      values(values: Partial<Row>) {
        const row: Row = {
          id: `tok-new-${state.inserted.length + 1}`,
          userId: values.userId!,
          tokenHash: values.tokenHash!,
          expiresAt: values.expiresAt!,
          absoluteExpiresAt: values.absoluteExpiresAt!,
          revokedAt: values.revokedAt ?? null,
        };
        state.tokens.push(row);
        state.inserted.push(row);
        return { returning: () => [row] };
      },
    };
  },
  update() {
    return {
      set(patch: Partial<Row>) {
        return {
          where() {
            const affected: Row[] = [];
            for (const row of state.tokens) {
              const matches =
                state.updateMode === "all"
                  ? row.userId === "user-1" && row.revokedAt === null
                  : row.id === state.claimRowId && row.revokedAt === null;
              if (matches) {
                Object.assign(row, patch);
                affected.push(row);
              }
            }
            return { returning: () => affected };
          },
        };
      },
    };
  },
  delete() {
    return {
      where() {
        if (state.deleteMode === "stale") {
          state.tokens = state.tokens.filter(
            (r) =>
              !(r.userId === "user-1" && r.expiresAt.getTime() < Date.now()),
          );
        } else {
          state.tokens = state.tokens.filter((r) => r.id !== state.claimRowId);
        }
        return Promise.resolve();
      },
    };
  },
};

// Real table objects so the fake stays table-aware.
const schema = await import("../db/schema/user.js");
const schemaTokens = await import("../db/schema/refresh-token.js");

mock.module("../db", () => ({
  db: fakeDb,
  usersTable: schema.usersTable,
  refreshTokensTable: schemaTokens.refreshTokensTable,
}));

const { generateRefreshToken, verifyRefreshToken } = await import("./jwt.js");
const { hashToken } = await import("./hash.js");
const { claimRefreshToken, revokeAllUserTokens } = await import(
  "./refresh-tokens"
);
const { refresh: refreshHandler } = await import(
  "../controllers/auth.controller"
);

const testUser = {
  id: "user-1",
  email: "a@b.co",
  password: "x",
  role: "student" as const,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function makeRow(overrides: Partial<Row> & { id: string; tokenHash: string }): Row {
  return {
    userId: "user-1",
    expiresAt: new Date(Date.now() + 60 * 1000),
    absoluteExpiresAt: new Date(Date.now() + 90 * DAY_MS),
    revokedAt: null,
    ...overrides,
  };
}

function makeRes(onDone: () => void) {
  const res = {
    cookieArgs: null as unknown[] | null,
    clearArgs: null as unknown[] | null,
    statusCode: 0,
    body: null as unknown,
    cookie(name: string, value: string, opts: unknown) {
      res.cookieArgs = [name, value, opts];
      return res;
    },
    clearCookie(name: string, opts: unknown) {
      res.clearArgs = [name, opts];
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      onDone();
      return res;
    },
  };
  return res;
}

function runRefresh(cookies: Record<string, string>) {
  return new Promise<{ res: ReturnType<typeof makeRes>; error: unknown }>(
    (resolve) => {
      let settled = false;
      const settle = (res: ReturnType<typeof makeRes>, error: unknown) => {
        if (!settled) {
          settled = true;
          resolve({ res, error });
        }
      };
      const req = { cookies, body: {}, headers: {} } as never;
      // json() signals success; next() signals failure — settle on whichever
      // happens (the express wrapper only calls next on error).
      const res: ReturnType<typeof makeRes> = makeRes(() => settle(res, null));
      void (
        refreshHandler as unknown as (
          req: unknown,
          res: unknown,
          next: (e?: unknown) => void,
        ) => void
      )(req, res, (e?: unknown) => {
        settle(res, e ?? null);
      });
    },
  );
}

function reset() {
  state.tokens = [];
  state.inserted = [];
  state.selectQueue = [];
  state.updateMode = "one";
  state.deleteMode = "one";
  state.claimRowId = "";
}

test("rotates a valid token: old row revoked, new row inserted, new cookie set", async () => {
  reset();
  const token = generateRefreshToken("user-1");
  const row = makeRow({ id: "tok-active", tokenHash: hashToken(token) });
  state.tokens = [row];
  state.selectQueue = [[row], [testUser]];
  state.claimRowId = row.id;

  const { res, error } = await runRefresh({ refreshToken: token });

  expect(error).toBeNull();
  expect(row.revokedAt).not.toBeNull();
  expect(state.inserted.length).toBe(1);
  expect(state.inserted[0]!.revokedAt).toBeNull();
  const cookieValue = res.cookieArgs?.[1] as string;
  expect(cookieValue).toBeDefined();
  expect(verifyRefreshToken(cookieValue).userId).toBe("user-1");
  expect(hashToken(cookieValue)).toBe(state.inserted[0]!.tokenHash);
});

test("replaying a revoked (rotated-out) token revokes ALL of the user's tokens", async () => {
  reset();
  const stolen = generateRefreshToken("user-1");
  const oldRow = makeRow({
    id: "tok-old",
    tokenHash: hashToken(stolen),
    revokedAt: new Date(), // already rotated out
  });
  const otherActive = makeRow({
    id: "tok-other",
    tokenHash: hashToken(generateRefreshToken("user-1")),
  });
  state.tokens = [oldRow, otherActive];
  state.selectQueue = [[oldRow]];
  state.updateMode = "all";

  const { res, error } = await runRefresh({ refreshToken: stolen });

  expect(error).toBeDefined();
  expect(otherActive.revokedAt).not.toBeNull(); // collateral revocation — the point
  expect(res.clearArgs).not.toBeNull();
  expect(state.inserted.length).toBe(0); // no new session minted
});

test("unknown token: 401, cookie cleared, nothing minted", async () => {
  reset();
  const token = generateRefreshToken("user-1");
  state.selectQueue = [[]]; // no stored row matches the hash

  const { res, error } = await runRefresh({ refreshToken: token });

  expect(error).toBeDefined();
  expect(res.clearArgs).not.toBeNull();
  expect(state.inserted.length).toBe(0);
});

test("rotation never extends past the absolute session cap", async () => {
  reset();
  const token = generateRefreshToken("user-1");
  // Cap is 1 minute away; the sliding expiry (30d) would overshoot it.
  const absolute = new Date(Date.now() + 60 * 1000);
  const row = makeRow({
    id: "tok-capped",
    tokenHash: hashToken(token),
    absoluteExpiresAt: absolute,
  });
  state.tokens = [row];
  state.selectQueue = [[row], [testUser]];
  state.claimRowId = row.id;

  const { error } = await runRefresh({ refreshToken: token });

  expect(error).toBeNull();
  expect(state.inserted.length).toBe(1);
  expect(state.inserted[0]!.expiresAt.getTime()).toBe(absolute.getTime());
  expect(state.inserted[0]!.absoluteExpiresAt.getTime()).toBe(absolute.getTime());
});

test("session past its absolute cap is refused", async () => {
  reset();
  const token = generateRefreshToken("user-1");
  const row = makeRow({
    id: "tok-expired-lineage",
    tokenHash: hashToken(token),
    absoluteExpiresAt: new Date(Date.now() - 1000), // hard cap passed
  });
  state.tokens = [row];
  state.selectQueue = [[row]];
  state.claimRowId = row.id;

  const { res, error } = await runRefresh({ refreshToken: token });

  expect(error).toBeDefined();
  expect(res.clearArgs).not.toBeNull();
  expect(state.inserted.length).toBe(0);
});

test("refresh purges fully-stale rows for the user", async () => {
  reset();
  const token = generateRefreshToken("user-1");
  const stale = makeRow({
    id: "tok-stale",
    tokenHash: "stale-hash",
    expiresAt: new Date(Date.now() - 1000), // expired long ago
  });
  const row = makeRow({ id: "tok-good", tokenHash: hashToken(token) });
  state.tokens = [stale, row];
  state.selectQueue = [[row], [testUser]];
  state.claimRowId = row.id;
  state.deleteMode = "stale";

  const { error } = await runRefresh({ refreshToken: token });

  expect(error).toBeNull();
  expect(state.tokens.find((t) => t.id === "tok-stale")).toBeUndefined();
});

test("concurrent refresh: only the first claim wins", async () => {
  reset();
  const row = makeRow({
    id: "tok-race",
    tokenHash: hashToken(generateRefreshToken("user-1")),
  });
  state.tokens = [row];
  state.claimRowId = row.id;

  const first = await claimRefreshToken(row.id);
  const second = await claimRefreshToken(row.id);
  expect(first?.id).toBe(row.id);
  expect(second).toBeUndefined();
});

test("revokeAllUserTokens leaves nothing active", async () => {
  reset();
  state.tokens = [
    makeRow({ id: "a", tokenHash: "h1" }),
    makeRow({ id: "b", tokenHash: "h2" }),
    makeRow({ id: "c", tokenHash: "h3", userId: "user-2" }),
  ];
  state.updateMode = "all";

  await revokeAllUserTokens("user-1");

  expect(
    state.tokens.filter((t) => t.userId === "user-1" && !t.revokedAt),
  ).toEqual([]);
  expect(state.tokens.find((t) => t.id === "c")!.revokedAt).toBeNull();
});
