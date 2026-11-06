"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ItemImage } from "@/components/gram/item-image.client";
import { formatInstant } from "@/utils/format";
import { altText, type GalleryItem } from "@/utils/gram";
import {
  deleteAlbumAction,
  deleteItemsAction,
  emptyTrashAction,
  trashAlbumAction,
  trashItemsAction,
} from "@/app/(app)/manage/actions.server";
import { useDialogs } from "@/components/dialogs.client";

type Album = { id: string; title: string; trashedAt?: string | null; itemCount: number };

/**
 * Trashed albums and items: editors restore them, admins delete them for good, which deletes the files in Immich.
 */
export function TrashList({ albums, items, admin }: { albums: Album[]; items: (GalleryItem & { trashedAt?: string | null })[]; admin: boolean }) {
  const t = useTranslations("Trash");
  const locale = useLocale();
  const { confirm } = useDialogs();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<{ ok: boolean; message?: string }>, done: string) => startTransition(async () => {
    const result = await work();

    if (result.ok) {
      toast.success(done);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  });

  if (albums.length === 0 && items.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <div className="space-y-6">
      {admin && (
        <Button variant="destructive" disabled={pending} onClick={async () => await confirm({
          title: t("confirmEmpty"),
          description: t("confirmEmptyText", { albums: albums.length, items: items.length }),
          confirmLabel: t("emptyTrash"),
          destructive: true,
        }) && run(emptyTrashAction, t("emptied"))}>
          {t("emptyTrash")}
        </Button>
      )}
      {albums.length > 0 && (
        <section aria-labelledby="trash-albums" className="space-y-2">
          <h2 id="trash-albums" className="text-lg font-semibold">{t("albums")}</h2>
          <ul className="divide-y rounded-lg border">
            {albums.map(album => (
              <li key={album.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/manage/albums/${album.id}`} className="font-medium hover:underline">{album.title}</Link>
                  <div className="text-xs text-muted-foreground">
                    {[t("itemCount", { count: album.itemCount }), album.trashedAt ? t("trashedAt", { date: formatInstant(album.trashedAt) ?? "" }) : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={pending}
                        onClick={() => run(() => trashAlbumAction(album.id, false), t("restored"))}>{t("restore")}</Button>
                {admin && (
                  <>
                    <Button variant="outline" size="sm" disabled={pending} onClick={async () => await confirm({
                      title: t("confirmDeleteKeep", { title: album.title }),
                      description: t("confirmDeleteKeepText"),
                      confirmLabel: t("deleteKeep"),
                      destructive: true,
                    }) && run(() => deleteAlbumAction(album.id, true), t("deleted"))}>{t("deleteKeep")}</Button>
                    <Button variant="destructive" size="sm" disabled={pending} onClick={async () => await confirm({
                      title: t("confirmDelete", { title: album.title }),
                      description: t("confirmDeleteAlbumText"),
                      confirmLabel: t("delete"),
                      destructive: true,
                    }) && run(() => deleteAlbumAction(album.id, false), t("deleted"))}>{t("delete")}</Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {items.length > 0 && (
        <section aria-labelledby="trash-items" className="space-y-2">
          <h2 id="trash-items" className="text-lg font-semibold">{t("items")}</h2>
          <ul className="divide-y rounded-lg border">
            {items.map(item => {
              const name = altText(item, locale);

              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <div className="size-12 shrink-0 overflow-hidden rounded">
                    <ItemImage src={item.media?.thumbnailUrl} alt="" status={item.status} type={item.type} fill />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[item.album?.title, item.trashedAt ? t("trashedAt", { date: formatInstant(item.trashedAt) ?? "" }) : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled={pending}
                          onClick={() => run(() => trashItemsAction([item.id], false), t("restored"))}>{t("restore")}</Button>
                  {admin && (
                    <Button variant="destructive" size="sm" disabled={pending} onClick={async () => await confirm({
                      title: t("confirmDelete", { title: name }),
                      description: t("confirmDeleteItemText"),
                      confirmLabel: t("delete"),
                      destructive: true,
                    }) && run(() => deleteItemsAction([item.id]), t("deleted"))}>{t("delete")}</Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
