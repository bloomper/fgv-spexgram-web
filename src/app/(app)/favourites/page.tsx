import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Timeline } from "@/components/gram/timeline.client";
import { DataEmpty } from "@/components/data-empty";
import { PageHeader } from "@/components/page-header";
import { getMe, getTimeline } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { withPolicyPage } from "@/utils/route.server";
import { Policies } from "@/utils/policy.server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The member's favourites, as a timeline of their own. Favourites are personal and never change what others see.
 */
export default async function FavouritesPage() {
  return withPolicyPage(Policies.app.requireAccess, async () => {
    const t = await getTranslations("Favourites");
    const [months, viewer, me] = await Promise.all([getTimeline(true), getViewer(), getMe()]);
    const options = { canDownloadOriginals: me?.limits.canDownloadOriginals ?? false, report: viewer.report, editor: viewer.editor };

    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <PageHeader title={t("title")} description={t("description")} />
        {months && months.length > 0
          ? <Timeline months={months} favourites options={options} member editor={viewer.editor} />
          : <DataEmpty title={t("none")} description={t("noneText")} />}
      </div>
    );
  });
}
