import { getTranslations } from "next-intl/server";
import { UnsortedSorter } from "@/components/manage/unsorted.client";
import { getUnsorted } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";

export default async function UnsortedPage() {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("Unsorted");
    const days = await getUnsorted();

    return (
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">{t("text")}</p>
        <UnsortedSorter days={days} />
      </div>
    );
  });
}
