"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDialogs } from "@/components/dialogs.client";
import { kindName } from "@/utils/format";
import { createKindAction, deleteKindAction, reorderKindsAction, updateKindAction } from "../actions.server";

export type EditableKind = { id: string; nameSv: string; nameEn: string; isDefault: boolean; albumCount: number };

type Names = { nameSv: string; nameEn: string };

function NameFields({ idPrefix, names, onChange }: {
  idPrefix: string;
  names: Names;
  onChange: (names: Names) => void
}) {
  const t = useTranslations("AdminKinds");

  return (
    <div className="grid flex-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-sv`}>{t("nameSv")}</Label>
        <Input id={`${idPrefix}-sv`} value={names.nameSv} maxLength={100} required
               onChange={event => onChange({ ...names, nameSv: event.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-en`}>{t("nameEn")}</Label>
        <Input id={`${idPrefix}-en`} value={names.nameEn} maxLength={100} required
               onChange={event => onChange({ ...names, nameEn: event.target.value })} />
      </div>
    </div>
  );
}

/**
 * The album kinds in order, each renamed in place, moved up or down, or deleted when no album has it, and a form for
 * a new kind, which is added last.
 */
export function KindsEditor({ kinds }: { kinds: EditableKind[] }) {
  const t = useTranslations("AdminKinds");
  const locale = useLocale();
  const router = useRouter();
  const { confirm } = useDialogs();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Names>({ nameSv: "", nameEn: "" });
  const [added, setAdded] = useState<Names>({ nameSv: "", nameEn: "" });
  const valid = (names: Names) => names.nameSv.trim() !== "" && names.nameEn.trim() !== "";

  const run = (work: () => Promise<{ ok: boolean; message?: string }>, success: string, then?: () => void) =>
    startTransition(async () => {
      const result = await work();

      if (result.ok) {
        toast.success(success);
        then?.();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });

  const move = (index: number, by: number) => {
    const ids = kinds.map(kind => kind.id);

    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    run(() => reorderKindsAction(ids), t("saved"));
  };

  return (
    <div className="space-y-6">
      <ol className="divide-y rounded-lg border">
        {kinds.map((kind, i) => {
          const name = kindName(kind, locale);

          return (
            <li key={kind.id} className="px-3 py-3">
              {editing === kind.id ? (
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => {
                  event.preventDefault();
                  run(() => updateKindAction(kind.id, { nameSv: draft.nameSv.trim(), nameEn: draft.nameEn.trim() }),
                    t("saved"), () => setEditing(null));
                }}>
                  <NameFields idPrefix={`kind-${kind.id}`} names={draft} onChange={setDraft} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>
                    <Button type="submit" disabled={pending || !valid(draft)}>{t("save")}</Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{kind.nameSv}</span>
                      <span className="text-sm text-muted-foreground">/ {kind.nameEn}</span>
                      {kind.isDefault && <Badge variant="secondary">{t("default")}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("albums", { count: kind.albumCount })}</div>
                  </div>
                  <Button variant="ghost" size="icon" disabled={pending || i === 0}
                          aria-label={t("moveUp", { name })} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon" disabled={pending || i === kinds.length - 1}
                          aria-label={t("moveDown", { name })} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon" disabled={pending} aria-label={t("edit", { name })}
                          onClick={() => {
                            setDraft({ nameSv: kind.nameSv, nameEn: kind.nameEn });
                            setEditing(kind.id);
                          }}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" disabled={pending || kind.albumCount > 0 || kinds.length === 1}
                          aria-label={t("deleteKind", { name })} title={kind.albumCount > 0 ? t("inUse") : undefined}
                          onClick={async () => {
                            if (await confirm({
                              title: t("confirmDelete", { name }),
                              confirmLabel: t("delete"),
                              destructive: true,
                            })) {
                              run(() => deleteKindAction(kind.id), t("deleted"));
                            }
                          }}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <form className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end" onSubmit={event => {
        event.preventDefault();
        run(() => createKindAction({ nameSv: added.nameSv.trim(), nameEn: added.nameEn.trim() }), t("added"),
          () => setAdded({ nameSv: "", nameEn: "" }));
      }}>
        <NameFields idPrefix="new-kind" names={added} onChange={setAdded} />
        <Button type="submit" disabled={pending || !valid(added)}><Plus />{t("add")}</Button>
      </form>
    </div>
  );
}
