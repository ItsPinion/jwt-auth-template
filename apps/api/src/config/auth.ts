import bcrypt from "bcrypt";

export const SALT_ROUNDS = 12;

// Cached hash of a throwaway string. It is compared against when an email has
// no account, so the response takes the same bcrypt time as a real user and
// response timing can't be used to enumerate registered emails.
let dummyHashPromise: Promise<string> | undefined;

export function compareAgainstDummy(password: string): Promise<boolean> {
  dummyHashPromise ??= bcrypt.hash(
    "timing-equalization-placeholder",
    SALT_ROUNDS,
  );
  return dummyHashPromise.then((hash) => bcrypt.compare(password, hash));
}
