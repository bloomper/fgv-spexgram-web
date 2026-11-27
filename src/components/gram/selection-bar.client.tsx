"use client";

import * as React from "react";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CalendarDays,
  Download,
  Eye,
  FolderInput,
  FolderPlus,
  HardDriveDownload,
  Heart,
  HeartOff,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@bloomper/fgv-web-ui/ui/button";
import { useDialogs } from "@bloomper/fgv-web-ui/shell/dialogs";
import { downloadFile } from "@/components/gram/download.client";
import { favouriteAction } from "@/app/(app)/actions.server";
import {
  albumFromItemsAction,
  albumTitlesAction,
  trashItemsAction,
  updateItemsAction,
} from "@/app/(app)/manage/actions.server";
import { downloadName, type GalleryItem, VISIBILITIES } from "@/utils/gram";
import { formatPeriod } from "@/utils/format";
import { track } from "@/utils/umami";
import type { Visibility } from "@/gql/graphql";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type SelectionChange =
  | { kind: "favourite"; ids: string[]; favourite: boolean }
  | { kind: "trash"; ids: string[] }
  | { kind: "changed"; ids: string[] };

/**
 * What can be done with the selected items: members download them (previews, or originals where allowed) and mark
 * them as favourites; editors also move them to an album, make a new album of them, set their visibility, set the day
 * they were taken, or move them to the trash.
 */
