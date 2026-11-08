import { getTranslations } from "next-intl/server";
import { LinkTabs } from "@/components/link-tabs";
import { ReportHandling } from "@/components/manage/report-handling.client";
import { getReports } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";

/**
 * Everyone's reports, open or handled.
 */
export default async function ManageReportsPage({ searchParams }: { searchParams: Promise<{ handled?: string }> }) {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("ManageReports");
    const handled = (await searchParams).handled === "1";
    const reports = await getReports(!handled);

    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">{t("text")}</p>
        <LinkTabs label={t("tabs")} items={[
          { href: "/manage/reports", label: t("open"), active: !handled },
          { href: "/manage/reports?handled=1", label: t("handledTab"), active: handled },
        ]} />
        <ReportHandling reports={reports} />
      </div>
    );
  });
}
