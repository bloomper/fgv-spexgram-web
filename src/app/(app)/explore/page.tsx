import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { AlbumGrid } from "@/components/gram/album-card";
import { HomeSection } from "@/components/home-section";
import { PageHeader } from "@/components/page-header";
import { getExplore } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { kindName } from "@/utils/format";
import { decadesOf } from "@/utils/filters";

export const metadata: Metadata = { robots: { index: true, follow: true } };

const chip = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Explore: the spex as tiles with their posters, the decades, kinds, categories and places of the albums, suggested
 * searches by content for members (by text for visitors), and the most recently added albums.
 */
export default async function ExplorePage() {
  const t = await getTranslations("Explore");
  const locale = await getLocale();
  const [data, viewer] = await Promise.all([getExplore(), getViewer()]);
  const decades = decadesOf(data?.years ?? []);
  const kinds = (data?.albumKinds ?? []).filter(kind => kind.albumCount > 0);
  const suggestions = t("suggestions").split(",").map(word => word.trim()).filter(Boolean);
  // A spex and its revivals are one tile, leading to the spex's page, which lists them all; the newest comes first
  const spex = [...new Map((data?.spexWithAlbums ?? []).map(entry => [entry.familyId, entry])).values()]
    .map(entry => ({ ...entry, albumCount: data!.spexWithAlbums.filter(other => other.familyId === entry.familyId)
      .reduce((sum, other) => sum + (other.albumCount ?? 0), 0) }));

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-8">
      <PageHeader title={t("title")} description={t("description")} />

      <HomeSection id="suggested" title={t("suggested")}>
        <ul className="flex flex-wrap gap-2">
          {suggestions.map(word => (
            <li key={word}>
              <Link href={`/search?q=${encodeURIComponent(word)}${viewer.member ? "&smart=1" : ""}`} className={chip}>
                <Search className="size-3.5" aria-hidden /> {word}
              </Link>
            </li>
          ))}
        </ul>
      </HomeSection>

      {spex.length > 0 && (
        <HomeSection id="spex" title={t("spex")} more={{ href: "/albums#spex", label: t("allSpex") }}>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {spex.map(entry => (
              <li key={entry.id}>
                <Link href={`/spex/${entry.familyId}`} className="group block space-y-1 focus-visible:outline-none">
                  <span className="block aspect-[3/4] overflow-hidden rounded-lg border bg-muted group-focus-visible:ring-2 group-focus-visible:ring-ring">
                    {entry.posterUrl
                      // eslint-disable-next-line @next/next/no-img-element -- a public poster in Spexipedia
                      ? <img src={entry.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      : <span className="flex h-full items-center justify-center p-2 text-center text-sm font-semibold text-muted-foreground">{entry.title}</span>}
                  </span>
                  <span className="line-clamp-2 block text-sm leading-tight">{[entry.title, entry.year].filter(Boolean).join(" ")}</span>
                  <span className="block text-xs text-muted-foreground">{t("albums", { count: entry.albumCount ?? 0 })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </HomeSection>
      )}

      {decades.length > 0 && (
        <HomeSection id="decades" title={t("decades")}>
          <ul className="flex flex-wrap gap-2">
            {decades.map(decade => (
              <li key={decade}><Link href={`/albums?decade=${decade}`} className={chip}>{t("decade", { decade })}</Link></li>
            ))}
          </ul>
        </HomeSection>
      )}

      {kinds.length > 0 && (
        <HomeSection id="kinds" title={t("kinds")}>
          <ul className="flex flex-wrap gap-2">
            {kinds.map(kind => (
              <li key={kind.id}>
                <Link href={`/albums?kind=${kind.id}`} className={chip}>
                  {kindName(kind, locale)} <span className="text-muted-foreground">{kind.albumCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </HomeSection>
      )}

      {data && data.categories.length > 1 && (
        <HomeSection id="categories" title={t("categories")}>
          <ul className="flex flex-wrap gap-2">
            {data.categories.map(category => (
              <li key={category.id}>
                <Link href={`/albums?category=${category.id}`} className={chip}>
                  {category.name} <span className="text-muted-foreground">{category.albumCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </HomeSection>
      )}

      {data && data.places.length > 0 && (
        <HomeSection id="places" title={t("places")}>
          <ul className="flex flex-wrap gap-2">
            {data.places.slice(0, 30).map(place => (
              <li key={place.name}>
                <Link href={`/albums?place=${encodeURIComponent(place.name)}`} className={chip}>
                  {place.name} <span className="text-muted-foreground">{place.albumCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </HomeSection>
      )}

      {data && data.recentAlbums.length > 0 && (
        <HomeSection id="recent" title={t("recent")} more={{ href: "/albums", label: t("allAlbums") }}>
          <AlbumGrid albums={data.recentAlbums} showVisibility={viewer.editor} />
        </HomeSection>
      )}
    </div>
  );
}
