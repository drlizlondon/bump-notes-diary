import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, withSecurityHeaders } from "./security-headers";

describe("withSecurityHeaders", () => {
  it("adds all six headers", () => {
    const out = withSecurityHeaders(new Response("x"));
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(6);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(out.headers.get(name)).toBe(value);
    }
  });

  it("does not overwrite a header that is already present", () => {
    const res = new Response("x", { headers: { "X-Frame-Options": "SAMEORIGIN" } });
    const out = withSecurityHeaders(res);
    expect(out.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(out.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("preserves status and body", async () => {
    const out = withSecurityHeaders(new Response("hello", { status: 418 }));
    expect(out.status).toBe(418);
    expect(await out.text()).toBe("hello");
  });

  it("works on immutable (redirect) responses", () => {
    const out = withSecurityHeaders(Response.redirect("https://example.com/", 302));
    expect(out.status).toBe(302);
    expect(out.headers.get("Strict-Transport-Security")).toBe(
      SECURITY_HEADERS["Strict-Transport-Security"],
    );
  });
});

describe("public/_headers", () => {
  it("carries exactly the five non-CSP headers, equal to SECURITY_HEADERS", () => {
    const text = readFileSync(path.resolve(__dirname, "../../public/_headers"), "utf8");
    const lines = text.split("\n");
    expect(lines[0]).toBe("/*");
    const parsed: Record<string, string> = {};
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const i = line.indexOf(":");
      parsed[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    const expected = Object.fromEntries(
      Object.entries(SECURITY_HEADERS).filter(([k]) => !k.startsWith("Content-Security-Policy")),
    );
    expect(Object.keys(expected)).toHaveLength(5);
    expect(parsed).toEqual(expected);
  });
});
