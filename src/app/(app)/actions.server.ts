"use server";

import { revalidatePath } from "next/cache";
import {
  albumSuggest,
  contributionsAdd,
  contributionWithdraw,
  getAlbumItems,
  getItemMedia,
  reportCreate,
} from "@/lib/gram/gram.server";
import { itemsAdd } from "@/lib/gram/manage.server";
import { type ActionResult, toActionResult } from "@/lib/graphql.server";
import type { AlbumSuggestionInput, ReportReason } from "@/gql/graphql";
import { withPolicyAction } from "@/utils/route.server";
import { Policies } from "@/utils/policy.server";
import { getSessionContext } from "@/utils/auth.server";
import { hasAccess } from "@/utils/auth";
import { ID, UPLOAD_ID } from "@/utils/ids";
import type { GalleryItem, UploadResultView } from "@/utils/gram";

const REASONS: ReadonlySet<string> = new Set(["I_AM_IN_IT", "WRONG_CAPTION_OR_ALBUM", "INAPPROPRIATE", "OTHER"]);
const PAGE_SIZE = 60;

function requireId(id: string) {
  if (!ID.test(id)) {
    throw new Error("Invalid id");
  }
}

/**
 * A further page of an album's items, for the grid that loads as the viewer scrolls. Anyone may ask; the server
 * returns only what the viewer may see.
 */
export async function albumItemsAction(albumId: string, page: number): Promise<ActionResult<{
  items: GalleryItem[];
  totalCount: number
}>> {
  requireId(albumId);
  return toActionResult(async () => {
    const result = await getAlbumItems(albumId, Math.max(0, Math.floor(page)), PAGE_SIZE);

    return { items: result?.items ?? [], totalCount: result?.totalCount ?? 0 };
  });
}

/**
 * Fresh signed addresses for items a page has had open for a while, without rendering the page again (which would
 * restart a playing video).
 */
export async function renewItemsAction(ids: string[]): Promise<ActionResult<GalleryItem[]>> {
  const wanted = [...new Set(ids)].slice(0, 200);

  wanted.forEach(requireId);
  return toActionResult(async () => getItemMedia(wanted));
}

/**
 * Reports an item. Visitors give an email address and Turnstile's token, which the server checks.
 */
export async function reportAction(input: {
  itemId: string;
  reason: ReportReason;
  message: string;
  email?: string;
  turnstileToken?: string
}): Promise<ActionResult<null>> {
  requireId(input.itemId);
  if (!REASONS.has(input.reason)) {
    throw new Error("Invalid reason");
  }

  const { roles } = await getSessionContext();
  const visitor = !hasAccess(roles);

  return toActionResult(async () => {
    await reportCreate({
      itemId: input.itemId,
      reason: input.reason,
      message: input.message.trim().slice(0, 2000) || null,
      email: visitor ? input.email?.trim().slice(0, 254) || null : null,
      turnstileToken: visitor ? input.turnstileToken || null : null,
    });
    revalidatePath("/reports");
    return null;
  });
}

/**
 * Sends finished tus uploads to an album: as items for editors, or as contributions waiting for review.
 */
export async function addUploadsAction(albumId: string, mode: "items" | "contribution", uploadIds: string[]):
  Promise<ActionResult<UploadResultView[]>> {
  requireId(albumId);
  if (uploadIds.length === 0 || uploadIds.length > 50 || !uploadIds.every(id => UPLOAD_ID.test(id))) {
    throw new Error("Invalid upload");
  }

  const policy = mode === "items" ? Policies.editor.requireEditor : Policies.app.requireAccess;

  return withPolicyAction(policy, () => toActionResult(async () => {
    const results = mode === "items" ? await itemsAdd(albumId, uploadIds) : await contributionsAdd(albumId, uploadIds);

    revalidatePath(`/albums/${albumId}`);
    revalidatePath(`/manage/albums/${albumId}`);
    revalidatePath("/contributions");
    return results.map(result => ({
      uploadId: result.uploadId,
      fileName: result.fileName,
      outcome: result.outcome,
      message: result.message ?? null,
      itemId: result.item?.id ?? null,
      existingItemId: result.existingItem?.id ?? null,
      existingAlbumId: result.existingItem?.album?.id ?? null,
      existingAlbumTitle: result.existingItem?.album?.title ?? result.existingAlbumTitle ?? null,
    }));
  }));
}

export async function withdrawContributionAction(itemId: string): Promise<ActionResult<null>> {
  requireId(itemId);
  return withPolicyAction(Policies.app.requireAccess, () => toActionResult(async () => {
    await contributionWithdraw(itemId);
    revalidatePath("/contributions");
    return null;
  }));
}

/**
 * Suggests an album; the data is the new album's id, to contribute to at once.
 */
export async function suggestAlbumAction(input: AlbumSuggestionInput): Promise<ActionResult<string | null>> {
  if (input.kindId) {
    requireId(input.kindId);
  }
  return withPolicyAction(Policies.app.requireAccess, () => toActionResult(async () => {
    const created = await albumSuggest({
      title: input.title.trim().slice(0, 200),
      dateFrom: input.dateFrom || null,
      dateTo: input.dateTo || null,
      place: input.place?.trim() || null,
      description: input.description?.trim() || null,
      kindId: input.kindId || null,
    });

    revalidatePath("/suggestions");
    return created?.album?.id ?? null;
  }));
}
