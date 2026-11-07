"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/utils/auth";

/**
 * *Logga in* for visitors, a link that comes back to the page they are on. `compact` shows only the icon on phones,
 * where the header has no room for the text (it stays the link's name).
 */
export function LoginButton({ size = "sm", compact = false }: { size?: "sm" | "default"; compact?: boolean }) {
  const t = useTranslations("Common");
  const pathname = usePathname();

  return (
    <a href={loginHref(pathname)} className={buttonVariants({ size })}>
      <LogIn aria-hidden /> <span className={compact ? "max-sm:sr-only" : undefined}>{t("login")}</span>
    </a>
  );
}
