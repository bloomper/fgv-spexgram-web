import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeSection } from "@/components/home-section";
import { AlbumGrid } from "@/components/gram/album-card";
import { BrowseChips } from "@/components/gram/browse-chips";
import { Gallery } from "@/components/gram/gallery.client";
import { getHome, getMe } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: true, follow: true },
    openGraph: { title: t("title"), description: t("description"), type: "website", images: ["/icon-512.png"] },
  };
}

/**
 * The start page, for visitors and members alike: the welcome text (the public one for visitors), browsing, the most
 * recently added albums and what was photographed on this day in earlier years.
 */
export default async function HomePage() {
  const t = await getTranslations("Home");
  const [home, viewer] = await Promise.all([getHome(), getViewer()]);
  const me = viewer.member ? await getMe() : undefined;

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <section className="flex items-start gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {me?.me ? t("greeting", { name: me.me.displayName ?? me.me.username }) : t("title")}
          </h1>
          <p className="max-w-4xl whitespace-pre-line text-pretty text-muted-foreground">
            {home?.startPage.welcome || (viewer.member ? t("intro") : t("introVisitor"))}
          </p>
          {!viewer.member && home?.startPage.contactEmail && (
            <p className="text-sm text-muted-foreground">
              {t("contact")} <a className="text-primary underline" href={`mailto:${home.startPage.contactEmail}`}>{home.startPage.contactEmail}</a>
            </p>
          )}
        </div>
      </section>

      {home && (
        <BrowseChips categories={home.categories} years={home.years} kinds={home.albumKinds} spex={home.spexWithAlbums} />
      )}

      <HomeSection id="recent" title={t("recent")} more={{ href: "/albums", label: t("allAlbums") }}>
        {home && home.recentAlbums.length > 0
          ? <AlbumGrid albums={home.recentAlbums} showVisibility={viewer.editor} />
          : <p className="text-muted-foreground">{t("empty")}</p>}
      </HomeSection>

      {home && home.thisDayInHistory.length > 0 && (
        <HomeSection id="this-day" title={t("thisDay")}>
          <p className="-mt-2 text-sm text-muted-foreground">{t("thisDayText")}</p>
          <Gallery items={home.thisDayInHistory} rowHeight={160}
                   options={{ canDownloadOriginals: me?.limits.canDownloadOriginals ?? false, report: viewer.report }} />
        </HomeSection>
      )}
    </div>
  );
}
