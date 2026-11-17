import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Memories } from "@/components/gram/memories.client";
import { Timeline } from "@/components/gram/timeline.client";
import { DataEmpty } from "@/components/data-empty";
import { getMe, getMemories, getTimeline } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: true, follow: true },
    // No image: the application has no picture of its own (only the FGV logo, for the manifest)
    openGraph: { title: t("title"), description: t("description"), type: "website", siteName: "Spexgram" },
  };
}

/**
 * The start page, Photos: memories at the top (this day in earlier years, albums of spex whose premiere is near
 * today), then the timeline of every item the viewer may see across albums, newest first. Visitors see the same of
 * what is public, under the public welcome text.
 */
export default async function PhotosPage() {
  const t = await getTranslations("Home");
  const [memories, months, viewer] = await Promise.all([getMemories(), getTimeline(false), getViewer()]);
  const me = viewer.member ? await getMe() : undefined;
  const options = { canDownloadOriginals: me?.limits.canDownloadOriginals ?? false, report: viewer.report, editor: viewer.editor };
  const welcome = memories?.startPage.welcome;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <h1 className="sr-only">{t("photos")}</h1>
      {!viewer.member && (
        <section className="space-y-2">
          <p className="max-w-4xl whitespace-pre-line text-pretty text-muted-foreground">{welcome || t("introVisitor")}</p>
          {memories?.startPage.contactEmail && (
            <p className="text-sm text-muted-foreground">
              {t("contact")} <a className="text-primary hover:text-primary/80" href={`mailto:${memories.startPage.contactEmail}`}>{memories.startPage.contactEmail}</a>
            </p>
          )}
        </section>
      )}
      {viewer.member && welcome && <p className="max-w-4xl whitespace-pre-line text-pretty text-muted-foreground">{welcome}</p>}
      {memories && (
        <Memories thisDay={memories.thisDayInHistory} premiereAlbums={memories.premiereAlbums} options={options}
                  now={new Date().toISOString()} />
      )}
      {months && months.length > 0
        ? <Timeline months={months} options={options} member={viewer.member} editor={viewer.editor} />
        : <DataEmpty title={t("empty")} description={viewer.member ? t("emptyText") : t("emptyVisitor")} />}
    </div>
  );
}
