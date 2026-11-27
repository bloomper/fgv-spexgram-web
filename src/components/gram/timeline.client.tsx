"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { RowsPhotoAlbum, type Photo } from "react-photo-album";
import "react-photo-album/rows.css";
import { CircleCheck, Heart, Hourglass } from "lucide-react";
import { ItemImage } from "@/components/gram/item-image.client";
import { ItemViewer, type ViewerOptions } from "@/components/gram/viewer.client";
import { SelectionBar, type SelectionChange } from "@/components/gram/selection-bar.client";
import { renewItemsAction, timelineItemsAction } from "@/app/(app)/actions.server";
import { altText, type GalleryItem, isShowable, mergeRenewed, needsRenewal } from "@/utils/gram";
import { formatDay } from "@/utils/format";
import {
  estimateHeight,
  groupByDay,
  monthAt,
  monthKey,
  rangeOf,
  rowHeightFor,
  scrubberMarks,
  type TimelineMonth,
} from "@/utils/timeline";
import { Button } from "@bloomper/fgv-web-ui/ui/button";
import { cn } from "@/utils/utils";

type TimelinePhoto = Photo & { item: GalleryItem };

const RENEW_CHUNK = 200;
const LONG_PRESS_MS = 450;

/** "februari 1984", or the undated items' label. */
function useMonthLabel() {
  const locale = useLocale();
  const t = useTranslations("Timeline");

  return useCallback(
    (month: string | null) => {
      if (!month) {
        return t("undated");
      }

      const [year, number] = month.split("-").map(Number);

      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
        Date.UTC(year, number - 1, 1)
      );
    },
    [locale, t]
  );
}

/**
 * The timeline: every item the viewer may see across albums, newest first, as a photo library shows it. Each month
 * is a section with a sticky header, its days with sticky headers of their own and a justified grid. A month's items
 * are loaded when it comes near the screen; until then it takes the height its count needs, so the page has its full
 * length at once and the scrubber at the side jumps to any year and month. Thumbnails show Immich's thumbhash until
 * they load.
 *
 * Members select items with the check mark on hover or a long press; once something is selected a tap selects too,
 * shift-click selects a range and dragging over check marks selects many. The selection bar acts on them.
 */
