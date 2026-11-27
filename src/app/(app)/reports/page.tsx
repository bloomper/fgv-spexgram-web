import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@bloomper/fgv-web-ui/ui/badge";
import { ItemImage } from "@/components/gram/item-image.client";
import { DataEmpty } from "@bloomper/fgv-web-ui/shell/data-empty";
import { getMyReports } from "@/lib/gram/gram.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { formatInstant } from "@/utils/format";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

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
      <Page variant="content">
        <PageHeader
          title={t("title")}
          description={t("text")}
        />
        {reports.length === 0 ? (
          <DataEmpty
            title={t("none")}
            description={t("noneText")}
          />
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border">
            {reports.map((report) => (
              <li
                key={report.id}
                className="link-row flex flex-wrap items-start gap-3 p-3"
              >
                <div className="size-14 shrink-0 overflow-hidden rounded">
                  <ItemImage
                    src={report.item?.media?.thumbnailUrl}
                    alt={report.item?.caption ?? ""}
                    type={report.item?.type}
                    fill
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">
                    {report.item ? (
                      <Link
                        href={`/items/${report.item.id}`}
                        className="row-link"
                      >
                        {r(`reasons.${report.reason}`)}
                      </Link>
                    ) : (
                      r(`reasons.${report.reason}`)
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">{formatInstant(report.createdAt)}</p>
                  {report.message && <p className="text-sm">{report.message}</p>}
                  {report.outcomeMessage && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">{t("answer")}</span> {report.outcomeMessage}
                    </p>
                  )}
                </div>
                <Badge variant={report.status === "OPEN" ? "secondary" : "default"}>
                  {report.status === "OPEN" ? t("open") : t(`outcome.${report.outcome ?? "KEPT"}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Page>
    );
  });
}
