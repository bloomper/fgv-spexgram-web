import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlbumForm } from "@/components/manage/album-form.client";
import { ItemsManager } from "@/components/manage/items-manager.client";
import { VisibilityControl } from "@/components/manage/visibility-control.client";
import { TrashAlbum } from "@/components/manage/trash-album.client";
import { VisibilityBadge } from "@/components/gram/visibility-badge";
import { SpexflixHint } from "@/components/gram/spexflix-hint";
import { UploadDropZone, UploadList } from "@/components/upload/uploads.client";
import { RecordHistory } from "@/components/audit/change-log";
import { auditLink } from "@/app/(app)/manage/audit/links";
import { getManageAlbum } from "@/lib/gram/manage.server";
import { getItem } from "@/lib/gram/gram.server";
import { Pager } from "@/components/gram/pager";
import { Policies } from "@/utils/policy.server";
import { withPolicyPage } from "@/utils/route.server";
import { ID } from "@/utils/ids";
import { toPage } from "@/utils/filters";

/** Items a page of the editor shows; an album can hold thousands. */
const ITEMS_PAGE = 200;

/**
 * An album's edit page: upload by dragging files onto it, its items with bulk changes (a page of them at a time,
 * `?page=`), its visibility, its fields, the trash and its latest changes. `?item=` opens an item of the album, also one
 * on another page.
 */
export default async function ManageAlbumPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ item?: string; page?: string }>
}) {
  return withPolicyPage(Policies.editor.requireEditor, async () => {
    const { id } = await params;
    const { item: openItemId, page: pageParam } = await searchParams;
    const page = toPage(pageParam);
    const data = ID.test(id) ? await getManageAlbum(id, page, ITEMS_PAGE) : null;
    const album = data?.album;

    if (!album || !data) {
      notFound();
    }

    const pages = Math.max(1, Math.ceil(album.items.totalCount / ITEMS_PAGE));

    // Items moved or trashed can leave a page past the last one
    if (page >= pages) {
      redirect(`/manage/albums/${album.id}${pages > 1 ? `?page=${pages - 1}` : ""}`);
    }

    const t = await getTranslations("ManageAlbum");
    const spexflixUrl = process.env.SPEXFLIX_WEB_URL?.trim().replace(/\/+$/, "") || null;
    const items = album.items.items;
    const wanted = openItemId && ID.test(openItemId) ? openItemId : null;
    const onPage = wanted ? items.find(item => item.id === wanted) : undefined;
    const fetched = wanted && !onPage ? (await getItem(wanted))?.item : null;
    const openItem = onPage ?? (fetched?.album?.id === album.id ? fetched : null);
    const pageHref = (next: number) => `/manage/albums/${album.id}${next > 0 ? `?page=${next}` : ""}`;

    return (
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <nav className="text-sm text-muted-foreground"><Link href="/manage/albums" className="hover:text-primary">{t("albums")}</Link></nav>
            <h1 className="text-2xl font-bold tracking-tight">{album.title}</h1>
            <div className="flex flex-wrap gap-2">
              <VisibilityBadge visibility={album.visibility} />
              {album.suggested && <span className="text-sm text-muted-foreground">{t("suggested")}</span>}
              {album.trashedAt && <span className="text-sm text-destructive">{t("inTrash")}</span>}
            </div>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href={`/albums/${album.id}`} />}>
            <ExternalLink /> {t("view")}
          </Button>
        </div>

        {!album.trashedAt && (
          <section aria-labelledby="upload" className="space-y-3">
            <h2 id="upload" className="text-lg font-semibold">{t("upload")}</h2>
            <UploadDropZone target={{ albumId: album.id, albumTitle: album.title, mode: "items", maxBytes: data.limits.maxUploadBytes }}
                            hint={<SpexflixHint maxMinutes={data.limits.maxVideoMinutes} />} />
            <UploadList albumId={album.id} />
          </section>
        )}

        <section aria-labelledby="items" className="space-y-3">
          <h2 id="items" className="text-lg font-semibold">{t("items", { count: album.items.totalCount })}</h2>
          <ItemsManager albumId={album.id} albumTitle={album.title} items={items} coverId={album.cover?.id}
                        spexflixUrl={spexflixUrl} openItem={openItem} />
          <Pager page={page} pages={pages} hrefOf={pageHref} />
        </section>

        <VisibilityControl albumId={album.id} visibility={album.visibility} counts={album.visibilityCounts} />

        <section aria-labelledby="details" className="space-y-3">
          <h2 id="details" className="text-lg font-semibold">{t("details")}</h2>
          <AlbumForm kinds={data.albumKinds} album={{
            id: album.id,
            title: album.title,
            kindId: album.kind.id,
            spex: album.spex,
            dateFrom: album.dateFrom,
            dateTo: album.dateTo,
            place: album.place,
            description: album.description,
          }} />
        </section>

        <section aria-labelledby="trash" className="space-y-3">
          <h2 id="trash" className="text-lg font-semibold">{t("trashHeading")}</h2>
          <p className="text-sm text-muted-foreground">{album.trashedAt ? t("restoreText") : t("trashText")}</p>
          <TrashAlbum albumId={album.id} trashed={Boolean(album.trashedAt)} />
        </section>

        <RecordHistory entityId={album.id} path="/manage/audit" linkOf={auditLink} />
      </div>
    );
  });
}
