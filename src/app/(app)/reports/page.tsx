import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ItemImage } from "@/components/gram/item-image.client";
import { DataEmpty } from "@/components/data-empty";
import { getMyReports } from "@/lib/gram/gram.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { formatInstant } from "@/utils/format";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The member's own reports and how they were handled.
 */
export default async function ReportsPage() {
  return withPolicyPage(Policies.app.requireAccess, async () => {
    const t = await getTranslations("MyReports");
    const r = await getTranslations("Report");
    const reports = await getMyReports();

    return (
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-4xl text-pretty text-muted-foreground">{t("text")}</p>
        {reports.length === 0 ? <DataEmpty title={t("none")} description={t("noneText")} /> : (
          <ul className="divide-y rounded-lg border">
            {reports.map(report => (
              <li key={report.id} className="flex flex-wrap items-start gap-3 p-3">
                <div className="size-14 shrink-0 overflow-hidden rounded">
                  <ItemImage src={report.item?.media?.thumbnailUrl} alt={report.item?.caption ?? ""} type={report.item?.type} fill />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">
                    {report.item ? <Link href={`/items/${report.item.id}`} className="hover:underline">{r(`reasons.${report.reason}`)}</Link>
                      : r(`reasons.${report.reason}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatInstant(report.createdAt)}</p>
                  {report.message && <p className="text-sm">{report.message}</p>}
                  {report.outcomeMessage && <p className="text-sm"><span className="text-muted-foreground">{t("answer")}</span> {report.outcomeMessage}</p>}
                </div>
                <Badge variant={report.status === "OPEN" ? "secondary" : "default"}>
                  {report.status === "OPEN" ? t("open") : t(`outcome.${report.outcome ?? "KEPT"}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  });
}
