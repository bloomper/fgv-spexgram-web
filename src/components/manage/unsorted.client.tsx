"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { FolderInput, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemImage } from "@/components/gram/item-image.client";
import { useDialogs } from "@/components/dialogs.client";
import { albumFromItemsAction, albumTitlesAction, updateItemsAction } from "@/app/(app)/manage/actions.server";
import { altText, type GalleryItem } from "@/utils/gram";
import { formatDay, formatPeriod, formatTaken } from "@/utils/format";
import { track } from "@/utils/umami";

type Day = { date?: string | null; items: GalleryItem[] };

/**
 * Items in Immich that belong to no album, grouped by the day they were taken (a run of photos from one evening is
 * probably one album). Editors select them and move them to an existing album or a new one.
 */
export function UnsortedSorter({ days }: { days: Day[] }) {
  const t = useTranslations("Unsorted");
  const locale = useLocale();
  const router = useRouter();
  const dialogs = useDialogs();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const ids = [...selected];

  const setMany = (list: string[], on: boolean) => setSelected(current => {
    const next = new Set(current);

    list.forEach(id => on ? next.add(id) : next.delete(id));
    return next;
  });

  const done = (result: { ok: boolean; message?: string }, then?: string) => {
    if (result.ok) {
      track("unsorted-sort", { count: ids.length, created: Boolean(then) });
      toast.success(t("moved", { count: ids.length }));
      setSelected(new Set());
      if (then) {
        router.push(then);
      }
      router.refresh();
    } else {
      toast.error(result.message ?? t("failed"));
    }
  };

  const moveToExisting = async () => {
    const albums = await albumTitlesAction();

    if (!albums.ok) {
      toast.error(albums.message);
      return;
    }

    const target = await dialogs.choose({
      title: t("moveTitle", { count: ids.length }),
      items: albums.data.map(album => ({ id: album.id, label: [album.title, formatPeriod(album.dateFrom, null, locale)].filter(Boolean).join(" · ") })),
      createLabel: t("newAlbum"),
    });

    if (target === "") {
      await moveToNew();
    } else if (target) {
      start(async () => done(await updateItemsAction(ids, { albumId: target })));
    }
  };

  const moveToNew = async () => {
    const firstDay = days.find(day => day.items.some(item => selected.has(item.id)))?.date ?? null;
    const title = await dialogs.prompt({ title: t("newTitle", { count: ids.length }), label: t("albumTitle"), maxLength: 200 });

    if (title) {
      start(async () => {
        const result = await albumFromItemsAction(title, firstDay, ids);

        done(result, result.ok && result.data ? `/manage/albums/${result.data}` : undefined);
      });
    }
  };

  if (days.length === 0) {
    return <p className="text-muted-foreground">{t("none")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-(--header-height) z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 backdrop-blur"
           role="toolbar" aria-label={t("toolbar")}>
        <span className="px-1 text-sm">{t("selected", { count: selected.size })}</span>
        <Button size="sm" variant="outline" disabled={!selected.size || pending} onClick={moveToExisting}><FolderInput /> {t("move")}</Button>
        <Button size="sm" variant="outline" disabled={!selected.size || pending} onClick={moveToNew}><FolderPlus /> {t("newAlbum")}</Button>
      </div>
      {days.map(day => {
        const dayIds = day.items.map(item => item.id);
        const all = dayIds.every(id => selected.has(id));
        const label = day.date ? formatDay(day.date, locale) ?? day.date : t("noDate");

        return (
          <section key={day.date ?? "none"} aria-label={label} className="space-y-2">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" className="accent-primary" checked={all} onChange={event => setMany(dayIds, event.target.checked)} />
              {label} <span className="text-sm font-normal text-muted-foreground">({day.items.length})</span>
            </label>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {day.items.map(item => (
                <li key={item.id} className={`relative overflow-hidden rounded-md border ${selected.has(item.id) ? "ring-2 ring-primary" : ""}`}>
                  <label className="block cursor-pointer">
                    <span className="block aspect-square">
                      <ItemImage src={item.media?.thumbnailUrl} alt="" status={item.status} type={item.type} fill />
                    </span>
                    <input type="checkbox" className="absolute top-1 left-1 size-4 accent-primary" checked={selected.has(item.id)}
                           onChange={event => setMany([item.id], event.target.checked)}
                           aria-label={t("select", { name: [altText(item, locale), formatTaken(item.takenAt)].filter(Boolean).join(" ") })} />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
