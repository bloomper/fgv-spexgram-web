import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlbumGrid } from "@/components/gram/album-card";
import { AlbumFilters } from "@/components/gram/album-filters";
import { Pager } from "@/components/gram/pager";
import { DataEmpty } from "@/components/data-empty";
import { getBrowse } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { filterHref, type FilterSearch, firstValues, toAlbumFilter, toPage } from "@/utils/filters";

const SIZE = 48;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Albums");

  return { title: t("title"), robots: { index: true, follow: true } };
}

/**
 * Every album the viewer may see, newest first, filtered by category, year, kind and spex.
 */
export default async function AlbumsPage({ searchParams }: { searchParams: Promise<FilterSearch> }) {
  const t = await getTranslations("Albums");
  const search = firstValues(await searchParams);
  const viewer = await getViewer();
  const page = toPage(search.page);
  const data = await getBrowse(toAlbumFilter(search, viewer.editor), page, SIZE);
  const albums = data?.albums.albums ?? [];
  const pages = Math.max(1, Math.ceil((data?.albums.totalCount ?? 0) / SIZE));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      {data && (
        <AlbumFilters path="/albums" search={search} categories={data.categories} years={data.years} kinds={data.albumKinds}
                      spex={data.spexWithAlbums} editor={viewer.editor} />
      )}
      <p className="text-sm text-muted-foreground" aria-live="polite">{t("count", { count: data?.albums.totalCount ?? 0 })}</p>
      {albums.length > 0
        ? <AlbumGrid albums={albums} showVisibility={viewer.editor} />
        : <DataEmpty title={t("none")} description={viewer.member ? t("noneText") : t("noneVisitor")} />}
      <Pager page={page} pages={pages} hrefOf={next => filterHref("/albums", search, { page: String(next) })} />
      {data && data.spexWithAlbums.length > 0 && (
        <section id="spex" aria-labelledby="spex-heading" className="space-y-2 pt-4">
          <h2 id="spex-heading" className="text-lg font-semibold">{t("bySpex")}</h2>
          <ul className="columns-2 gap-6 text-sm sm:columns-3 lg:columns-4">
            {data.spexWithAlbums.map(spex => (
              <li key={spex.id} className="break-inside-avoid py-0.5">
                <Link href={`/spex/${spex.id}`} className="hover:text-primary">
                  {[spex.title, spex.year].filter(Boolean).join(" ")}
                </Link>
                {spex.revival && <span className="text-muted-foreground"> ({t("revival")})</span>}
                <span className="text-muted-foreground"> · {spex.albumCount ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
