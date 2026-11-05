"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SettingsInput } from "@/gql/graphql";
import { useServerState } from "@/hooks/use-server-state.client";
import { saveSettingsAction } from "../actions.server";

type NumberField = "maxUploadGb" | "maxVideoMinutes" | "contributionMaxItems" | "contributionMaxGb";

const LIMITS: Record<NumberField, [number, number]> = {
  maxUploadGb: [1, 50],
  maxVideoMinutes: [1, 120],
  contributionMaxItems: [1, 10000],
  contributionMaxGb: [1, 500],
};

/**
 * The settings: the start page's texts for members and visitors, the contact address shown to visitors, upload and
 * contribution limits, and whether members download originals and see positions.
 */
export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const t = useTranslations("AdminSettings");
  const [values, setValues] = useServerState(initial, value => JSON.stringify(value));
  const [pending, startTransition] = useTransition();
  const text = (field: "welcomeSv" | "welcomeEn" | "publicWelcomeSv" | "publicWelcomeEn") => (
    <div className="space-y-1.5">
      <Label htmlFor={field}>{t(field)}</Label>
      <Textarea id={field} rows={3} value={values[field] ?? ""} onChange={event => setValues({ ...values, [field]: event.target.value })} />
    </div>
  );
  const number = (field: NumberField) => (
    <div className="space-y-1.5">
      <Label htmlFor={field}>{t(field)}</Label>
      <Input id={field} type="number" min={LIMITS[field][0]} max={LIMITS[field][1]} required value={values[field]}
             onChange={event => setValues({ ...values, [field]: Number(event.target.value) })} />
    </div>
  );

  return (
    <form className="max-w-2xl space-y-6" onSubmit={event => {
      event.preventDefault();
      startTransition(async () => {
        const result = await saveSettingsAction({
          ...values,
          contactEmail: values.contactEmail?.trim() || null,
        });

        if (result.ok) {
          toast.success(t("saved"));
        } else {
          toast.error(result.message);
        }
      });
    }}>
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">{t("startPage")}</legend>
        {text("welcomeSv")}
        {text("welcomeEn")}
        {text("publicWelcomeSv")}
        {text("publicWelcomeEn")}
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">{t("contactEmail")}</Label>
          <Input id="contactEmail" type="email" value={values.contactEmail ?? ""}
                 onChange={event => setValues({ ...values, contactEmail: event.target.value })} />
        </div>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">{t("limits")}</legend>
        {number("maxUploadGb")}
        {number("maxVideoMinutes")}
        {number("contributionMaxItems")}
        {number("contributionMaxGb")}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-semibold">{t("members")}</legend>
        <label className="flex items-center gap-3">
          <Switch checked={values.userDownloadsOriginals}
                  onCheckedChange={checked => setValues({ ...values, userDownloadsOriginals: checked })} />
          <span>
            <span className="block">{t("userDownloadsOriginals")}</span>
            <span className="block text-xs text-muted-foreground">{t("userDownloadsOriginalsText")}</span>
          </span>
        </label>
        <label className="flex items-center gap-3">
          <Switch checked={values.showPositions} onCheckedChange={checked => setValues({ ...values, showPositions: checked })} />
          <span>
            <span className="block">{t("showPositions")}</span>
            <span className="block text-xs text-muted-foreground">{t("showPositionsText")}</span>
          </span>
        </label>
      </fieldset>
      <Button type="submit" disabled={pending}>{t("save")}</Button>
    </form>
  );
}
