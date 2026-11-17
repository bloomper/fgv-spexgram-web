import { thumbHashToDataURL } from "thumbhash";

/** A month of the timeline as the server lists it: yyyy-mm, or null for the items without a date. */
export type TimelineMonth = { month: string | null; count: number };

/** The key a month's section goes by in the page and in the address (`#m-1984-02`, `#m-undated`). */
export function monthKey(month: string | null): string {
  return month ?? "undated";
}

/**
 * The items of a month by the day they were taken, in the order they come (newest first); undated items are one
 * group with day null.
 */
export function groupByDay<T extends { takenAt?: string | null }>(items: readonly T[]): { day: string | null; items: T[] }[] {
  const days: { day: string | null; items: T[] }[] = [];

  for (const item of items) {
    const day = item.takenAt ? item.takenAt.slice(0, 10) : null;
    const last = days.at(-1);

    if (last && last.day === day) {
      last.items.push(item);
    } else {
      days.push({ day, items: [item] });
    }
  }
  return days;
}

/**
 * How tall a month's section is likely to be before its items have loaded, so that the page has its full length at
 * once and the scrubber can jump anywhere: rows of photos of about 4:3 at the row height, plus a header per few rows.
 */
export function estimateHeight(count: number, width: number, rowHeight: number): number {
  const perRow = Math.max(1, Math.floor(Math.max(width, 1) / (rowHeight * 4 / 3)));
  const rows = Math.ceil(count / perRow);

  return 48 + rows * (rowHeight + 4) + Math.ceil(rows / 3) * 32;
}

/** The row height of the grid for a container this wide. */
export function rowHeightFor(width: number, rowHeight = 220): number {
  return width < 480 ? 120 : width < 900 ? 170 : rowHeight;
}

/**
 * The marks of the scrubber: each year once, at the share of the timeline before its first month, so that the bar
 * is as long as the timeline is (newest at the top). Undated items come last, unmarked.
 */
export function scrubberMarks(months: readonly TimelineMonth[]): { year: string; month: string; at: number }[] {
  const total = months.reduce((sum, month) => sum + Math.max(month.count, 1), 0);
  const marks: { year: string; month: string; at: number }[] = [];
  let before = 0;

  for (const month of months) {
    const year = month.month?.slice(0, 4);

    if (year && marks.at(-1)?.year !== year) {
      marks.push({ year, month: month.month!, at: total === 0 ? 0 : before / total });
    }
    before += Math.max(month.count, 1);
  }
  return marks;
}

/**
 * The month at a share (0 at the top, 1 at the bottom) of the scrubber, by how many items come before it.
 */
export function monthAt(months: readonly TimelineMonth[], share: number): TimelineMonth | null {
  const total = months.reduce((sum, month) => sum + Math.max(month.count, 1), 0);
  const wanted = Math.min(Math.max(share, 0), 1) * total;
  let before = 0;

  for (const month of months) {
    before += Math.max(month.count, 1);
    if (wanted < before) {
      return month;
    }
  }
  return months.at(-1) ?? null;
}

/**
 * The ids from the anchor to the target, both included, in the order shown: what a shift-click selects.
 */
export function rangeOf(order: readonly string[], anchor: string, target: string): string[] {
  const from = order.indexOf(anchor);
  const to = order.indexOf(target);

  if (from < 0 || to < 0) {
    return [target];
  }
  return order.slice(Math.min(from, to), Math.max(from, to) + 1);
}

const placeholders = new Map<string, string | null>();

/**
 * Immich's thumbhash (base64) as a data URL of a tiny blurred picture, for a placeholder until the thumbnail loads;
 * null when there is none or it cannot be read. Remembered, since a long timeline asks for many again.
 */
export function thumbhashUrl(hash: string | null | undefined): string | null {
  if (!hash) {
    return null;
  }

  const known = placeholders.get(hash);

  if (known !== undefined) {
    return known;
  }

  let url: string | null;

  try {
    const bytes = Uint8Array.from(atob(hash), char => char.charCodeAt(0));

    url = thumbHashToDataURL(bytes);
  } catch {
    url = null;
  }
  if (placeholders.size > 5000) {
    placeholders.clear();
  }
  placeholders.set(hash, url);
  return url;
}

/**
 * The OpenStreetMap tile at the zoom that holds the position, and where in it (0–256) the position is, for a small
 * map without a map library.
 */
export function tileOf(latitude: number, longitude: number, zoom: number): { x: number; y: number; left: number; top: number } {
  const n = 2 ** zoom;
  const lat = Math.max(Math.min(latitude, 85.0511), -85.0511) * Math.PI / 180;
  const fx = (longitude + 180) / 360 * n;
  const fy = (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * n;
  const x = Math.floor(fx);
  const y = Math.floor(fy);

  return { x, y, left: Math.round((fx - x) * 256), top: Math.round((fy - y) * 256) };
}

/** How many years ago the day was, from today's year. */
export function yearsAgo(day: string, now: Date): number {
  return now.getFullYear() - Number(day.slice(0, 4));
}