export function Timeline({
  months,
  favourites = false,
  options,
  member,
  editor,
}: {
  months: TimelineMonth[];
  /** The member's favourites view. */
  favourites?: boolean;
  options: ViewerOptions;
  member: boolean;
  editor: boolean;
}) {
  const t = useTranslations("Timeline");
  const locale = useLocale();
  const router = useRouter();
  const monthLabel = useMonthLabel();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  const [loaded, setLoaded] = useState<Record<string, GalleryItem[]>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const loading = useRef(new Set<string>());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);
  const drag = useRef<boolean | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  // The server's months: a render with other counts (after an editor's change) loads the months again
  const monthsKey = months.map((month) => `${month.month}:${month.count}`).join();
  const [seen, setSeen] = useState(monthsKey);

  if (seen !== monthsKey) {
    setSeen(monthsKey);
    setLoaded({});
    setFailed({});
  }

  // Months asked for before are asked for again
  useEffect(() => {
    loading.current.clear();
  }, [monthsKey]);

  useEffect(() => {
    const element = container.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width || 1000));

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const load = useCallback(
    async (month: TimelineMonth) => {
      const key = monthKey(month.month);

      if (loading.current.has(key)) {
        return;
      }
      loading.current.add(key);

      const items: GalleryItem[] = [];

      for (let page = 0; ; page++) {
        const result = await timelineItemsAction(month.month, favourites, page);

        if (!result.ok) {
          loading.current.delete(key);
          setFailed((current) => ({ ...current, [key]: true }));
          return;
        }
        items.push(...result.data.items);
        if (result.data.items.length === 0 || items.length >= result.data.totalCount) {
          break;
        }
      }
      setFailed((current) => ({ ...current, [key]: false }));
      setLoaded((current) => ({ ...current, [key]: items }));
    },
    [favourites]
  );

  // The items in the order shown, for the viewer, ranges and renewal
  const shown = useMemo(() => months.flatMap((month) => loaded[monthKey(month.month)] ?? []), [months, loaded]);
  const order = useMemo(() => shown.map((item) => item.id), [shown]);
  const selectedItems = useMemo(() => shown.filter((item) => selected.has(item.id)), [shown, selected]);
  const selecting = selected.size > 0;

  const setMany = (ids: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);

      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const toggle = (id: string, shift: boolean) => {
    if (shift && anchor.current) {
      setMany(rangeOf(order, anchor.current, id), true);
    } else {
      setMany([id], !selected.has(id));
    }
    anchor.current = id;
  };

  useEffect(() => {
    const stop = () => {
      drag.current = null;
    };

    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const renew = useCallback(async () => {
    if (!needsRenewal(shown, Date.now())) {
      return;
    }

    const ids = shown.filter((item) => item.media).map((item) => item.id);

    for (let start = 0; start < ids.length; start += RENEW_CHUNK) {
      const result = await renewItemsAction(ids.slice(start, start + RENEW_CHUNK));

      if (result.ok) {
        setLoaded((current) =>
          Object.fromEntries(Object.entries(current).map(([key, items]) => [key, mergeRenewed(items, result.data)]))
        );
      }
    }
  }, [shown]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && open === null) {
        void renew();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [open, renew]);

  const update = (change: SelectionChange) => {
    const ids = new Set(change.ids);

    if (change.kind === "favourite") {
      setLoaded((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, items]) => [
            key,
            favourites && !change.favourite
              ? items.filter((item) => !ids.has(item.id))
              : items.map((item) => (ids.has(item.id) ? { ...item, favourite: change.favourite } : item)),
          ])
        )
      );
    } else if (change.kind === "trash") {
      setLoaded((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, items]) => [key, items.filter((item) => !ids.has(item.id))])
        )
      );
    }
    if (change.kind !== "favourite" || favourites) {
      router.refresh();
    }
  };

  const onFavourite = (id: string, favourite: boolean) => update({ kind: "favourite", ids: [id], favourite });

  const openItem = (item: GalleryItem) => {
    const index = shown.findIndex((entry) => entry.id === item.id);

    if (index >= 0 && isShowable(item)) {
      void renew();
      setOpen(index);
    }
  };

  const onTileClick = (event: React.MouseEvent, item: GalleryItem) => {
    if (press.current?.fired) {
      press.current = null;
      return;
    }
    if (member && (selecting || event.shiftKey)) {
      toggle(item.id, event.shiftKey);
    } else {
      openItem(item);
    }
  };

  const startPress = (event: React.PointerEvent, item: GalleryItem) => {
    if (!member || event.pointerType === "mouse") {
      return;
    }

    const timer = setTimeout(() => {
      press.current = { timer, fired: true };
      setMany([item.id], true);
      anchor.current = item.id;
    }, LONG_PRESS_MS);

    press.current = { timer, fired: false };
  };

  const endPress = () => {
    if (press.current && !press.current.fired) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  };

  const rowHeight = rowHeightFor(width);

  const jump = (month: string | null) => {
    document.getElementById(`m-${monthKey(month)}`)?.scrollIntoView({ block: "start" });
  };

  if (months.length === 0) {
    return null;
  }

  return (
    <div className="relative flex gap-2">
      <div
        ref={container}
        className="min-w-0 flex-1 space-y-2"
        data-testid="timeline"
      >
        {member && (
          <SelectionBar
            items={selectedItems}
            member={member}
            editor={editor}
            canDownloadOriginals={options.canDownloadOriginals}
            favouritesView={favourites}
            onClear={() => setSelected(new Set())}
            onChange={update}
          />
        )}
        {months.map((month) => {
          const key = monthKey(month.month);
          const items = loaded[key];

          return (
            <MonthSection
              key={key}
              id={`m-${key}`}
              label={monthLabel(month.month)}
              count={month.count}
              estimate={estimateHeight(month.count, width, rowHeight)}
              loaded={items !== undefined}
              failed={failed[key] ?? false}
              onNear={() => void load(month)}
              retryLabel={t("retry")}
            >
              {items &&
                groupByDay(items).map((day) => {
                  const ids = day.items.map((item) => item.id);
                  const all = ids.every((id) => selected.has(id));
                  const dayLabel = day.day ? (formatDay(day.day, locale) ?? day.day) : t("undated");

                  return (
                    <section
                      key={day.day ?? "undated"}
                      aria-label={dayLabel}
                      className="space-y-1"
                    >
                      <h3 className="group/day bg-background/95 sticky top-[calc(var(--header-height)+2.5rem)] z-[5] flex items-center gap-2 py-1 text-sm font-medium backdrop-blur">
                        {member && (
                          <button
                            type="button"
                            onClick={() => setMany(ids, !all)}
                            aria-pressed={all}
                            aria-label={all ? t("unselectDay", { day: dayLabel }) : t("selectDay", { day: dayLabel })}
                            className={cn(
                              "text-muted-foreground hover:text-foreground rounded-full transition-opacity focus-visible:opacity-100",
                              all || selecting ? "opacity-100" : "opacity-0 group-hover/day:opacity-100"
                            )}
                          >
                            <CircleCheck
                              className={cn("size-5", all && "fill-primary text-primary-foreground")}
                              aria-hidden
                            />
                          </button>
                        )}
                        {dayLabel}
                      </h3>
                      <RowsPhotoAlbum
                        photos={day.items.map((item): TimelinePhoto => ({
                          key: item.id,
                          src: item.media?.thumbnailUrl ?? "",
                          width: item.width && item.width > 0 ? item.width : 4,
                          height: item.height && item.height > 0 ? item.height : 3,
                          alt: altText(item, locale),
                          item,
                        }))}
                        targetRowHeight={rowHeight}
                        spacing={4}
                        defaultContainerWidth={1000}
                        sizes={{
                          size: "calc(100vw - 48px)",
                          sizes: [{ viewport: "(min-width: 768px)", size: "calc(100vw - 320px)" }],
                        }}
                        render={{
                          wrapper: ({ children, ...props }, { photo }) => {
                            const on = selected.has(photo.item.id);

                            return (
                              <div
                                {...props}
                                className={cn(props.className, "group/tile relative")}
                                onPointerEnter={() => {
                                  if (drag.current !== null) {
                                    setMany([photo.item.id], drag.current);
                                  }
                                }}
                              >
                                <button
                                  type="button"
                                  aria-label={photo.alt}
                                  data-testid="timeline-item"
                                  disabled={!isShowable(photo.item) && !member}
                                  onClick={(event) => onTileClick(event, photo.item)}
                                  onPointerDown={(event) => startPress(event, photo.item)}
                                  onPointerUp={endPress}
                                  onPointerLeave={endPress}
                                  onContextMenu={(event) => press.current?.fired && event.preventDefault()}
                                  className={cn(
                                    "focus-visible:outline-ring block h-full w-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-2",
                                    on && "scale-[0.92]"
                                  )}
                                >
                                  {children}
                                </button>
                                {member && (
                                  <button
                                    type="button"
                                    aria-pressed={on}
                                    aria-label={
                                      on
                                        ? t("unselect", { name: photo.alt ?? "" })
                                        : t("select", { name: photo.alt ?? "" })
                                    }
                                    onPointerDown={(event) => {
                                      if (event.pointerType === "mouse") {
                                        drag.current = !on;
                                      }
                                    }}
                                    onClick={(event) => toggle(photo.item.id, event.shiftKey)}
                                    className={cn(
                                      "absolute top-1 left-1 rounded-full text-white drop-shadow transition-opacity focus-visible:opacity-100",
                                      on || selecting ? "opacity-100" : "opacity-0 group-hover/tile:opacity-100"
                                    )}
                                  >
                                    <CircleCheck
                                      className={cn("size-6", on ? "fill-primary" : "fill-black/30")}
                                      aria-hidden
                                    />
                                  </button>
                                )}
                                {photo.item.favourite && !favourites && (
                                  <Heart
                                    className="pointer-events-none absolute bottom-1 left-1 size-4 fill-white text-white drop-shadow"
                                    aria-label={t("favourite")}
                                  />
                                )}
                                {photo.item.contributionStatus === "WAITING" && (
                                  <span className="pointer-events-none absolute right-1 bottom-1 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-xs text-white">
                                    <Hourglass
                                      className="size-3"
                                      aria-hidden
                                    />{" "}
                                    {t("waiting")}
                                  </span>
                                )}
                              </div>
                            );
                          },
                          image: (props, { photo }) => (
                            <ItemImage
                              src={photo.item.media?.thumbnailUrl}
                              srcSet={
                                photo.item.media
                                  ? `${photo.item.media.thumbnailUrl} 250w, ${photo.item.media.previewUrl} 1440w`
                                  : undefined
                              }
                              sizes={props.sizes}
                              alt={photo.alt ?? ""}
                              status={photo.item.status}
                              type={photo.item.type}
                              thumbhash={photo.item.thumbhash}
                              fill
                            />
                          ),
                        }}
                      />
                    </section>
                  );
                })}
            </MonthSection>
          );
        })}
      </div>
      <Scrubber
        months={months}
        label={monthLabel}
        onJump={jump}
        ariaLabel={t("scrubber")}
      />
      <ItemViewer
        items={shown}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
        options={{ ...options, editor }}
        onFavourite={onFavourite}
      />
    </div>
  );
}

