import { getTranslations } from "next-intl/server";
import { UnsortedSorter } from "@/components/manage/unsorted.client";
import { getUnsorted } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

export default async function UnsortedPage() {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("Unsorted");
    const days = await getUnsorted();

    return (
      <Page variant="content">
        <PageHeader
          title={t("title")}
          description={t("text")}
        />
        <UnsortedSorter days={days} />
      </Page>
    );
  });
}
