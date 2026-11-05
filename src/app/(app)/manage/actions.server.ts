"use server";

import { revalidatePath } from "next/cache";
import {
  albumCreate,
  albumDelete,
  albumRestore,
  albumSetCover,
  albumSetVisibility,
  albumSuggestionReview,
  albumTrash,
  albumUpdate,
  contributionsReview,
  getAlbumTitles,
  itemsDelete,
  itemsRestore,
  itemsTrash,
  itemsUpdate,
  itemUpdate,
  reportHandle,
  searchSpex,
  trashEmpty,
} from "@/lib/gram/manage.server";
import { type ActionResult, toActionResult } from "@/lib/graphql.server";
import type { AlbumInput, ItemInput, ItemsInput, ReportOutcome, Visibility } from "@/gql/graphql";
import { withPolicyAction } from "@/utils/route.server";
import { Policies } from "@/utils/policy.server";
import { ID } from "@/utils/ids";

const VISIBILITIES: ReadonlySet<string> = new Set(["UNPUBLISHED", "MEMBERS", "PUBLIC"]);
const OUTCOMES: ReadonlySet<string> = new Set(["REMOVED", "CORRECTED", "KEPT"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const MAX_IDS = 500;

function requireId(id: string | null | undefined) {
  if (!id || !ID.test(id)) {
    throw new Error("Invalid id");
  }
}

function requireIds(ids: string[]) {
  if (ids.length === 0 || ids.length > MAX_IDS) {
    throw new Error("Invalid ids");
  }
  ids.forEach(requireId);
}

function requireVisibility(visibility: string | null | undefined) {
  if (visibility && !VISIBILITIES.has(visibility)) {
    throw new Error("Invalid visibility");
  }
}

/** Everything that shows albums and items; album pages are rendered again when next opened. */
function changed(albumIds: (string | null | undefined)[] = []) {
  revalidatePath("/manage", "layout");
  revalidatePath("/albums");
  revalidatePath("/");
  for (const id of albumIds.filter(Boolean)) {
    revalidatePath(`/albums/${id}`);
  }
}

const editor = <T, >(work: () => Promise<T>) => withPolicyAction(Policies.editor.requireEditor, () => toActionResult(work));
const admin = <T, >(work: () => Promise<T>) => withPolicyAction(Policies.admin.requireAdmin, () => toActionResult(work));

function cleanAlbum(input: AlbumInput): AlbumInput {
  (input.spexIds ?? []).forEach(requireId);
  if (input.kindId) {
    requireId(input.kindId);
  }
  if ((input.dateFrom && !DAY.test(input.dateFrom)) || (input.dateTo && !DAY.test(input.dateTo))) {
    throw new Error("Invalid date");
  }
  return {
    spexIds: input.spexIds ?? [],
    title: input.title?.trim().slice(0, 200) || null,
    kindId: input.kindId || null,
    dateFrom: input.dateFrom || null,
    dateTo: input.dateTo || null,
    place: input.place?.trim().slice(0, 200) || null,
    description: input.description?.trim().slice(0, 4000) || null,
  };
}

export async function searchSpexAction(q: string) {
  return editor(async () => searchSpex(q.slice(0, 100)));
}

export async function albumTitlesAction() {
  return editor(async () => getAlbumTitles());
}

export async function createAlbumAction(input: AlbumInput): Promise<ActionResult<string | undefined>> {
  const clean = cleanAlbum(input);

  return editor(async () => {
    const created = await albumCreate(clean);

    changed();
    return created?.id;
  });
}

export async function updateAlbumAction(id: string, input: AlbumInput): Promise<ActionResult<null>> {
  requireId(id);
  const clean = cleanAlbum(input);

  return editor(async () => {
    await albumUpdate(id, clean);
    changed([id]);
    return null;
  });
}

export async function setAlbumVisibilityAction(id: string, visibility: Visibility, items: boolean): Promise<ActionResult<null>> {
  requireId(id);
  requireVisibility(visibility);
  return editor(async () => {
    await albumSetVisibility(id, visibility, items);
    changed([id]);
    return null;
  });
}

export async function setCoverAction(id: string, itemId: string | null): Promise<ActionResult<null>> {
  requireId(id);
  if (itemId) {
    requireId(itemId);
  }
  return editor(async () => {
    await albumSetCover(id, itemId);
    changed([id]);
    return null;
  });
}

export async function trashAlbumAction(id: string, trashed: boolean): Promise<ActionResult<null>> {
  requireId(id);
  return editor(async () => {
    await (trashed ? albumTrash(id) : albumRestore(id));
    changed([id]);
    return null;
  });
}

export async function deleteAlbumAction(id: string, keepItems: boolean): Promise<ActionResult<null>> {
  requireId(id);
  return admin(async () => {
    await albumDelete(id, keepItems);
    changed();
    return null;
  });
}

export async function updateItemAction(id: string, albumId: string | null, input: ItemInput): Promise<ActionResult<null>> {
  requireId(id);
  if (input.takenAt && !LOCAL_TIME.test(input.takenAt)) {
    throw new Error("Invalid date");
  }

  const hasPosition = typeof input.latitude === "number" && typeof input.longitude === "number";

  return editor(async () => {
    await itemUpdate(id, {
      caption: input.caption?.trim().slice(0, 2000) || null,
      photographer: input.photographer?.trim().slice(0, 200) || null,
      takenAt: input.takenAt ? (input.takenAt.length === 16 ? `${input.takenAt}:00` : input.takenAt) : null,
      latitude: hasPosition ? input.latitude : null,
      longitude: hasPosition ? input.longitude : null,
    });
    changed([albumId]);
    revalidatePath(`/items/${id}`);
    return null;
  });
}

/**
 * Changes many items at once: caption, credit, visibility or album (which also sorts unsorted items).
 */
export async function updateItemsAction(ids: string[], input: ItemsInput, albumIds: string[] = []): Promise<ActionResult<null>> {
  requireIds(ids);
  requireVisibility(input.visibility);
  if (input.albumId) {
    requireId(input.albumId);
  }
  return editor(async () => {
    await itemsUpdate(ids, {
      caption: input.caption === undefined || input.caption === null ? null : input.caption.trim().slice(0, 2000),
      photographer: input.photographer === undefined || input.photographer === null ? null : input.photographer.trim().slice(0, 200),
      visibility: input.visibility ?? null,
      albumId: input.albumId ?? null,
    });
    changed([...albumIds, input.albumId]);
    return null;
  });
}

export async function trashItemsAction(ids: string[], trashed: boolean, albumIds: string[] = []): Promise<ActionResult<null>> {
  requireIds(ids);
  return editor(async () => {
    await (trashed ? itemsTrash(ids) : itemsRestore(ids));
    changed(albumIds);
    return null;
  });
}

export async function deleteItemsAction(ids: string[]): Promise<ActionResult<null>> {
  requireIds(ids);
  return admin(async () => {
    await itemsDelete(ids);
    changed();
    return null;
  });
}

export async function emptyTrashAction(): Promise<ActionResult<null>> {
  return admin(async () => {
    await trashEmpty();
    changed();
    return null;
  });
}

/**
 * Creates an album from unsorted items: the album, then the items moved into it. The data is the album's id.
 */
export async function albumFromItemsAction(title: string, dateFrom: string | null, ids: string[]): Promise<ActionResult<string | undefined>> {
  requireIds(ids);
  if (dateFrom && !DAY.test(dateFrom)) {
    throw new Error("Invalid date");
  }
  return editor(async () => {
    const created = await albumCreate({ spexIds: [], title: title.trim().slice(0, 200), dateFrom });

    if (created?.id) {
      await itemsUpdate(ids, { albumId: created.id });
    }
    changed([created?.id]);
    return created?.id;
  });
}

export async function reviewContributionsAction(itemIds: string[], accept: boolean, message: string | null): Promise<ActionResult<null>> {
  requireIds(itemIds);
  return editor(async () => {
    await contributionsReview(itemIds, accept, message?.trim().slice(0, 2000) || null);
    changed();
    return null;
  });
}

export async function reviewSuggestionAction(id: string, accept: boolean, message: string | null): Promise<ActionResult<null>> {
  requireId(id);
  return editor(async () => {
    await albumSuggestionReview(id, accept, message?.trim().slice(0, 2000) || null);
    changed();
    return null;
  });
}

export async function handleReportAction(id: string, outcome: ReportOutcome, message: string | null): Promise<ActionResult<null>> {
  requireId(id);
  if (!OUTCOMES.has(outcome)) {
    throw new Error("Invalid outcome");
  }
  return editor(async () => {
    await reportHandle(id, outcome, message?.trim().slice(0, 2000) || null);
    changed();
    return null;
  });
}
