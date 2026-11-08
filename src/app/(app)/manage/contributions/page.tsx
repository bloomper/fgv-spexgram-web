import { getTranslations } from "next-intl/server";
import { ContributionReview, SuggestionReview } from "@/components/manage/review.client";
import { getContributions } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";

/**
 * The review queue: contributions waiting for review, and members' album suggestions.
 */
export default async function ManageContributionsPage() {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("Review");
    const data = await getContributions();

    return (
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">{t("text")}</p>
        <section aria-labelledby="queue" className="space-y-3">
          <h2 id="queue" className="text-lg font-semibold">{t("contributions", { count: data?.contributions.length ?? 0 })}</h2>
          <ContributionReview items={data?.contributions ?? []} />
        </section>
        <section aria-labelledby="suggestions" className="space-y-3">
          <h2 id="suggestions" className="text-lg font-semibold">{t("suggestions", { count: data?.albumSuggestions.length ?? 0 })}</h2>
          <SuggestionReview suggestions={data?.albumSuggestions ?? []} />
        </section>
      </div>
    );
  });
}
