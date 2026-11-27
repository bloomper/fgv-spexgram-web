import { getTranslations } from "next-intl/server";
import { getAlbumKinds } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { KindsEditor } from "./kinds-editor.client";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

/**
 * The album kinds: admins add, rename, reorder and delete them.
 */
export default async function KindsPage() {
  return withPolicyPage(Policies.admin.requireAdmin, async () => {
    const t = await getTranslations("AdminKinds");
    const kinds = await getAlbumKinds();

    return (
      <Page variant="content" className="max-w-3xl">
        <PageHeader title={t("title")} description={t("text")}/>
        <KindsEditor kinds={kinds} />
      </Page>
    );
  });
}
