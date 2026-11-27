"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Play } from "lucide-react";
import type { AlbumCardFieldsFragment } from "@/gql/graphql";
import { ItemImage } from "@/components/gram/item-image.client";
import { ItemViewer, type ViewerOptions } from "@/components/gram/viewer.client";
import { albumItemsAction } from "@/app/(app)/actions.server";
import { type GalleryItem, isShowable } from "@/utils/gram";
import { yearsAgo } from "@/utils/timeline";

type Memory = {
  key: string;
  title: string;
  subtitle: string;
  cover: { thumbnailUrl?: string | null; previewUrl?: string | null; type?: GalleryItem["type"] } | null;
  thumbhash?: string | null;
  /** The items, when known; else the album to load them from. */
  items?: GalleryItem[];
  albumId?: string;
  albumTitle?: string;
};

/**
 * The strip at the top of the timeline: *this day* in earlier years, one card a year, and the albums of the spex
 * whose premiere is near today's date. A card opens a slideshow.
 */
export function Memories({
  thisDay,
  premiereAlbums,
  options,
  now,
}: {
  thisDay: GalleryItem[];
  premiereAlbums: AlbumCardFieldsFragment[];
  options: ViewerOptions;
  /** Today, from the server, so that the years ago are the same in both renders. */
  now: string;
}) {
  const t = useTranslations("Memories");
  const [playing, setPlaying] = useState<{ items: GalleryItem[]; index: number; albumTitle?: string } | null>(null);
  const [pending, start] = useTransition();

  const memories = useMemo((): Memory[] => {
    const today = new Date(now);
    const byYear = new Map<string, GalleryItem[]>();

    for (const item of thisDay.filter(isShowable)) {
      const year = item.takenAt?.slice(0, 4);

      if (year) {
        byYear.set(year, [...(byYear.get(year) ?? []), item]);
      }
    }

    const days: Memory[] = [...byYear.entries()].map(([year, items]) => ({
      key: `day-${year}`,
      title: t("yearsAgo", { count: yearsAgo(year, today) }),
      subtitle: t("photos", { count: items.length }),
      cover: items[0].media ? { ...items[0].media, type: items[0].type } : null,
      thumbhash: items[0].thumbhash,
      items,
    }));
    const premieres: Memory[] = premiereAlbums.map((album) => {
      const premiere = album.spex.find((spex) => spex.premiere)?.premiere;

      return {
        key: `album-${album.id}`,
        title: album.title,
        subtitle: premiere
          ? t("premiere", { count: yearsAgo(premiere, today) })
          : t("photos", { count: album.itemCount }),
        cover: album.cover?.media ? { ...album.cover.media, type: album.cover.type } : null,
        albumId: album.id,
        albumTitle: album.title,
      };
    });

    return [...days, ...premieres];
  }, [thisDay, premiereAlbums, now, t]);

  const play = (memory: Memory) => {
    if (memory.items) {
      setPlaying({ items: memory.items, index: 0 });
      return;
    }
    start(async () => {
      const result = await albumItemsAction(memory.albumId!, 0);
      const items = result.ok ? result.data.items.filter(isShowable) : [];

      if (items.length > 0) {
        setPlaying({ items, index: 0, albumTitle: memory.albumTitle });
      } else {
        toast.error(result.ok ? t("empty") : result.message);
      }
    });
  };

  if (memories.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="memories"
      className="space-y-2"
    >
      <h2
        id="memories"
        className="text-lg font-semibold"
      >
        {t("title")}
      </h2>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {memories.map((memory) => (
          <li
            key={memory.key}
            className="shrink-0 snap-start"
          >
            <button
              type="button"
              onClick={() => play(memory)}
              disabled={pending}
              className="group bg-muted focus-visible:ring-ring relative block h-44 w-32 overflow-hidden rounded-xl text-left focus-visible:ring-2 sm:h-52 sm:w-40"
            >
              <ItemImage
                src={memory.cover?.thumbnailUrl}
                srcSet={
                  memory.cover?.thumbnailUrl && memory.cover.previewUrl
                    ? `${memory.cover.thumbnailUrl} 250w, ${memory.cover.previewUrl} 1440w`
                    : undefined
                }
                sizes="160px"
                alt=""
                type={memory.cover?.type ?? "PHOTO"}
                thumbhash={memory.thumbhash}
                fill
                className="transition-transform group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 space-y-0.5 p-2 text-white">
                <span className="line-clamp-2 block text-sm leading-tight font-semibold">{memory.title}</span>
                <span className="flex items-center gap-1 text-xs text-white/80">
                  <Play
                    className="size-3 fill-current"
                    aria-hidden
                  />{" "}
                  {memory.subtitle}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {playing && (
        <ItemViewer
          items={playing.items}
          index={playing.index}
          slideshow
          onIndexChange={(index) => setPlaying((current) => current && { ...current, index })}
          onClose={() => setPlaying(null)}
          options={{ ...options, albumTitle: playing.albumTitle }}
        />
      )}
    </section>
  );
}
