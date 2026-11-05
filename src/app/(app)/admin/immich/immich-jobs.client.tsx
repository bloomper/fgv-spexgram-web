"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import type { ImmichJob } from "@/gql/graphql";
import { runImmichJobAction } from "../actions.server";

const JOBS: ImmichJob[] = ["REGENERATE_THUMBNAIL", "REFRESH_METADATA", "TRANSCODE_VIDEO"];

/**
 * Starts one of Immich's jobs again for the items that failed.
 */
export function ImmichJobs({ itemIds }: { itemIds: string[] }) {
  const t = useTranslations("AdminImmich");
  const router = useRouter();
  const [job, setJob] = useState<ImmichJob>("REGENERATE_THUMBNAIL");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="immich-job">{t("job")}</Label>
        <NativeSelect id="immich-job" value={job} onChange={event => setJob(event.target.value as ImmichJob)}>
          {JOBS.map(value => <NativeSelectOption key={value} value={value}>{t(`jobs.${value}`)}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <Button disabled={pending || itemIds.length === 0} onClick={() => start(async () => {
        const result = await runImmichJobAction(itemIds, job);

        if (result.ok) {
          toast.success(t("started"));
          router.refresh();
        } else {
          toast.error(result.message);
        }
      })}>{t("runFor", { count: itemIds.length })}</Button>
    </div>
  );
}
