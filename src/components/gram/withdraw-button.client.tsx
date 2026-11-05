"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogs } from "@/components/dialogs.client";
import { withdrawContributionAction } from "@/app/(app)/actions.server";
import { track } from "@/utils/umami";

/**
 * Takes back a contribution that is still waiting for review; its file is deleted.
 */
export function WithdrawButton({ itemId, name }: { itemId: string; name: string }) {
  const t = useTranslations("Contributions");
  const dialogs = useDialogs();
  const [pending, start] = useTransition();

  return (
    <Button variant="outline" size="sm" disabled={pending} aria-label={t("withdrawOf", { name })} onClick={async () => {
      const confirmed = await dialogs.confirm({
        title: t("withdrawTitle"),
        description: t("withdrawText"),
        confirmLabel: t("withdraw"),
        destructive: true,
      });

      if (!confirmed) {
        return;
      }
      start(async () => {
        const result = await withdrawContributionAction(itemId);

        if (result.ok) {
          track("contribution-withdraw");
          toast.success(t("withdrawn"));
        } else {
          toast.error(result.message);
        }
      });
    }}>
      <Undo2 /> {t("withdraw")}
    </Button>
  );
}
