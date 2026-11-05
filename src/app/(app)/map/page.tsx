import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ItemMap } from "@/components/map/item-map.client";
import { AlbumFilters } from "@/components/gram/album-filters";
import { getMapItems, getMe, getSearchFilters } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { type FilterSearch, toAlbumFilter } from "@/utils/filters";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The map of items with a position, for members.
 */
export default async function MapPage({ searchParams }: { searchParams: Promise<FilterSearch> }) {
  return withPolicyPage(Policies.app.requireAccess, async () => {
    const t = await getTranslations("Map");
    const search = await searchParams;
    const [items, filters, me, viewer] = await Promise.all([
      getMapItems(toAlbumFilter(search)), getSearchFilters(), getMe(), getViewer(),
    ]);

    return (
      <div className="space-y-4 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("text")}</p>
        {filters && <AlbumFilters path="/map" search={search} categories={filters.categories} years={filters.years}
                                  kinds={filters.albumKinds} />}
        <ItemMap items={items} options={{ canDownloadOriginals: me?.limits.canDownloadOriginals ?? false, report: viewer.report }} />
      </div>
    );
  });
}
