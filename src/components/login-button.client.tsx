"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginHref } from "@/utils/auth";

/**
 * *Logga in* for visitors, coming back to the page they are on.
 */
export function LoginButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const t = useTranslations("Common");
  const pathname = usePathname();

  return (
    <Button size={size} nativeButton={false} render={<a href={loginHref(pathname)} />}>
      <LogIn /> {t("login")}
    </Button>
  );
}
