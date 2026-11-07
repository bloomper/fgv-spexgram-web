"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, FolderInput, ImageIcon, PenLine, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useDialogs } from "@/components/dialogs.client";
import { ItemImage } from "@/components/gram/item-image.client";
import { VisibilityBadge } from "@/components/gram/visibility-badge";
import {
  albumTitlesAction,
  setCoverAction,
  trashItemsAction,
  updateItemAction,
  updateItemsAction,
} from "@/app/(app)/manage/actions.server";
import type { Visibility } from "@/gql/graphql";
import { useServerState } from "@/hooks/use-server-state.client";
import { altText, type GalleryItem, VISIBILITIES } from "@/utils/gram";
import { formatPeriod } from "@/utils/format";
import { track } from "@/utils/umami";

type ManagedItem = GalleryItem & { fileSize?: number | null; trashedAt?: string | null };

/**
 * An album's items for editors: a grid with check boxes, and for the selection captions, credits, visibility, a move
 * to another album or the trash. Clicking an item opens its fields. Items Immich is processing or failed with are shown
 * with their status; a video that was too long points to Spexflix.
 */
export function ItemsManager({ albumId, albumTitle, items, coverId, spexflixUrl, openItem }: {
  albumId: string | null;
  albumTitle?: string;
  items: ManagedItem[];
  coverId?: string | null;
  spexflixUrl?: string | null;
  /** An item to open at once, e.g. from its page's *Edit*; it may be on another page of the album. */
  openItem?: ManagedItem | null
}) {
  const t = useTranslations("Items");
  const v = useTranslations("Visibility");
  const locale = useLocale();
  const router = useRouter();
  const dialogs = useDialogs();
  const [selected, setSelected] = useServerState<Set<string>>(new Set(), () => items.map(item => item.id).join());
  const [editing, setEditing] = useState<ManagedItem | null>(openItem ?? null);
  const [pending, start] = useTransition();
  const ids = [...selected];

  const toggle = (id: string) => setSelected(current => {
    const next = new Set(current);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });

  const run = (work: () => Promise<{ ok: boolean; message?: string; data?: unknown }>, done: string, event?: string) => start(async () => {
    const result = await work();

    if (result.ok) {
      if (event) {
        track(event, { count: ids.length });
      }
      toast.success(done);
      if (typeof result.data === "number" && result.data > 0) {
        toast.warning(t("skipped", { count: result.data }));
      }
      setSelected(new Set());
      router.refresh();
    } else {
      toast.error((result as { message?: string }).message ?? t("failed"));
    }
  });

  const caption = async () => {
    const value = await dialogs.prompt({ title: t("captionTitle", { count: ids.length }), label: t("caption"), maxLength: 2000 });

    if (value !== null) {
      run(() => updateItemsAction(ids, { caption: value }, albumId ? [albumId] : []), t("saved"), "items-caption");
    }
  };

  const credit = async () => {
    const value = await dialogs.prompt({ title: t("creditTitle", { count: ids.length }), label: t("photographer"), maxLength: 200 });

    if (value !== null) {
      run(() => updateItemsAction(ids, { photographer: value }, albumId ? [albumId] : []), t("saved"), "items-credit");
    }
  };

  const visibility = async () => {
    const chosen = await dialogs.choose({
      title: t("visibilityTitle", { count: ids.length }),
      items: VISIBILITIES.map(value => ({ id: value, label: v(value) })),
    }) as Visibility | null;

    if (!chosen) {
      return;
    }
    if (chosen === "PUBLIC") {
      const newly = items.filter(item => selected.has(item.id) && item.visibility !== "PUBLIC").length;
      const confirmed = await dialogs.confirm({
        title: t("publicTitle"),
        description: t("publicText", { count: newly }),
        confirmLabel: t("makePublic"),
        destructive: true,
      });

      if (!confirmed) {
        return;
      }
    }
    run(() => updateItemsAction(ids, { visibility: chosen }, albumId ? [albumId] : []), t("saved"), "items-visibility");
  };

  const move = async () => {
    const albums = await albumTitlesAction();

    if (!albums.ok) {
      toast.error(albums.message);
      return;
    }

    const target = await dialogs.choose({
      title: t("moveTitle", { count: ids.length }),
      items: albums.data.filter(album => album.id !== albumId)
        .map(album => ({ id: album.id, label: [album.title, formatPeriod(album.dateFrom, null, locale)].filter(Boolean).join(" · ") })),
    });

    if (target) {
      run(() => updateItemsAction(ids, { albumId: target }, albumId ? [albumId] : []), t("moved"), "items-move");
    }
  };

  const trash = async () => {
    const confirmed = await dialogs.confirm({
      title: t("trashTitle", { count: ids.length }),
      description: t("trashText"),
      confirmLabel: t("trash"),
      destructive: true,
    });

    if (confirmed) {
      run(() => trashItemsAction(ids, true, albumId ? [albumId] : []), t("trashed"), "items-trash");
    }
  };

  if (items.length === 0) {
    return <p className="text-muted-foreground">{t("none")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-(--header-height) z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 backdrop-blur"
           role="toolbar" aria-label={t("toolbar")}>
        <label className="flex items-center gap-2 px-1 text-sm">
          <Checkbox className="relative after:absolute after:-inset-2" checked={selected.size === items.length && items.length > 0}
                    onCheckedChange={checked => setSelected(checked ? new Set(items.map(item => item.id)) : new Set())} />
          {selected.size ? t("selected", { count: selected.size }) : t("selectAll")}
        </label>
        <Button size="sm" variant="outline" disabled={!selected.size || pending} onClick={caption}><PenLine /> {t("caption")}</Button>
        <Button size="sm" variant="outline" disabled={!selected.size || pending} onClick={credit}><User /> {t("photographer")}</Button>
        <Button size="sm" variant="outline" disabled={!selected.size || pending} onClick={visibility}><Eye /> {t("visibility")}</Button>
        <Button size="sm" variant="outline" disabled={!selected.size || pending} onClick={move}><FolderInput /> {t("move")}</Button>
        <Button size="sm" variant="outline" disabled={!selected.size || pending} onClick={trash}><Trash2 /> {t("trash")}</Button>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label={t("list")}>
        {items.map(item => {
          const name = altText(item, locale, albumTitle);

          return (
            <li key={item.id} className={`relative overflow-hidden rounded-md border ${selected.has(item.id) ? "ring-2 ring-primary" : ""}`}
                data-testid="managed-item">
              <button type="button" className="block aspect-square w-full" onClick={() => setEditing(item)}
                      aria-label={t("editOf", { name })}>
                <ItemImage src={item.media?.thumbnailUrl} alt="" status={item.status} type={item.type} fill />
              </button>
              <span className="absolute top-1 left-1 flex rounded bg-background/85 p-1.5">
                <Checkbox className="size-5 relative after:absolute after:-inset-2" checked={selected.has(item.id)}
                          onCheckedChange={() => toggle(item.id)} aria-label={t("select", { name })} />
              </span>
              <div className="space-y-1 p-1.5 text-xs">
                <p className="truncate" title={name}>{item.caption || item.originalFileName || name}</p>
                <div className="flex flex-wrap gap-1">
                  {item.visibility !== "MEMBERS" && <VisibilityBadge visibility={item.visibility} />}
                  {item.id === coverId && <Badge variant="outline"><ImageIcon /> {t("cover")}</Badge>}
                  {item.contributionStatus === "WAITING" && <Badge variant="secondary">{t("waiting")}</Badge>}
                </div>
                {item.status === "FAILED" && (
                  <p className="text-destructive">
                    {t(`failure.${item.failure ?? "NOT_PROCESSED"}`)}
                    {item.failure === "TOO_LONG" && spexflixUrl && (
                      <> <a href={spexflixUrl} className="underline" target="_blank" rel="noopener noreferrer">Spexflix</a></>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {editing && (
        <ItemEditor item={editing} albumId={albumId} isCover={editing.id === coverId} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/**
 * One item's caption, photographer, date taken and position, and making it the album's cover.
 */
function ItemEditor({ item, albumId, isCover, onClose }: {
  item: ManagedItem;
  albumId: string | null;
  isCover: boolean;
  onClose: () => void
}) {
  const t = useTranslations("Items");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [removePosition, setRemovePosition] = useState(false);

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form className="grid gap-4" onSubmit={event => {
          event.preventDefault();

          const data = new FormData(event.currentTarget);
          const latitude = Number(data.get("latitude"));
          const longitude = Number(data.get("longitude"));
          const hasPosition = !removePosition && String(data.get("latitude") ?? "") !== "" && String(data.get("longitude") ?? "") !== ""
            && Number.isFinite(latitude) && Number.isFinite(longitude);

          start(async () => {
            const result = await updateItemAction(item.id, albumId, {
              caption: String(data.get("caption") ?? ""),
              photographer: String(data.get("photographer") ?? ""),
              takenAt: String(data.get("takenAt") ?? "") || null,
              latitude: hasPosition ? latitude : null,
              longitude: hasPosition ? longitude : null,
            });

            if (result.ok) {
              toast.success(t("saved"));
              onClose();
              router.refresh();
            } else {
              toast.error(result.message);
            }
          });
        }}>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <div className="aspect-square overflow-hidden rounded-md">
              <ItemImage src={item.media?.thumbnailUrl} alt={altText(item, locale)} status={item.status} type={item.type} fill />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="item-caption">{t("caption")}</Label>
                <Textarea id="item-caption" name="caption" maxLength={2000} defaultValue={item.caption ?? ""} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-photographer">{t("photographer")}</Label>
                <Input id="item-photographer" name="photographer" maxLength={200} defaultValue={item.photographer ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-taken">{t("taken")}</Label>
                <Input id="item-taken" name="takenAt" type="datetime-local" step={1} defaultValue={item.takenAt?.slice(0, 19) ?? ""} />
              </div>
            </div>
          </div>
          <fieldset className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <legend className="mb-1 text-sm font-medium">{t("position")}</legend>
            <div className="space-y-1.5">
              <Label htmlFor="item-lat">{t("latitude")}</Label>
              <Input id="item-lat" name="latitude" type="number" step="any" min={-90} max={90}
                     defaultValue={item.latitude ?? ""} disabled={removePosition} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-lng">{t("longitude")}</Label>
              <Input id="item-lng" name="longitude" type="number" step="any" min={-180} max={180}
                     defaultValue={item.longitude ?? ""} disabled={removePosition} />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox className="relative after:absolute after:-inset-2" checked={removePosition} onCheckedChange={checked => setRemovePosition(checked)} />
              {t("removePosition")}
            </label>
          </fieldset>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs text-muted-foreground">
            {item.originalFileName && <><dt>{t("file")}</dt><dd className="truncate">{item.originalFileName}</dd></>}
            {item.uploadedBy && <><dt>{t("uploadedBy")}</dt><dd>{item.uploadedBy}</dd></>}
          </dl>
          <DialogFooter className="sm:justify-between">
            {albumId && !isCover ? (
              <Button type="button" variant="outline" disabled={pending} onClick={() => start(async () => {
                const result = await setCoverAction(albumId, item.id);

                if (result.ok) {
                  toast.success(t("coverSet"));
                  router.refresh();
                } else {
                  toast.error(result.message);
                }
              })}>
                <ImageIcon /> {t("makeCover")}
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
              <Button type="submit" disabled={pending}>{t("save")}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
