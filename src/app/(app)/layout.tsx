import * as React from "react";
import { getTranslations } from "next-intl/server";
import { AppSidebar } from "@/components/app-sidebar.client";
import { SiteHeader } from "@/components/site-header.client";
import { getApplications } from "@/utils/applications.server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DialogsProvider } from "@/components/dialogs.client";
import { UploadsProvider } from "@/components/upload/uploads.client";
import { getSessionContext } from "@/utils/auth.server";
import { hasAccess } from "@/utils/auth";

export const instant = false;

/**
 * The shell of every page, with or without a session: visitors get *Logga in* and the public pages, members their
 * menu and the pages their roles open. Nothing here calls Keycloak for a visitor.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, roles } = await getSessionContext();
  const t = await getTranslations("NoAccess");
  const accountUrl = `${(process.env.KEYCLOAK_ISSUER ?? "").replace(/\/$/, "")}/account`;
  const applications = await getApplications();
  const loggedIn = session !== null;
  const user = session ? { name: session.user.name, email: session.user.email, image: session.user.image ?? null } : null;

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <DialogsProvider>
        <UploadsProvider>
          <SidebarProvider className="flex flex-col">
            <SiteHeader applications={applications} loggedIn={loggedIn} />
            <div className="flex flex-1">
              <AppSidebar roles={roles} accountUrl={accountUrl} user={user} />
              <SidebarInset className="min-w-0">
                {loggedIn && !hasAccess(roles) && (
                  <div role="status" className="border-b bg-muted px-4 py-2 text-sm" data-testid="no-access-notice">
                    {t("notice", { email: session.user.email })}
                  </div>
                )}
                {children}
              </SidebarInset>
            </div>
          </SidebarProvider>
        </UploadsProvider>
      </DialogsProvider>
    </div>
  );
}
