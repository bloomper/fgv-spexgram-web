import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { kindName } from "@/utils/format";
import { filterHref, type FilterSearch } from "@/utils/filters";
import { cn } from "@/utils/utils";

const chip =
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The album kinds as chips above the albums, as configured by admins (only those in use): one picks the kind and
 * keeps the rest of the filter.
 */
export async function KindChips({
  kinds,
  search,
  path = "/albums",
}: {
  kinds: { id: string; nameSv: string; nameEn: string; albumCount: number }[];
  search: FilterSearch;
  path?: string;
}) {
  const t = await getTranslations("Albums");
  const locale = await getLocale();
  const used = kinds.filter((kind) => kind.albumCount > 0 || kind.id === search.kind);

  if (used.length < 2) {
    return null;
  }
  return (
    <nav aria-label={t("kind")}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={filterHref(path, search, { kind: undefined, page: undefined })}
            aria-current={!search.kind ? "page" : undefined}
            className={cn(
              chip,
              !search.kind && "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {t("allKinds")}
          </Link>
        </li>
        {used.map((kind) => (
          <li key={kind.id}>
            <Link
              href={filterHref(path, search, { kind: kind.id, page: undefined })}
              aria-current={search.kind === kind.id ? "page" : undefined}
              className={cn(
                chip,
                search.kind === kind.id && "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {kindName(kind, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
