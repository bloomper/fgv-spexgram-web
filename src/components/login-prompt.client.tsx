"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/utils/auth";

/**
 * Shown in place of what the viewer may not see. For `content` (an album, item or spex that is not public) it never
 * tells whether the thing exists; for a `page` (a members' page such as the map) it says the page is for members.
 * Someone logged in without access to Spexgram gets a notice instead of the button.
 */
export function LoginPrompt({ kind = "content", noAccess = false }: { kind?: "content" | "page"; noAccess?: boolean }) {
  const t = useTranslations("LoginPrompt");
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();

  return (
    <div className="flex flex-1 items-center justify-center p-6" data-testid="login-prompt">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <Lock className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight">{noAccess ? t(`${kind}.noAccessTitle`) : t(`${kind}.title`)}</h1>
        <p className="text-sm text-muted-foreground">{noAccess ? t(`${kind}.noAccessText`) : t(`${kind}.text`)}</p>
        {!noAccess && (
          <div className="flex justify-center pt-2">
            <a href={loginHref(query ? `${pathname}?${query}` : pathname)} className={buttonVariants()}>
              <LogIn aria-hidden /> {t("login")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
