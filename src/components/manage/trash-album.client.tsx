"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogs } from "@/components/dialogs.client";
import { trashAlbumAction } from "@/app/(app)/manage/actions.server";

/**
 * Moves the album with its items to the trash, or restores it.
 */
export function TrashAlbum({ albumId, trashed }: { albumId: string; trashed: boolean }) {
  const t = useTranslations("ManageAlbum");
  const dialogs = useDialogs();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button variant={trashed ? "outline" : "destructive"} disabled={pending} onClick={async () => {
      if (!trashed && !await dialogs.confirm({ title: t("trashTitle"), description: t("trashText"), confirmLabel: t("trash"), destructive: true })) {
        return;
      }
      start(async () => {
        const result = await trashAlbumAction(albumId, !trashed);

        if (result.ok) {
          toast.success(trashed ? t("restored") : t("trashed"));
          router.push(trashed ? `/manage/albums/${albumId}` : "/manage/albums");
          router.refresh();
        } else {
          toast.error(result.message);
        }
      });
    }}>
      {trashed ? <><ArchiveRestore /> {t("restore")}</> : <><Trash2 /> {t("trash")}</>}
    </Button>
  );
}
