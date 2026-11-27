import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UploadDropZone, UploadList } from "@/components/upload/uploads.client";
import { SpexflixHint } from "@/components/gram/spexflix-hint";
import { getContribute } from "@/lib/gram/gram.server";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { ID } from "@/utils/ids";
import { Page, PageHeader } from "@bloomper/fgv-web-ui/shell/page-header";

/**
 * *Lägg till dina bilder*: a member uploads photos and videos to an album for members or the public (or one they
 * suggested); they wait for an editor's review.
 */
export default async function ContributePage({ params }: { params: Promise<{ id: string }> }) {
  return withPolicyPage(Policies.app.requireAccess, async () => {
    const { id } = await params;
    const data = ID.test(id) ? await getContribute(id) : null;
    const album = data?.album;

    if (!album || !data) {
      notFound();
    }

    const t = await getTranslations("Contribute");
    const open = album.visibility !== "UNPUBLISHED" || album.suggested;

    return (
      <Page
        variant="content"
        className="mx-auto w-full max-w-3xl"
      >
        <nav className="text-muted-foreground text-sm">
          <Link
            href={`/albums/${album.id}`}
            className="hover:text-link"
          >
            {album.title}
          </Link>
        </nav>
        <PageHeader
          title={t("title", { album: album.title })}
          description={t("text")}
        />
        <p className="text-muted-foreground text-sm">
          {t("limits", { items: data.limits.contributionMaxItems, gb: data.limits.contributionMaxGb })}
        </p>
        {open ? (
          <UploadDropZone
            target={{
              albumId: album.id,
              albumTitle: album.title,
              mode: "contribution",
              maxBytes: data.limits.maxUploadBytes,
            }}
            hint={<SpexflixHint maxMinutes={data.limits.maxVideoMinutes} />}
          />
        ) : (
          <p className="text-destructive">{t("closed")}</p>
        )}
        <UploadList albumId={album.id} />
        <p className="text-sm">
          <Link
            href="/contributions"
            className="text-link hover:text-link/80"
          >
            {t("mine")}
          </Link>
        </p>
      </Page>
    );
  });
}
