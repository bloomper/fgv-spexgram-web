"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDialogs } from "@/components/dialogs.client";
import { setAlbumVisibilityAction } from "@/app/(app)/manage/actions.server";
import type { Visibility } from "@/gql/graphql";
import { useServerState } from "@/hooks/use-server-state.client";
import { publicAfter, VISIBILITIES } from "@/utils/gram";
import { track } from "@/utils/umami";

/**
 * Who sees the album: unpublished, members or public, optionally setting every item to the same. Making it public is
 * confirmed with how many photos and videos visitors will see.
 */
export function VisibilityControl({ albumId, visibility, counts }: {
  albumId: string;
  visibility: Visibility;
  counts: { visibility: Visibility; count: number }[]
}) {
  const t = useTranslations("VisibilityControl");
  const v = useTranslations("Visibility");
  const router = useRouter();
  const dialogs = useDialogs();
  const [chosen, setChosen] = useServerState(visibility);
  const [items, setItems] = useState(false);
  const [pending, start] = useTransition();
  const total = counts.reduce((sum, count) => sum + count.count, 0);
  const unchanged = chosen === visibility && !items;

  const apply = async () => {
    const description = chosen === "PUBLIC"
      ? t("confirmPublic", { count: publicAfter(counts, items) })
      : chosen === "MEMBERS" ? t("confirmMembers") : t("confirmUnpublished");
    const confirmed = await dialogs.confirm({
      title: t("confirmTitle", { visibility: v(chosen) }),
      description: items ? `${description} ${t("confirmItems", { count: total })}` : description,
      confirmLabel: t("apply"),
      destructive: chosen === "PUBLIC",
    });

    if (!confirmed) {
      return;
    }
    start(async () => {
      const result = await setAlbumVisibilityAction(albumId, chosen, items);

      if (result.ok) {
        track("album-visibility", { visibility: chosen, items });
        toast.success(t("saved"));
        if (result.data > 0) {
          toast.warning(t("skipped", { count: result.data }));
        }
        setItems(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-lg font-semibold">{t("title")}</legend>
      <div className="space-y-2" role="radiogroup" aria-label={t("title")}>
        {VISIBILITIES.map(value => (
          <label key={value} className="flex items-start gap-2 text-sm">
            <input type="radio" name="album-visibility" value={value} checked={chosen === value}
                   onChange={() => setChosen(value)} className="mt-1 accent-primary" />
            <span>
              <span className="font-medium">{v(value)}</span>
              <span className="block text-muted-foreground">{t(`describe.${value}`)}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox className="relative after:absolute after:-inset-2" checked={items} onCheckedChange={checked => setItems(checked)} />
        {t("items", { count: total })}
      </label>
      <p className="text-xs text-muted-foreground">
        {t("counts", {
          unpublished: counts.find(count => count.visibility === "UNPUBLISHED")?.count ?? 0,
          members: counts.find(count => count.visibility === "MEMBERS")?.count ?? 0,
          public: counts.find(count => count.visibility === "PUBLIC")?.count ?? 0,
        })}
      </p>
      <Button onClick={apply} disabled={pending || unchanged}>{t("apply")}</Button>
    </fieldset>
  );
}
