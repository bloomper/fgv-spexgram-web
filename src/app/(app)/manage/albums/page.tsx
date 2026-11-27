import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button } from "@bloomper/fgv-web-ui/ui/button";
import { AlbumGrid } from "@/components/gram/album-card";
import { AlbumFilters } from "@/components/gram/album-filters";
import { Pager } from "@/components/gram/pager";
import { getBrowse } from "@/lib/gram/gram.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { filterHref, type FilterSearch, firstValues, toAlbumFilter, toPage } from "@/utils/filters";
import { DataEmpty } from "@bloomper/fgv-web-ui/shell/data-empty";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

const SIZE = 48;

/**
 * Every album outside the trash, for editors, filtered by visibility too; each opens its edit page.
 */
export default async function ManageAlbumsPage({ searchParams }: { searchParams: Promise<FilterSearch> }) {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("ManageAlbums");
    const search = firstValues(await searchParams);
    const page = toPage(search.page);
    const data = await getBrowse(toAlbumFilter(search, true), page, SIZE);
    const pages = Math.max(1, Math.ceil((data?.albums.totalCount ?? 0) / SIZE));

    return (
      <Page variant="content">
        <PageHeader title={t("title")} actions={<Button nativeButton={false} render={<Link href="/manage/albums/new" />}><Plus /> {t("new")}</Button>}/>
        {data && <AlbumFilters path="/manage/albums" search={search} categories={data.categories} years={data.years}
                               kinds={data.albumKinds} spex={data.spexWithAlbums} editor />}
        <p className="text-sm text-muted-foreground">{t("count", { count: data?.albums.totalCount ?? 0 })}</p>
        {data && data.albums.albums.length > 0
          ? <AlbumGrid albums={data.albums.albums} showVisibility hrefOf={album => `/manage/albums/${album.id}`} />
          : <DataEmpty title={t("none")} description={null} />}
        <Pager page={page} pages={pages} hrefOf={next => filterHref("/manage/albums", search, { page: String(next) })} />
      </Page>
    );
  });
}
