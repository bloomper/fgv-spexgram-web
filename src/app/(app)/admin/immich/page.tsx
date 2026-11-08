import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemImage } from "@/components/gram/item-image.client";
import { getImmichStatus } from "@/lib/admin/admin.server";
import { formatBytes } from "@/utils/format";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { ImmichJobs } from "./immich-jobs.client";
import { DataEmpty } from "@/components/data-empty";

/**
 * Immich's status: whether the API reaches it, its version, job queues and disk, and the items that failed, which can
 * be processed again.
 */
export default async function ImmichPage() {
  return withPolicyPage(Policies.admin.requireAdmin, async () => {
    const t = await getTranslations("AdminImmich");
    const locale = await getLocale();
    const status = await getImmichStatus();

    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("text")}</p>
        {!status?.available ? (
          <p className="text-destructive" role="alert">{t("unavailable")}</p>
        ) : (
          <>
            <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t("version")}</dt><dd>{status.version ?? "–"}</dd>
              <dt className="text-muted-foreground">{t("used")}</dt><dd>{formatBytes(status.usedBytes, locale)}</dd>
              <dt className="text-muted-foreground">{t("free")}</dt><dd>{formatBytes(status.availableBytes, locale)}</dd>
              <dt className="text-muted-foreground">{t("size")}</dt><dd>{formatBytes(status.sizeBytes, locale)}</dd>
            </dl>
            <section aria-labelledby="queues" className="space-y-2">
              <h2 id="queues" className="text-lg font-semibold">{t("queues")}</h2>
              <div className="overflow-x-auto rounded-lg border">
                <Table className="max-sm:text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("queue")}</TableHead>
                      <TableHead className="text-right">{t("active")}</TableHead>
                      <TableHead className="text-right">{t("waiting")}</TableHead>
                      <TableHead className="text-right">{t("failedCount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status.queues.map(queue => (
                      <TableRow key={queue.name}>
                        <TableCell className="whitespace-normal">
                          {t.has(`queueNames.${queue.name}`) ? t(`queueNames.${queue.name}`) : queue.name}
                          {queue.paused && <Badge variant="outline" className="ml-2">{t("paused")}</Badge>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{queue.active}</TableCell>
                        <TableCell className="text-right tabular-nums">{queue.waiting}</TableCell>
                        <TableCell className={`text-right tabular-nums ${queue.failed > 0 ? "text-destructive" : ""}`}>{queue.failed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
        <section aria-labelledby="failed" className="space-y-3">
          <h2 id="failed" className="text-lg font-semibold">{t("failedItems", { count: status?.failedItems.length ?? 0 })}</h2>
          {status && status.failedItems.length > 0 ? (
            <>
              <ImmichJobs itemIds={status.failedItems.map(item => item.id)} />
              <ul className="divide-y rounded-lg border">
                {status.failedItems.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 text-sm">
                    <div className="size-12 shrink-0 overflow-hidden rounded">
                      <ItemImage src={item.media?.thumbnailUrl} alt="" status={item.status} type={item.type} fill />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.originalFileName ?? item.caption ?? item.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.album ? <Link href={`/manage/albums/${item.album.id}`} className="hover:text-primary">{item.album.title}</Link> : t("unsorted")}
                        {item.failure && <> · {t(`failure.${item.failure}`)}</>}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : <DataEmpty title={t("noFailed")} description={null} />}
        </section>
      </div>
    );
  });
}
