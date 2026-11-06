import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { kindName } from "@/utils/format";

type Props = {
  categories: { id: string; name: string; albumCount: number }[];
  years: number[];
  kinds: { id: string; nameSv: string; nameEn: string; albumCount: number }[];
  spex: { id: string; title?: string | null; year?: number | null; revival?: boolean | null; albumCount?: number | null }[];
  /** How many spex to offer before *All*. */
  spexLimit?: number;
};

const chip = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Browsing by category, year, kind and spex, as rows of links to the filtered album list.
 */
export async function BrowseChips({ categories, years, kinds, spex, spexLimit = 12 }: Props) {
  const t = await getTranslations("Browse");
  const locale = await getLocale();
  const usedKinds = kinds.filter(kind => kind.albumCount > 0);

  return (
    <nav aria-label={t("label")} className="space-y-3">
      {categories.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">{t("categories")}</h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map(category => (
              <li key={category.id}>
                <Link href={`/albums?category=${category.id}`} className={chip}>
                  {category.name} <span className="text-muted-foreground">{category.albumCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {usedKinds.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">{t("kinds")}</h2>
          <ul className="flex flex-wrap gap-2">
            {usedKinds.map(kind => (
              <li key={kind.id}><Link href={`/albums?kind=${kind.id}`} className={chip}>{kindName(kind, locale)}</Link></li>
            ))}
          </ul>
        </div>
      )}
      {years.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">{t("years")}</h2>
          <ul className="flex flex-wrap gap-1.5">
            {years.map(year => (
              <li key={year}>
                <Link href={`/albums?year=${year}`} className="rounded-md border px-2.5 py-1 text-sm tabular-nums hover:bg-accent">{year}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {spex.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">{t("spex")}</h2>
          <ul className="flex flex-wrap gap-2">
            {spex.slice(0, spexLimit).map(item => (
              <li key={item.id}>
                <Link href={`/spex/${item.id}`} className={chip}>
                  {[item.title, item.year].filter(Boolean).join(" ")}
                  {item.revival && <span className="text-muted-foreground">({t("revival")})</span>}
                </Link>
              </li>
            ))}
            {spex.length > spexLimit && (
              <li><Link href="/albums#spex" className={`${chip} text-primary`}>{t("allSpex", { count: spex.length })}</Link></li>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
}
