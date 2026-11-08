import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ItemImage } from "@/components/gram/item-image.client";
import { WithdrawButton } from "@/components/gram/withdraw-button.client";
import { DataEmpty } from "@/components/data-empty";
import { getMyContributions } from "@/lib/gram/gram.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { altText } from "@/utils/gram";
import { formatInstant } from "@/utils/format";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The member's own contributions, newest first: waiting for review (and can be withdrawn) or accepted.
 */
export default async function ContributionsPage() {
  return withPolicyPage(Policies.app.requireAccess, async () => {
    const t = await getTranslations("Contributions");
    const locale = await getLocale();
    const items = await getMyContributions();

    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-4xl text-pretty text-muted-foreground">{t("text")}</p>
        {items.length === 0 ? <DataEmpty title={t("none")} description={t("noneText")} /> : (
          <ul className="divide-y rounded-lg border">
            {items.map(item => {
              const name = altText(item, locale);

              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 p-3" data-testid="contribution">
                  <div className="size-16 shrink-0 overflow-hidden rounded">
                    <ItemImage src={item.media?.thumbnailUrl} alt={name} status={item.status} type={item.type} fill />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium">{item.originalFileName ?? name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.album && <Link href={`/albums/${item.album.id}`} className="hover:text-primary">{item.album.title}</Link>}
                      {" · "}{formatInstant(item.createdAt)}
                    </p>
                  </div>
                  <Badge variant={item.contributionStatus === "WAITING" ? "secondary" : "default"}>
                    {item.contributionStatus === "WAITING" ? t("waiting") : t("accepted")}
                  </Badge>
                  {item.contributionStatus === "WAITING" && <WithdrawButton itemId={item.id} name={name} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  });
}
