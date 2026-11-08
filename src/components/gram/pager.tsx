import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Previous and next page links, with where in the pages the viewer is.
 */
export async function Pager({ page, pages, hrefOf }: { page: number; pages: number; hrefOf: (page: number) => string }) {
  const t = await getTranslations("Common");

  if (pages <= 1) {
    return null;
  }
  return (
    <nav className="flex items-center gap-3 text-sm" aria-label={t("pages")}>
      {page > 0 && <Link href={hrefOf(page - 1)} className="text-primary hover:text-primary/80">{t("previousPage")}</Link>}
      <span className="text-muted-foreground">{t("pageOf", { page: page + 1, pages })}</span>
      {page + 1 < pages && <Link href={hrefOf(page + 1)} className="text-primary hover:text-primary/80">{t("nextPage")}</Link>}
    </nav>
  );
}
