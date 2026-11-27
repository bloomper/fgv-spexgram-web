import { getTranslations } from "next-intl/server";
import { ContributionReview, SuggestionReview } from "@/components/manage/review.client";
import { getContributions } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

/**
 * The review queue: contributions waiting for review, and members' album suggestions.
 */
export default async function ManageContributionsPage() {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("Review");
    const data = await getContributions();

    return (
      <Page variant="content">
        <PageHeader
          title={t("title")}
          description={t("text")}
        />
        <section
          aria-labelledby="queue"
          className="space-y-3"
        >
          <h2
            id="queue"
            className="text-lg font-semibold"
          >
            {t("contributions", { count: data?.contributions.length ?? 0 })}
          </h2>
          <ContributionReview items={data?.contributions ?? []} />
        </section>
        <section
          aria-labelledby="suggestions"
          className="space-y-3"
        >
          <h2
            id="suggestions"
            className="text-lg font-semibold"
          >
            {t("suggestions", { count: data?.albumSuggestions.length ?? 0 })}
          </h2>
          <SuggestionReview suggestions={data?.albumSuggestions ?? []} />
        </section>
      </Page>
    );
  });
}
