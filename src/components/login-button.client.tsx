"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/utils/auth";

/**
 * *Logga in* for visitors, a link that comes back to the page they are on.
 */
export function LoginButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const t = useTranslations("Common");
  const pathname = usePathname();

  return (
    <a href={loginHref(pathname)} className={buttonVariants({ size })}>
      <LogIn aria-hidden /> {t("login")}
    </a>
  );
}
