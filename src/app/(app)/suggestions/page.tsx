import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { SuggestForm } from "@/components/gram/suggest-form.client";
import { getMySuggestions } from "@/lib/gram/gram.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { formatInstant } from "@/utils/format";

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
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-4xl text-pretty text-muted-foreground">{t("text")}</p>
        <SuggestForm kinds={data.kinds} />
        <section aria-labelledby="my-suggestions" className="space-y-2">
          <h2 id="my-suggestions" className="text-lg font-semibold">{t("mine")}</h2>
          {suggestions.length === 0 ? <p className="text-muted-foreground">{t("none")}</p> : (
            <ul className="divide-y rounded-lg border">
              {suggestions.map(suggestion => (
                <li key={suggestion.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {suggestion.album
                        ? <Link href={`/albums/${suggestion.album.id}`} className="hover:underline">{suggestion.title}</Link>
                        : suggestion.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatInstant(suggestion.createdAt)}</p>
                    {suggestion.message && <p className="text-sm">{suggestion.message}</p>}
                  </div>
                  <Badge variant={suggestion.status === "REJECTED" ? "destructive" : suggestion.status === "ACCEPTED" ? "default" : "secondary"}>
                    {t(`status.${suggestion.status}`)}
                  </Badge>
                  {suggestion.status === "OPEN" && suggestion.album && (
                    <Link href={`/albums/${suggestion.album.id}/contribute`} className="text-sm text-primary hover:underline">{t("contribute")}</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  });
}
