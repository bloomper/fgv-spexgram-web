import { vi } from "vitest";
import type { GalleryItem } from "@/utils/gram";

/** An item as the API sends it, with what a test changes. */
export function item(id: string, fields: Partial<GalleryItem> & Record<string, unknown> = {}): GalleryItem {
  return {
    id,
    type: "PHOTO",
    status: "READY",
    caption: null,
    photographer: null,
    takenAt: "1975-02-14T20:00:00",
    width: 400,
    height: 300,
    durationMs: null,
    visibility: "MEMBERS",
    effectiveVisibility: "MEMBERS",
    album: { id: "a1", title: "Nobel 1975", visibility: "MEMBERS" },
    latitude: null,
    longitude: null,
    failure: null,
    contributionStatus: null,
    mine: false,
    uploadedBy: null,
    originalFileName: null,
    media: { thumbnailUrl: `https://media/${id}/t`, previewUrl: `https://media/${id}/p`, videoUrl: null, originalUrl: null, expiresAt: "2100-01-01T00:00:00Z" },
    ...fields,
  } as unknown as GalleryItem;
}

/** What the components ask useDialogs() with, as far as the tests look. */
export type DialogOptions = {
  title?: string;
  description?: string;
  destructive?: boolean;
  defaultValue?: string;
  items?: { id: string; label: string }[];
};

/** useDialogs() whose answers a test sets. */
export function dialogs() {
  return {
    confirm: vi.fn<(options: DialogOptions) => Promise<boolean>>(async () => true),
    prompt: vi.fn<(options: DialogOptions) => Promise<string | null>>(async () => "Svar"),
    choose: vi.fn<(options: DialogOptions) => Promise<string | null>>(async () => null),
  };
}
