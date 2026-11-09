import "server-only";

import { createElement, type ReactNode } from "react";
import type { AuthzOk, AuthzResult } from "@/types/auth";
import { forbidden, redirect } from "next/navigation";
import { requireUser } from "@/utils/auth.server";
import { hasAccess } from "@/utils/auth";
import { LoginPrompt } from "@/components/login-prompt.client";

const LOGIN_PATH = "/api/auth/login";

export async function withPolicyAction<T>(
  policy: () => Promise<AuthzResult>,
  handler: (authz: AuthzOk) => Promise<T>,
): Promise<T> {
  const authz = await policy();
  if (!authz.ok) {
    if (authz.status === 401) {
      redirect(LOGIN_PATH);
    }
    throw new Error(authz.message);
  }
  return handler(authz);
}

/**
 * Guards a page that is not for visitors. Spexgram has a public side, so nobody is sent away: a visitor gets the login
 * prompt for members' pages in place of the page, and so does someone logged in without access to Spexgram (with a notice instead of the
 * button). A member who lacks the page's role gets the forbidden page.
 */
export async function withPolicyPage(
  policy: () => Promise<AuthzResult>,
  handler: (authz: AuthzOk) => Promise<ReactNode>,
): Promise<ReactNode> {
  const authz = await policy();

  if (authz.ok) {
    return handler(authz);
  }
  if (authz.status === 401) {
    return createElement(LoginPrompt, { kind: "page" });
  }
  if (!hasAccess((await requireUser()).roles)) {
    return createElement(LoginPrompt, { kind: "page", noAccess: true });
  }
  forbidden();
}
