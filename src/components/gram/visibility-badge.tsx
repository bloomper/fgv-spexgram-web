import { useTranslations } from "next-intl";
import { Globe, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Visibility } from "@/gql/graphql";

/**
 * Who sees an album or item, as a small badge: shown to editors, and to members for what is public.
 */
export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  const t = useTranslations("Visibility");
  const Icon = visibility === "PUBLIC" ? Globe : visibility === "MEMBERS" ? Users : Lock;

  return (
    <Badge variant={visibility === "UNPUBLISHED" ? "destructive" : visibility === "PUBLIC" ? "default" : "secondary"}
           className={className}>
      <Icon aria-hidden /> {t(visibility)}
    </Badge>
  );
}
