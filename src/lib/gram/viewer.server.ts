import "server-only";

import { getSessionContext } from "@/utils/auth.server";
import { hasAccess, isAdmin, isEditor } from "@/utils/auth";
import type { ReportViewer } from "@/components/gram/report-dialog.client";

export type ViewerContext = {
  loggedIn: boolean;
  /** Has `USER`: sees members' albums, contributes, uses the map and smart search. */
  member: boolean;
  editor: boolean;
  admin: boolean;
  report: ReportViewer;
};

/**
 * Who is looking, as far as the pages need to know: visitors (no session, or a session without `USER`) and members.
 * The roles only choose what to show; the server decides what anyone may see.
 */
export async function getViewer(): Promise<ViewerContext> {
  const { session, roles } = await getSessionContext();

  return {
    loggedIn: session !== null,
    member: hasAccess(roles),
    editor: isEditor(roles),
    admin: isAdmin(roles),
    report: {
      // Visitors report with an email address and Turnstile; someone logged in without USER is a visitor to the server
      visitor: !hasAccess(roles),
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || process.env.TURNSTILE_SITE_KEY?.trim() || null,
    },
  };
}