/**
 * A month of the timeline: a sticky header, and its items once loaded. Until then it takes the height its count
 * needs and asks for its items when it comes within a few screens.
 */
function MonthSection({
  id,
  label,
  count,
  estimate,
  loaded,
  failed,
  onNear,
  retryLabel,
  children,
}: {
  id: string;
  label: string;
  count: number;
  estimate: number;
  loaded: boolean;
  failed: boolean;
  onNear: () => void;
  retryLabel: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Timeline");
  const element = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = element.current;

    if (!target || loaded || failed) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onNear();
        }
      },
      { rootMargin: "1500px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loaded, failed, onNear]);

  return (
    <section
      ref={element}
      id={id}
      aria-label={label}
      className="scroll-mt-(--header-height)"
      style={
        loaded ? { contentVisibility: "auto", containIntrinsicSize: `auto ${estimate}px` } : { minHeight: estimate }
      }
    >
      <h2 className="bg-background/95 sticky top-(--header-height) z-10 flex items-baseline gap-2 py-2 text-lg font-semibold backdrop-blur">
        {label} <span className="text-muted-foreground text-sm font-normal">{t("count", { count })}</span>
      </h2>
      {failed ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onNear}
        >
          {retryLabel}
        </Button>
      ) : loaded ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <div
          className="bg-muted/40 h-full animate-pulse rounded"
          style={{ height: estimate - 48 }}
          aria-busy
        />
      )}
    </section>
  );
}

