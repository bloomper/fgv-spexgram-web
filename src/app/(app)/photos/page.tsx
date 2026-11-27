import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Timeline } from "@/components/gram/timeline.client";
import { DataEmpty } from "@bloomper/fgv-web-ui/shell/data-empty";
import { getMe, getTimeline } from "@/lib/gram/gram.server";
import { publicMetadata } from "@/lib/gram/metadata.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { Page } from "@bloomper/fgv-web-ui/shell/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Home");

  return publicMetadata({ title: t("photos"), description: (await getTranslations("Meta"))("description") });
}

/** Photos: the timeline of every item the viewer may see across albums, newest first (visitors: what is public). */
export default async function PhotosPage() {
  const t = await getTranslations("Home");
  const [months, viewer] = await Promise.all([getTimeline(false), getViewer()]);
  const me = viewer.member ? await getMe() : undefined;
  const options = { canDownloadOriginals: me?.limits.canDownloadOriginals ?? false, report: viewer.report, editor: viewer.editor };

  return (
    <Page variant="content">
      <h1 className="sr-only">{t("photos")}</h1>
      {months && months.length > 0
        ? <Timeline months={months} options={options} member={viewer.member} editor={viewer.editor} />
        : <DataEmpty title={t("empty")} description={viewer.member ? t("emptyText") : t("emptyVisitor")} />}
    </Page>
  );
}
