import { getTranslations } from "next-intl/server";
import { AlbumForm } from "@/components/manage/album-form.client";
import { getAlbumKinds } from "@/lib/gram/manage.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

export default async function NewAlbumPage() {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const t = await getTranslations("ManageAlbum");
    const kinds = await getAlbumKinds();

    return (
      <Page variant="content">
        <PageHeader
          title={t("newTitle")}
          description={t("newText")}
        />
        <AlbumForm kinds={kinds} />
      </Page>
    );
  });
}