/**
 * The scrubber at the side: the years along the length of the timeline, newest at the top. Clicking or dragging
 * jumps to the month at that point; the month is shown while dragging.
 */
function Scrubber({
  months,
  label,
  onJump,
  ariaLabel,
}: {
  months: TimelineMonth[];
  label: (month: string | null) => string;
  onJump: (month: string | null) => void;
  ariaLabel: string;
}) {
  const marks = useMemo(() => scrubberMarks(months), [months]);
  const bar = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ at: number; month: string | null } | null>(null);
  const dragging = useRef(false);

  const at = (event: React.PointerEvent) => {
    const rect = bar.current!.getBoundingClientRect();
    const share = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;

    return { share: Math.min(Math.max(share, 0), 1), month: monthAt(months, share) };
  };

  if (marks.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-[calc(var(--header-height)+0.5rem)] h-[calc(100svh-var(--header-height)-1rem)] w-10 shrink-0 select-none sm:w-12"
    >
      <div
        ref={bar}
        className="relative h-full cursor-ns-resize touch-none"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);

          const point = at(event);

          onJump(point.month?.month ?? null);
        }}
        onPointerMove={(event) => {
          const point = at(event);

          setHover({ at: point.share, month: point.month?.month ?? null });
          if (dragging.current) {
            onJump(point.month?.month ?? null);
          }
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerLeave={() => {
          if (!dragging.current) {
            setHover(null);
          }
        }}
      >
        <ul>
          {marks.map((mark, index) => {
            // Years too close to the one above are left unlabelled, but still a mark
            const crowded = index > 0 && mark.at - marks[index - 1].at < 0.035;

            return (
              <li
                key={mark.year}
                className="absolute right-0 flex items-center gap-1"
                style={{ top: `${mark.at * 100}%` }}
              >
                <button
                  type="button"
                  onClick={() => onJump(mark.month)}
                  className={cn(
                    "text-muted-foreground hover:text-foreground text-xs tabular-nums",
                    crowded && "sr-only"
                  )}
                >
                  {mark.year}
                </button>
                <span
                  className="bg-muted-foreground/60 block h-px w-1.5"
                  aria-hidden
                />
              </li>
            );
          })}
        </ul>
        {hover && (
          <span
            className="bg-popover pointer-events-none absolute right-full mr-1 -translate-y-1/2 rounded px-2 py-0.5 text-xs whitespace-nowrap shadow"
            style={{ top: `${hover.at * 100}%` }}
            aria-hidden
          >
            {label(hover.month)}
          </span>
        )}
      </div>
    </nav>
  );
}
