import { getTranslations } from "next-intl/server";
import { AlbumForm } from "@/components/manage/album-form.client";
import { getAlbumKinds } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";

export default async function NewAlbumPage() {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("ManageAlbum");
    const kinds = await getAlbumKinds();

    return (
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("newText")}</p>
        <AlbumForm kinds={kinds} />
      </div>
    );
  });
}
