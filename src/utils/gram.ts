import type { ItemFieldsFragment, UploadOutcome, Visibility } from "@/gql/graphql";
import { formatDay } from "@/utils/format";

/** An item as the grid, the viewer and the item page show it. */
export type GalleryItem = ItemFieldsFragment;

/** What became of one upload, as the upload list shows it. */
export type UploadResultView = {
  uploadId: string;
  fileName: string;
  outcome: UploadOutcome;
  message: string | null;
  itemId: string | null;
  existingItemId: string | null;
  existingAlbumId: string | null;
  existingAlbumTitle: string | null;
};

/** The visibilities from the narrowest. */
export const VISIBILITIES: readonly Visibility[] = ["UNPUBLISHED", "MEMBERS", "PUBLIC"];

/** Signed addresses are renewed when they run out within this long. */
export const RENEW_MARGIN_MS = 15 * 60 * 1000;

/**
 * The item's text alternative: its caption, else the album's title and the date it was taken (WCAG: every photo gets
 * one).
 */
export function altText(item: Pick<GalleryItem, "caption" | "takenAt" | "album">, locale: string, albumTitle?: string | null): string {
  const caption = item.caption?.trim();

  if (caption) {
    return caption;
  }
  return [albumTitle ?? item.album?.title, formatDay(item.takenAt, locale)].filter(Boolean).join(", ") || "Spexgram";
}

/**
 * Whether any of the addresses run out within the margin, so that the page should ask for new ones.
 */
export function needsRenewal(items: readonly { media?: { expiresAt: string } | null }[], now: number, margin = RENEW_MARGIN_MS): boolean {
  return items.some(item => {
    if (!item.media) {
      return false;
    }

    const expires = Date.parse(item.media.expiresAt);

    return Number.isFinite(expires) && expires - now < margin;
  });
}

/**
 * The items with the renewed ones in their place, in the same order; items that were not renewed are kept.
 */
export function mergeRenewed<T extends { id: string }>(items: readonly T[], renewed: readonly T[]): T[] {
  const byId = new Map(renewed.map(item => [item.id, item]));

  return items.map(item => byId.get(item.id) ?? item);
}

/**
 * Whether the item can be shown as a picture: it has addresses and Immich has finished with it.
 */
export function isShowable(item: Pick<GalleryItem, "status" | "media">): boolean {
  return item.status === "READY" && item.media !== null;
}

/**
 * The file name a downloaded preview gets: the caption or the album, with the date taken, as JPEG.
 */
export function downloadName(item: Pick<GalleryItem, "caption" | "takenAt" | "album" | "id">, kind: "preview" | "original"): string {
  const base = (item.caption?.trim() || item.album?.title || "spexgram")
    .replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const day = item.takenAt?.slice(0, 10);
  const name = [base, day].filter(Boolean).join(" ");

  return kind === "preview" ? `${name}.jpg` : name;
}

/**
 * How many of an album's items visitors see once it is public: an item is seen with the narrower of its own and the
 * album's visibility, so only those marked public, unless `items` makes every item public too.
 */
export function publicAfter(counts: readonly { visibility: Visibility; count: number }[], items: boolean): number {
  return counts.filter(count => items || count.visibility === "PUBLIC").reduce((sum, count) => sum + count.count, 0);
}
