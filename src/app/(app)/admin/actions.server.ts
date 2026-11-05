"use server";

import { revalidatePath } from "next/cache";
import {
  albumKindCreate,
  albumKindDelete,
  albumKindsReorder,
  albumKindUpdate,
  immichJobRun,
  maintenanceJobRun,
  settingsUpdate,
} from "@/lib/admin/admin.server";
import { type ActionResult, toActionResult } from "@/lib/graphql.server";
import type { AlbumKindInput, ImmichJob, MaintenanceJob, SettingsInput } from "@/gql/graphql";
import { ID } from "@/utils/ids";
import { withPolicyAction } from "@/utils/route.server";
import { Policies } from "@/utils/policy.server";

export async function saveSettingsAction(input: SettingsInput): Promise<ActionResult<null>> {
  return withPolicyAction(Policies.admin.requireAdmin, () => toActionResult(async () => {
    await settingsUpdate(input);
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return null;
  }));
}

/**
 * Starts a maintenance job in the background. The data is false when it is already running.
 */
export async function runMaintenanceJobAction(job: MaintenanceJob): Promise<ActionResult<boolean>> {
  return withPolicyAction(Policies.admin.requireAdmin, () => toActionResult(async () => {
    const started = await maintenanceJobRun(job);
    revalidatePath("/admin/maintenance");
    return started;
  }));
}

const kinds = <T, >(work: () => Promise<T>) => withPolicyAction(Policies.admin.requireAdmin, () => toActionResult(async () => {
  const result = await work();

  revalidatePath("/admin/kinds");
  revalidatePath("/", "layout");
  return result;
}));

export async function createKindAction(input: AlbumKindInput): Promise<ActionResult<null>> {
  return kinds(async () => {
    await albumKindCreate(input);
    return null;
  });
}

export async function updateKindAction(id: string, input: AlbumKindInput): Promise<ActionResult<null>> {
  return kinds(async () => {
    await albumKindUpdate(id, input);
    return null;
  });
}

/**
 * Every kind's id in the new order; the first becomes the default.
 */
export async function reorderKindsAction(ids: string[]): Promise<ActionResult<null>> {
  return kinds(async () => {
    await albumKindsReorder(ids);
    return null;
  });
}

export async function deleteKindAction(id: string): Promise<ActionResult<null>> {
  return kinds(async () => {
    await albumKindDelete(id);
    return null;
  });
}

const IMMICH_JOBS: ReadonlySet<string> = new Set(["REGENERATE_THUMBNAIL", "REFRESH_METADATA", "TRANSCODE_VIDEO"]);

/**
 * Starts one of Immich's jobs again for the items, e.g. thumbnails for items that failed.
 */
export async function runImmichJobAction(itemIds: string[], job: ImmichJob): Promise<ActionResult<null>> {
  if (!IMMICH_JOBS.has(job) || itemIds.length === 0 || itemIds.length > 500 || !itemIds.every(id => ID.test(id))) {
    throw new Error("Invalid request");
  }
  return withPolicyAction(Policies.admin.requireAdmin, () => toActionResult(async () => {
    await immichJobRun(itemIds, job);
    revalidatePath("/admin/immich");
    return null;
  }));
}
