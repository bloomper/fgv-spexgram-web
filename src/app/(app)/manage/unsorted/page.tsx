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
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">{t("text")}</p>
        <UnsortedSorter days={days} />
      </div>
    );
  });
}
