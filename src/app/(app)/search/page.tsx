import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { SubmitButton } from "@/components/submit-button.client";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlbumGrid } from "@/components/gram/album-card";
import { AlbumFilters } from "@/components/gram/album-filters";
import { Gallery } from "@/components/gram/gallery.client";
import { getMe, getSearchFilters, search, smartSearch } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { GraphQLRequestError } from "@/lib/graphql.server";
import { loginHref } from "@/utils/auth";
import { filterHref, type FilterSearch, firstValues, toAlbumFilter } from "@/utils/filters";
import { DataEmpty } from "@/components/data-empty";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Search");

  return { title: t("title"), robots: { index: false, follow: true } };
}

/**
 * Search by text across album titles, places, descriptions, captions and photographers, for everyone; members can
 * also search by content (Immich's smart search), narrowed by category, year and kind.
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<FilterSearch> }) {
  const t = await getTranslations("Search");
  const params = firstValues(await searchParams);
  const q = (params.q ?? "").trim().slice(0, 200);
  const viewer = await getViewer();
  const smart = viewer.member && params.smart === "1";
  const ready = q.length >= 2;
  const tooShort = q.length === 1;
  const [result, smartItems, filters, me] = await Promise.all([
    ready && !smart ? search(q) : Promise.resolve(null),
    ready && smart ? smartSearch(q, toAlbumFilter(params)).catch((error: unknown) => {
      if (error instanceof GraphQLRequestError) {
        return error;
      }
      throw error;
    }) : Promise.resolve(null),
    smart ? getSearchFilters() : Promise.resolve(null),
    viewer.member ? getMe() : Promise.resolve(null),
  ]);
  const options = { canDownloadOriginals: me?.limits.canDownloadOriginals ?? false, report: viewer.report };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{ready ? t("resultsFor", { q }) : t("title")}</h1>
      <Form action="/search" role="search" className="flex flex-wrap items-end gap-3" key={`${q}-${smart}`}>
        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <Label htmlFor="search-q">{t("words")}</Label>
          <Input id="search-q" name="q" type="search" defaultValue={q} maxLength={200}
                 aria-invalid={tooShort || undefined} aria-describedby={tooShort ? "search-q-error" : undefined} />
        </div>
        {viewer.member && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="smart" value="1" defaultChecked={smart} className="accent-primary" />
            {t("smart")}
          </label>
        )}
        <SubmitButton>{t("search")}</SubmitButton>
      </Form>
      {tooShort && <p id="search-q-error" className="-mt-4 text-sm text-destructive">{t("tooShort")}</p>}
      {viewer.member
        ? <p className="text-sm text-muted-foreground">{smart ? t("smartHint") : t("textHint")}</p>
        : <p className="text-sm text-muted-foreground">{t("visitorHint")}{" "}
          <a href={loginHref(q ? `/search?q=${encodeURIComponent(q)}` : "/search")} className="text-primary hover:text-primary/80">{t("loginForMore")}</a>
        </p>}

      {smart && filters && (
        <AlbumFilters path="/search" search={params} categories={filters.categories} years={filters.years}
                      kinds={filters.albumKinds} keep={{ q, smart: "1" }} />
      )}

      {!q && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Search /></EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyText")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/albums" className="text-sm text-primary hover:text-primary/80">{t("browse")}</Link>
          </EmptyContent>
        </Empty>
      )}

      {result && (
        <>
          {result.albums.length > 0 && (
            <section aria-labelledby="search-albums" className="space-y-3">
              <h2 id="search-albums" className="text-lg font-semibold">{t("albums", { count: result.albums.length })}</h2>
              <AlbumGrid albums={result.albums} showVisibility={viewer.editor} />
            </section>
          )}
          {result.items.length > 0 && (
            <section aria-labelledby="search-items" className="space-y-3">
              <h2 id="search-items" className="text-lg font-semibold">{t("items", { count: result.items.length })}</h2>
              <Gallery items={result.items} options={options} rowHeight={180} />
            </section>
          )}
          {result.albums.length === 0 && result.items.length === 0 && <DataEmpty title={t("none")} description={null} />}
        </>
      )}

      {smartItems instanceof GraphQLRequestError && <p className="text-destructive" role="alert">{smartItems.message}</p>}
      {Array.isArray(smartItems) && (smartItems.length > 0
        ? <Gallery items={smartItems} options={options} rowHeight={180} />
        : <DataEmpty title={t("none")} description={null} />)}
      {smart && ready && (
        <p className="text-sm">
          <Link href={filterHref("/search", { q })} className="text-primary hover:text-primary/80">{t("textInstead")}</Link>
        </p>
      )}
    </div>
  );
}
