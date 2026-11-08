import Form from "next/form";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/submit-button.client";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { kindName } from "@/utils/format";
import type { FilterSearch } from "@/utils/filters";

type Props = {
  path: string;
  search: FilterSearch;
  categories: { id: string; name: string }[];
  years: number[];
  kinds: { id: string; nameSv: string; nameEn: string }[];
  spex?: { id: string; title?: string | null; year?: number | null; revival?: boolean | null }[];
  /** Editors filter by visibility too. */
  editor?: boolean;
  /** Kept as hidden fields, e.g. the search words. */
  keep?: Partial<FilterSearch>;
};

/**
 * Filters for albums (category, year, kind, spex, and visibility for editors) as a form that works without
 * JavaScript and keeps the filter in the address.
 */
export async function AlbumFilters({ path, search, categories, years, kinds, spex, editor, keep }: Props) {
  const t = await getTranslations("Albums");
  const locale = await getLocale();
  const filtered = Boolean(search.category || search.year || search.kind || search.spex || search.visibility);

  return (
    <Form action={path} role="search" aria-label={t("filters")} key={JSON.stringify(search)}
          className="grid grid-cols-2 gap-3 rounded-lg border p-3 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
      {Object.entries(keep ?? {}).map(([key, value]) => value ? <input key={key} type="hidden" name={key} value={value} /> : null)}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-category">{t("category")}</Label>
        <NativeSelect id="filter-category" name="category" defaultValue={search.category ?? ""} className="w-full">
          <NativeSelectOption value="">{t("allCategories")}</NativeSelectOption>
          {categories.map(category => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-year">{t("year")}</Label>
        <NativeSelect id="filter-year" name="year" defaultValue={search.year ?? ""} className="w-full">
          <NativeSelectOption value="">{t("allYears")}</NativeSelectOption>
          {years.map(year => <NativeSelectOption key={year} value={String(year)}>{year}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-kind">{t("kind")}</Label>
        <NativeSelect id="filter-kind" name="kind" defaultValue={search.kind ?? ""} className="w-full">
          <NativeSelectOption value="">{t("allKinds")}</NativeSelectOption>
          {kinds.map(kind => <NativeSelectOption key={kind.id} value={kind.id}>{kindName(kind, locale)}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      {spex && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-spex">{t("spex")}</Label>
          <NativeSelect id="filter-spex" name="spex" defaultValue={search.spex ?? ""} className="w-full">
            <NativeSelectOption value="">{t("allSpex")}</NativeSelectOption>
            {spex.map(item => (
              <NativeSelectOption key={item.id} value={item.id}>
                {[item.title, item.year].filter(Boolean).join(" ")}{item.revival ? ` (${t("revival")})` : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
      {editor && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-visibility">{t("visibility")}</Label>
          <NativeSelect id="filter-visibility" name="visibility" defaultValue={search.visibility ?? ""} className="w-full">
            <NativeSelectOption value="">{t("allVisibilities")}</NativeSelectOption>
            {(["UNPUBLISHED", "MEMBERS", "PUBLIC"] as const).map(value =>
              <NativeSelectOption key={value} value={value}>{t(`visibilities.${value}`)}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      )}
      <div className="col-span-2 flex items-end gap-2 md:col-span-1">
        <SubmitButton>{t("filter")}</SubmitButton>
        {filtered && <Link href={path} className="px-2 py-2 text-sm text-primary hover:text-primary/80">{t("reset")}</Link>}
      </div>
    </Form>
  );
}
