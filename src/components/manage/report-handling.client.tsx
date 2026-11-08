"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemImage } from "@/components/gram/item-image.client";
import { VisibilityBadge } from "@/components/gram/visibility-badge";
import { useDialogs } from "@/components/dialogs.client";
import { handleReportAction } from "@/app/(app)/manage/actions.server";
import type { ReportOutcome, ReportReason, ReportStatus, Visibility } from "@/gql/graphql";
import { formatInstant } from "@/utils/format";
import { DataEmpty } from "@/components/data-empty";

type Report = {
  id: string;
  reason: ReportReason;
  message?: string | null;
  status: ReportStatus;
  reporter?: string | null;
  byVisitor: boolean;
  outcome?: ReportOutcome | null;
  outcomeMessage?: string | null;
  createdAt: string;
  handledAt?: string | null;
  item?: {
    id: string;
    caption?: string | null;
    type: "PHOTO" | "VIDEO";
    visibility: Visibility;
    effectiveVisibility: Visibility;
    media?: { thumbnailUrl: string } | null;
    album?: { id: string; title: string } | null
  } | null;
};

const OUTCOMES: ReportOutcome[] = ["REMOVED", "CORRECTED", "KEPT"];

/**
 * Reports for editors: what was reported, why and by whom; an open one is handled by removing the item, correcting it
 * or keeping it, with a message to the reporter.
 */
export function ReportHandling({ reports }: { reports: Report[] }) {
  const t = useTranslations("ManageReports");
  const r = useTranslations("Report");
  const router = useRouter();
  const dialogs = useDialogs();
  const [pending, start] = useTransition();

  const handle = async (report: Report, outcome: ReportOutcome) => {
    const message = await dialogs.prompt({
      title: t("outcomeTitle", { outcome: t(`outcome.${outcome}`) }),
      label: t("messageLabel"),
      confirmLabel: t("handle"),
      defaultValue: t(`defaultMessage.${outcome}`),
      maxLength: 2000,
    });

    if (message === null) {
      return;
    }
    start(async () => {
      const result = await handleReportAction(report.id, outcome, message);

      if (result.ok) {
        toast.success(t("handled"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  if (reports.length === 0) {
    return <DataEmpty title={t("none")} description={null} />;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {reports.map(report => (
        <li key={report.id} className="flex flex-wrap items-start gap-3 p-3" data-testid="report">
          <div className="size-20 shrink-0 overflow-hidden rounded">
            {report.item
              ? <Link href={`/items/${report.item.id}`}><ItemImage src={report.item.media?.thumbnailUrl} alt={report.item.caption ?? ""} type={report.item.type} fill /></Link>
              : <ItemImage src={null} alt={t("itemGone")} fill />}
          </div>
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-medium">{r(`reasons.${report.reason}`)}</p>
            <p className="text-xs text-muted-foreground">
              {[report.byVisitor ? t("visitor", { email: report.reporter ?? "" }) : report.reporter, formatInstant(report.createdAt),
                report.item?.album?.title].filter(Boolean).join(" · ")}
            </p>
            {report.message && <p className="whitespace-pre-line">{report.message}</p>}
            {report.item && <VisibilityBadge visibility={report.item.effectiveVisibility} />}
            {report.status === "HANDLED" && (
              <p className="text-xs">
                <Badge variant="outline">{t(`outcome.${report.outcome ?? "KEPT"}`)}</Badge>{" "}
                {report.outcomeMessage} <span className="text-muted-foreground">{formatInstant(report.handledAt)}</span>
              </p>
            )}
          </div>
          {report.status === "OPEN" && (
            <div className="flex flex-wrap gap-1">
              {OUTCOMES.map(outcome => (
                <Button key={outcome} size="sm" variant={outcome === "REMOVED" ? "destructive" : "outline"} disabled={pending}
                        onClick={() => handle(report, outcome)}>
                  {t(`action.${outcome}`)}
                </Button>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
