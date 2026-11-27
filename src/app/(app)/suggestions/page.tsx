import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@bloomper/fgv-web-ui/ui/badge";
import { SuggestForm } from "@/components/gram/suggest-form.client";
import { getMySuggestions } from "@/lib/gram/gram.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { formatInstant } from "@/utils/format";
import { DataEmpty } from "@bloomper/fgv-web-ui/shell/data-empty";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Suggesting an album, and the member's suggestions with how they went.
 */
export default async function SuggestionsPage() {
  return withPolicyPage(Policies.app.requireAccess, async () => {
    const t = await getTranslations("Suggestions");
    const data = await getMySuggestions();
    const suggestions = data.suggestions;

    return (
      <Page variant="content">
        <PageHeader title={t("title")} description={t("text")}/>
        <SuggestForm kinds={data.kinds} />
        <section aria-labelledby="my-suggestions" className="space-y-2">
          <h2 id="my-suggestions" className="text-lg font-semibold">{t("mine")}</h2>
          {suggestions.length === 0 ? <DataEmpty title={t("none")} description={null} /> : (
            <ul className="divide-y overflow-hidden rounded-lg border">
              {suggestions.map(suggestion => (
                <li key={suggestion.id} className="link-row flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {suggestion.album
                        ? <Link href={`/albums/${suggestion.album.id}`} className="row-link">{suggestion.title}</Link>
                        : suggestion.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatInstant(suggestion.createdAt)}</p>
                    {suggestion.message && <p className="text-sm">{suggestion.message}</p>}
                  </div>
                  <Badge variant={suggestion.status === "REJECTED" ? "destructive" : suggestion.status === "ACCEPTED" ? "default" : "secondary"}>
                    {t(`status.${suggestion.status}`)}
                  </Badge>
                  {suggestion.status === "OPEN" && suggestion.album && (
                    <Link href={`/albums/${suggestion.album.id}/contribute`} className="text-sm text-link hover:text-link/80">{t("contribute")}</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Page>
    );
  });
}
