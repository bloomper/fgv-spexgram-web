"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RowsPhotoAlbum, type Photo } from "react-photo-album";
import "react-photo-album/rows.css";
import { Hourglass } from "lucide-react";
import { ItemImage } from "@/components/gram/item-image.client";
import { ItemViewer, type ViewerOptions } from "@/components/gram/viewer.client";
import { albumItemsAction, renewItemsAction } from "@/app/(app)/actions.server";
import { useServerState } from "@/hooks/use-server-state.client";
import { altText, type GalleryItem, isShowable, mergeRenewed, needsRenewal } from "@/utils/gram";
import { Button } from "@/components/ui/button";

type GalleryPhoto = Photo & { item: GalleryItem };

const RENEW_CHUNK = 200;

/**
 * Items in a justified grid, opening in the viewer. For an album it loads further pages as the viewer scrolls
 * (`albumId` and `totalCount`). Signed addresses are renewed when they are about to run out, when the page is looked
 * at again or the viewer opens, without rendering the page again.
 */
export function Gallery({ items: initialItems, albumId, totalCount, pageSize = 60, options, rowHeight = 220 }: {
  items: GalleryItem[];
  albumId?: string;
  totalCount?: number;
  pageSize?: number;
  options: ViewerOptions;
  rowHeight?: number
}) {
  const t = useTranslations("Gallery");
  const locale = useLocale();
  const [items, setItems] = useServerState(initialItems, list => list.map(item => item.id + (item.media?.expiresAt ?? "")).join());
  const [open, setOpen] = useState<number | null>(null);
  const [loading, startLoading] = useTransition();
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = albumId !== undefined && totalCount !== undefined && items.length < totalCount;

  const loadMore = useCallback(() => {
    if (!albumId || loading || !hasMore) {
      return;
    }
    startLoading(async () => {
      const result = await albumItemsAction(albumId, Math.floor(items.length / pageSize));

      if (result.ok) {
        setFailed(false);
        setItems(current => {
          const known = new Set(current.map(item => item.id));

          return [...current, ...result.data.items.filter(item => !known.has(item.id))];
        });
      } else {
        setFailed(true);
      }
    });
  }, [albumId, hasMore, items.length, loading, pageSize, setItems]);

  useEffect(() => {
    const element = sentinel.current;

    if (!element || !hasMore || failed) {
      return;
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        loadMore();
      }
    }, { rootMargin: "800px" });

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, loadMore, failed]);

  const renew = useCallback(async () => {
    if (!needsRenewal(items, Date.now())) {
      return;
    }

    const ids = items.filter(item => item.media).map(item => item.id);

    for (let start = 0; start < ids.length; start += RENEW_CHUNK) {
      const result = await renewItemsAction(ids.slice(start, start + RENEW_CHUNK));

      if (result.ok) {
        setItems(current => mergeRenewed(current, result.data));
      }
    }
  }, [items, setItems]);

  // A page kept alive by Next, or left open in a tab, gets new addresses when it is looked at again
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && open === null) {
        void renew();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [open, renew]);

  const photos: GalleryPhoto[] = items.map(item => ({
    key: item.id,
    src: item.media?.thumbnailUrl ?? "",
    width: item.width && item.width > 0 ? item.width : 4,
    height: item.height && item.height > 0 ? item.height : 3,
    alt: altText(item, locale, options.albumTitle),
    item,
  }));

  const openAt = (index: number) => {
    if (!isShowable(items[index])) {
      return;
    }
    void renew();
    setOpen(index);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div data-testid="gallery">
      <RowsPhotoAlbum
        photos={photos}
        targetRowHeight={containerWidth => containerWidth < 480 ? 120 : containerWidth < 900 ? 170 : rowHeight}
        spacing={4}
        defaultContainerWidth={1200}
        sizes={{ size: "calc(100vw - 32px)", sizes: [{ viewport: "(min-width: 768px)", size: "calc(100vw - 300px)" }] }}
        onClick={({ index }) => openAt(index)}
        render={{
          button: ({ children, ...props }, { photo }) => (
            <button {...props} type="button" aria-label={photo.alt} data-testid="gallery-item"
                    disabled={!isShowable(photo.item)}
                    className={`${props.className ?? ""} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>
              {children}
            </button>
          ),
          image: (props, { photo }) => (
            <ItemImage src={photo.item.media?.thumbnailUrl}
                       srcSet={photo.item.media ? `${photo.item.media.thumbnailUrl} 250w, ${photo.item.media.previewUrl} 1440w` : undefined}
                       sizes={props.sizes} alt={photo.alt ?? ""} status={photo.item.status} type={photo.item.type} fill />
          ),
          extras: (_, { photo }) => photo.item.contributionStatus === "WAITING" ? (
            <span className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-xs text-white">
              <Hourglass className="size-3" aria-hidden /> {t("waiting")}
            </span>
          ) : null,
        }}
      />
      {hasMore && (
        <div ref={sentinel} className="flex justify-center py-6" aria-live="polite">
          {failed
            ? <Button variant="outline" onClick={() => {
              setFailed(false);
              loadMore();
            }}>{t("retry")}</Button>
            : <span className="text-sm text-muted-foreground">{loading ? t("loading") : t("more", { shown: items.length, total: totalCount ?? 0 })}</span>}
        </div>
      )}
      <ItemViewer items={items} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} options={options} />
    </div>
  );
}