export function SelectionBar({
  items,
  member,
  editor,
  canDownloadOriginals,
  favouritesView,
  onClear,
  onChange,
}: {
  items: GalleryItem[];
  member: boolean;
  editor: boolean;
  canDownloadOriginals: boolean;
  /** In the favourites view, the selection is taken out of the favourites rather than put in. */
  favouritesView?: boolean;
  onClear: () => void;
  onChange: (change: SelectionChange) => void;
}) {
  const t = useTranslations("Selection");
  const locale = useLocale();
  const dialogs = useDialogs();
  const [pending, start] = useTransition();
  const ids = items.map((item) => item.id);
  const photos = items.filter((item) => item.type === "PHOTO" && item.media);
  const originals = items.filter((item) => item.media?.originalUrl);

  const done = (result: { ok: boolean; message?: string }, success: string, change: SelectionChange) => {
    if (result.ok) {
      toast.success(success);
      onChange(change);
      onClear();
    } else {
      toast.error(result.message ?? t("failed"));
    }
  };

  const download = async (original: boolean) => {
    const list = original ? originals : photos;

    track("item-download", { original, count: list.length });
    for (const item of list) {
      if (original) {
        await downloadFile(item.media!.originalUrl!, item.originalFileName ?? downloadName(item, "original"));
      } else {
        await downloadFile(item.media!.previewUrl, downloadName(item, "preview"));
      }
    }
  };

  const favourite = (on: boolean) =>
    start(async () => {
      done(
        await favouriteAction(ids, on),
        on ? t("favourited", { count: ids.length }) : t("unfavourited", { count: ids.length }),
        { kind: "favourite", ids, favourite: on }
      );
    });

  const move = async () => {
    const albums = await albumTitlesAction();

    if (!albums.ok) {
      toast.error(albums.message);
      return;
    }

    const target = await dialogs.choose({
      title: t("moveTitle", { count: ids.length }),
      items: albums.data.map((album) => ({
        id: album.id,
        label: [album.title, formatPeriod(album.dateFrom, null, locale)].filter(Boolean).join(" · "),
      })),
      createLabel: t("newAlbum"),
    });

    if (target === "") {
      await newAlbum();
    } else if (target) {
      start(async () => {
        track("items-move", { count: ids.length });
        done(await updateItemsAction(ids, { albumId: target }, albumIdsOf(items)), t("moved", { count: ids.length }), {
          kind: "changed",
          ids,
        });
      });
    }
  };

  const newAlbum = async () => {
    const title = await dialogs.prompt({
      title: t("newTitle", { count: ids.length }),
      label: t("albumTitle"),
      maxLength: 200,
    });
    const firstDay =
      items
        .map((item) => item.takenAt?.slice(0, 10))
        .filter(Boolean)
        .sort()[0] ?? null;

    if (title) {
      start(async () =>
        done(await albumFromItemsAction(title, firstDay, ids), t("moved", { count: ids.length }), {
          kind: "changed",
          ids,
        })
      );
    }
  };

  const visibility = async () => {
    const chosen = (await dialogs.choose({
      title: t("visibilityTitle", { count: ids.length }),
      items: VISIBILITIES.map((value) => ({ id: value, label: t(`visibilities.${value}`) })),
    })) as Visibility | null;

    if (!chosen) {
      return;
    }
    if (
      chosen === "PUBLIC" &&
      !(await dialogs.confirm({ title: t("publicTitle"), description: t("publicText", { count: ids.length }) }))
    ) {
      return;
    }
    start(async () => {
      const result = await updateItemsAction(ids, { visibility: chosen }, albumIdsOf(items));

      track("items-visibility", { visibility: chosen, count: ids.length });
      if (result.ok && result.data > 0) {
        toast.info(t("skipped", { count: result.data }));
      }
      done(result, t("visibilitySet", { count: ids.length }), { kind: "changed", ids });
    });
  };

  const date = async () => {
    const day = await dialogs.prompt({
      title: t("dateTitle", { count: ids.length }),
      label: t("dateLabel"),
      maxLength: 10,
      defaultValue: items[0]?.takenAt?.slice(0, 10) ?? "",
    });

    if (day === null) {
      return;
    }
    if (!DAY.test(day.trim())) {
      toast.error(t("dateInvalid"));
      return;
    }
    start(async () =>
      done(
        await updateItemsAction(ids, { takenDate: day.trim() }, albumIdsOf(items)),
        t("dated", { count: ids.length }),
        { kind: "changed", ids }
      )
    );
  };

  const trash = async () => {
    if (
      await dialogs.confirm({
        title: t("trashTitle", { count: ids.length }),
        confirmLabel: t("trash"),
        destructive: true,
      })
    ) {
      start(async () => {
        track("items-trash", { count: ids.length });
        done(await trashItemsAction(ids, true, albumIdsOf(items)), t("trashed", { count: ids.length }), {
          kind: "trash",
          ids,
        });
      });
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      role="toolbar"
      aria-label={t("toolbar")}
      className="bg-background/95 sticky top-(--header-height) z-20 flex flex-wrap items-center gap-1 rounded-lg border p-1.5 shadow-sm backdrop-blur"
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        aria-label={t("clear")}
      >
        <X />
      </Button>
      <span
        className="px-1 text-sm font-medium"
        aria-live="polite"
      >
        {t("selected", { count: items.length })}
      </span>
      <span className="flex-1" />
      {photos.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void download(false)}
          title={t("download")}
        >
          <Download /> <span className="max-sm:sr-only">{t("download")}</span>
        </Button>
      )}
      {canDownloadOriginals && originals.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void download(true)}
          title={t("downloadOriginals")}
        >
          <HardDriveDownload /> <span className="max-sm:sr-only">{t("downloadOriginals")}</span>
        </Button>
      )}
      {member &&
        (favouritesView ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => favourite(false)}
            title={t("unfavourite")}
          >
            <HeartOff /> <span className="max-sm:sr-only">{t("unfavourite")}</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => favourite(true)}
            title={t("favourite")}
          >
            <Heart /> <span className="max-sm:sr-only">{t("favourite")}</span>
          </Button>
        ))}
      {editor && (
        <>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={move}
            title={t("move")}
          >
            <FolderInput /> <span className="max-lg:sr-only">{t("move")}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={newAlbum}
            title={t("newAlbum")}
          >
            <FolderPlus /> <span className="max-lg:sr-only">{t("newAlbum")}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={visibility}
            title={t("visibility")}
          >
            <Eye /> <span className="max-lg:sr-only">{t("visibility")}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={date}
            title={t("date")}
          >
            <CalendarDays /> <span className="max-lg:sr-only">{t("date")}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={trash}
            title={t("trash")}
          >
            <Trash2 /> <span className="max-lg:sr-only">{t("trash")}</span>
          </Button>
        </>
      )}
    </div>
  );
}

function albumIdsOf(items: readonly GalleryItem[]): string[] {
  return [...new Set(items.map((item) => item.album?.id).filter((id): id is string => Boolean(id)))];
}
