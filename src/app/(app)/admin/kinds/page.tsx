import { getTranslations } from "next-intl/server";
import { getAlbumKinds } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { KindsEditor } from "./kinds-editor.client";

/**
 * The album kinds: admins add, rename, reorder and delete them.
 */
export default async function KindsPage() {
  return withPolicyPage(Policies.admin.requireAdmin, async () => {
    const t = await getTranslations("AdminKinds");
    const kinds = await getAlbumKinds();

    return (
      <div className="max-w-3xl space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{t("text")}</p>
        <KindsEditor kinds={kinds} />
      </div>
    );
  });
}
