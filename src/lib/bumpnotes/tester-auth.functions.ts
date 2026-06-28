import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const verifyTesterPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (typeof data?.password !== "string") throw new Error("Invalid input");
    return { password: data.password.slice(0, 200) };
  })
  .handler(async ({ data }) => {
    const expected = process.env.TESTER_PASSWORD;
    if (!expected) {
      // If unset, tester mode is disabled.
      return { ok: false as const, reason: "disabled" as const };
    }
    const submitted = data.password.trim();
    if (!submitted) return { ok: false as const, reason: "empty" as const };
    // Case-insensitive comparison so access codes are forgiving.
    if (passwordMatches(submitted.toLowerCase(), expected.trim().toLowerCase())) {
      return { ok: true as const };
    }
    return { ok: false as const, reason: "wrong" as const };
  });
