"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { suggestAlbumAction } from "@/app/(app)/actions.server";
import { kindName } from "@/utils/format";
import { track } from "@/utils/umami";

/**
 * Suggests a new album with a title, date and description; the member can contribute to it at once, and it is
 * unpublished until an editor accepts it.
 */
export function SuggestForm({ kinds }: { kinds: { id: string; nameSv: string; nameEn: string }[] }) {
  const t = useTranslations("Suggestions");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");

  return (
    <form className="grid max-w-2xl gap-4 rounded-lg border p-4" onSubmit={event => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);
      const form = event.currentTarget;

      start(async () => {
        const result = await suggestAlbumAction({
          title: String(data.get("title") ?? ""),
          dateFrom: String(data.get("dateFrom") ?? "") || null,
          dateTo: String(data.get("dateTo") ?? "") || null,
          place: String(data.get("place") ?? "") || null,
          description: String(data.get("description") ?? "") || null,
          kindId: String(data.get("kindId") ?? "") || null,
        });

        if (result.ok) {
          track("album-suggest");
          toast.success(t("sent"));
          form.reset();
          setTitle("");
          if (result.data) {
            router.push(`/albums/${result.data}/contribute`);
          }
        } else {
          toast.error(result.message);
        }
      });
    }}>
      <h2 className="text-lg font-semibold">{t("new")}</h2>
      <div className="space-y-1.5">
        <Label htmlFor="suggest-title">{t("titleLabel")}</Label>
        <Input id="suggest-title" name="title" required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="suggest-from">{t("dateFrom")}</Label>
          <Input id="suggest-from" name="dateFrom" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="suggest-to">{t("dateTo")}</Label>
          <Input id="suggest-to" name="dateTo" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="suggest-kind">{t("kind")}</Label>
          <NativeSelect id="suggest-kind" name="kindId" defaultValue="" className="w-full">
            <NativeSelectOption value="">{t("defaultKind")}</NativeSelectOption>
            {kinds.map(kind => <NativeSelectOption key={kind.id} value={kind.id}>{kindName(kind, locale)}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="suggest-place">{t("place")}</Label>
        <Input id="suggest-place" name="place" maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="suggest-description">{t("description")}</Label>
        <Textarea id="suggest-description" name="description" maxLength={4000} />
      </div>
      <div><Button type="submit" disabled={pending || !title.trim()}>{t("send")}</Button></div>
    </form>
  );
}
