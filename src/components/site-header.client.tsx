"use client";

import { SiteHeader as FgvSiteHeader } from "@bloomper/fgv-web-ui/shell/site-header";
import type { Application } from "@bloomper/fgv-web-ui/shell/applications";
import { LanguageToggle, ModeToggle } from "@bloomper/fgv-web-ui/shell/toggles";
import { HeaderSearch } from "@/components/header-search.client";
import { LoginButton } from "@/components/login-button.client";
import { UploadIndicator } from "@/components/upload/uploads.client";

/**
 * The FGV header with Spexgram's own controls: the uploads in progress, search, and for visitors the login button.
 */
export function SiteHeader({ applications, loggedIn }: { applications: Application[]; loggedIn: boolean }) {
  return (
    <FgvSiteHeader
      applications={applications}
      actions={
        <>
          <UploadIndicator />
          <HeaderSearch />
          <LanguageToggle />
          <ModeToggle />
          {!loggedIn && <LoginButton compact />}
        </>
      }
    />
  );
}
