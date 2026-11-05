"use client";

import * as React from "react";
import { useTransition } from "react";
import { useServerState } from "@/hooks/use-server-state.client";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { type PickedSpex, SpexPicker } from "@/components/spex/spex-picker.client";
import { createAlbumAction, updateAlbumAction } from "@/app/(app)/manage/actions.server";
import { kindName } from "@/utils/format";
import { track } from "@/utils/umami";

export type AlbumFormValue = {
  id?: string;
  title: string;
  kindId: string | null;
  spex: PickedSpex[];
  dateFrom: string | null;
  dateTo: string | null;
  place: string | null;
  description: string | null;
};

type Kind = { id: string; nameSv: string; nameEn: string; isDefault: boolean };

/**
 * Creates or edits an album: its spex (or none), kind, title (by default the main spex's title and year and the kind),
 * dates, place and description.
 */
export function AlbumForm({ album, kinds }: { album?: AlbumFormValue; kinds: Kind[] }) {
  const t = useTranslations("ManageAlbum");
  const locale = useLocale();
  const router = useRouter();
  const [spex, setSpex] = useServerState<PickedSpex[]>(album?.spex ?? [], list => list.map(item => item.id).join());
  const [none, setNone] = useServerState(album ? album.spex.length === 0 : false);
  const [pending, start] = useTransition();
  const defaultKind = kinds.find(kind => kind.isDefault)?.id ?? kinds[0]?.id ?? "";

  return (
    <form className="grid max-w-3xl gap-4" onSubmit={event => {
      event.preventDefault();

      const data = new FormData(event.currentTarget);
      const title = String(data.get("title") ?? "").trim();
      const dateFrom = String(data.get("dateFrom") ?? "") || null;
      const dateTo = String(data.get("dateTo") ?? "") || null;

      if (!none && spex.length === 0) {
        toast.error(t("spexOrNone"));
        return;
      }
      if (none && !title) {
        toast.error(t("titleRequired"));
        return;
      }
      if (dateFrom && dateTo && dateTo < dateFrom) {
        toast.error(t("dateOrder"));
        return;
      }

      const input = {
        spexIds: spex.map(item => item.id),
        title: title || null,
        kindId: String(data.get("kindId") ?? "") || null,
        dateFrom,
        dateTo,
        place: String(data.get("place") ?? "") || null,
        description: String(data.get("description") ?? "") || null,
      };

      start(async () => {
        if (album?.id) {
          const result = await updateAlbumAction(album.id, input);

          if (result.ok) {
            toast.success(t("saved"));
            router.refresh();
          } else {
            toast.error(result.message);
          }
        } else {
          const result = await createAlbumAction(input);

          if (result.ok && result.data) {
            track("album-create", { spex: spex.length > 0 });
            toast.success(t("created"));
            router.push(`/manage/albums/${result.data}`);
          } else if (!result.ok) {
            toast.error(result.message);
          }
        }
      });
    }}>
      <SpexPicker value={spex} onChange={setSpex} none={none} onNoneChange={setNone} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="album-kind">{t("kind")}</Label>
          <NativeSelect id="album-kind" name="kindId" defaultValue={album?.kindId ?? defaultKind} className="w-full">
            {kinds.map(kind => <NativeSelectOption key={kind.id} value={kind.id}>{kindName(kind, locale)}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="album-title">{t("title")}</Label>
          <Input id="album-title" name="title" maxLength={200} defaultValue={album?.title ?? ""}
                 placeholder={none ? "" : t("titlePlaceholder")} required={none} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="album-from">{t("dateFrom")}</Label>
          <Input id="album-from" name="dateFrom" type="date" defaultValue={album?.dateFrom ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="album-to">{t("dateTo")}</Label>
          <Input id="album-to" name="dateTo" type="date" defaultValue={album?.dateTo ?? ""} />
          <p className="text-xs text-muted-foreground">{t("dateToHint")}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="album-place">{t("place")}</Label>
        <Input id="album-place" name="place" maxLength={200} defaultValue={album?.place ?? ""} placeholder={t("placePlaceholder")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="album-description">{t("description")}</Label>
        <Textarea id="album-description" name="description" maxLength={4000} defaultValue={album?.description ?? ""} rows={4} />
      </div>
      <div><Button type="submit" disabled={pending}>{album?.id ? t("save") : t("create")}</Button></div>
    </form>
  );
}
