import { describe, expect, it, vi } from "vitest";

vi.unmock("@/auth");

describe("Better Auth's routes", () => {
  it("do not hand the tokens to browser code", async () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3004";
    process.env.AUTH_SECRET = "a-test-secret-that-is-long-enough-0123456789";
    const { auth } = await import("@/auth");

    for (const path of ["/get-access-token", "/refresh-token", "/account-info"]) {
      const response = await auth.handler(new Request(`http://localhost:3004/api/auth${path}`, {
        method: path === "/account-info" ? "GET" : "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3004" },
        body: path === "/account-info" ? undefined : JSON.stringify({ providerId: "keycloak" }),
      }));

      expect(response.status, path).toBe(404);
    }
    // Other routes are still served, e.g. the session for the browser
    const session = await auth.handler(new Request("http://localhost:3004/api/auth/get-session"));

    expect(session.status).not.toBe(404);
  });
});
