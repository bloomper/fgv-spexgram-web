import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { withPolicyAction, withPolicyPage } from "@/utils/route.server";
import { LoginPrompt } from "@/components/login-prompt.client";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  forbidden: vi.fn(() => {
    throw new Error("forbidden");
  }),
  usePathname: () => "/",
}));

const requireUserMock = vi.fn(async () => ({ session: {}, roles: ["USER"] }));
vi.mock("@/utils/auth.server", () => ({ requireUser: () => requireUserMock() }));

const ok = async () => ({ ok: true as const, roles: ["USER" as const] });
const unauthenticated = async () => ({ ok: false as const, status: 401 as const, message: "Not authenticated" });
const forbidden = async () => ({ ok: false as const, status: 403 as const, message: "Not authorized" });

describe("route.server", () => {
  it("runs the handler when the policy allows it", async () => {
    expect(await withPolicyAction(ok, async () => "done")).toBe("done");
    expect(await withPolicyPage(ok, async ({ roles }) => roles.join())).toBe("USER");
  });

  it("sends an action without a session to login and refuses others", async () => {
    await expect(withPolicyAction(unauthenticated, async () => "x")).rejects.toThrow("redirect:/api/auth/login");
    await expect(withPolicyAction(forbidden, async () => "x")).rejects.toThrow("Not authorized");
  });

  it("shows a visitor the login prompt instead of the page", async () => {
    const handler = vi.fn();
    const result = await withPolicyPage(unauthenticated, handler);

    expect(isValidElement(result) && (result as ReactElement).type).toBe(LoginPrompt);
    expect(handler).not.toHaveBeenCalled();
  });

  it("shows the forbidden page to a member who lacks the role", async () => {
    await expect(withPolicyPage(forbidden, async () => "x")).rejects.toThrow(/^forbidden$/);
  });

  it("shows the no-access notice to someone logged in without access", async () => {
    requireUserMock.mockResolvedValueOnce({ session: {}, roles: [] });
    const result = await withPolicyPage(forbidden, async () => "x") as ReactElement<{ noAccess?: boolean }>;

    expect(result.type).toBe(LoginPrompt);
    expect(result.props.noAccess).toBe(true);
  });
});
