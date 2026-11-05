"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Turnstile } from "@/components/gram/turnstile.client";
import { reportAction } from "@/app/(app)/actions.server";
import type { ReportReason } from "@/gql/graphql";
import { track } from "@/utils/umami";

const REASONS: ReportReason[] = ["I_AM_IN_IT", "WRONG_CAPTION_OR_ALBUM", "INAPPROPRIATE", "OTHER"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ReportViewer = {
  /** Visitors give an email address and pass Turnstile. */
  visitor: boolean;
  turnstileSiteKey: string | null;
};

/**
 * Asks why an item should be removed or corrected. Visitors also give an email address for the answer and pass
 * Cloudflare Turnstile; the address stays with the report.
 */
export function ReportDialog({ itemId, open, onOpenChange, viewer }: {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewer: ReportViewer
}) {
  const t = useTranslations("Report");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const [pending, start] = useTransition();
  const emailValid = EMAIL.test(email.trim());
  const ready = reason !== null && (!viewer.visitor || (emailValid && token !== null));

  const reset = () => {
    setReason(null);
    setMessage("");
    setEmail("");
    setToken(null);
    setTurnstileFailed(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemId || !reason || !ready) {
      return;
    }
    start(async () => {
      const result = await reportAction({
        itemId,
        reason,
        message,
        email: viewer.visitor ? email : undefined,
        turnstileToken: viewer.visitor ? token ?? undefined : undefined,
      });

      if (result.ok) {
        track("item-report", { reason, visitor: viewer.visitor });
        toast.success(reason === "I_AM_IN_IT" ? t("sentHidden") : t("sent"));
        reset();
        onOpenChange(false);
      } else {
        toast.error(result.message);
        setToken(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={next => {
      if (!next) {
        reset();
      }
      onOpenChange(next);
    }}>
      <DialogContent className="sm:max-w-lg">
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("text")}</DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">{t("reason")}</legend>
            {REASONS.map(value => (
              <label key={value} className="flex items-start gap-2 text-sm">
                <input type="radio" name="reason" value={value} checked={reason === value}
                       onChange={() => setReason(value)} className="mt-1 accent-primary" />
                <span>{t(`reasons.${value}`)}</span>
              </label>
            ))}
            {reason === "I_AM_IN_IT" && <p className="text-xs text-muted-foreground">{t("hiddenAtOnce")}</p>}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="report-message">{t("message")}</Label>
            <Textarea id="report-message" value={message} maxLength={2000} onChange={event => setMessage(event.target.value)} />
          </div>
          {viewer.visitor && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="report-email">{t("email")}</Label>
                <Input id="report-email" type="email" autoComplete="email" required value={email}
                       aria-invalid={email.length > 0 && !emailValid}
                       onChange={event => setEmail(event.target.value)} />
                <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
              </div>
              {viewer.turnstileSiteKey ? (
                <Turnstile siteKey={viewer.turnstileSiteKey} onToken={setToken} onError={() => setTurnstileFailed(true)} />
              ) : <p className="text-sm text-destructive">{t("turnstileMissing")}</p>}
              {turnstileFailed && <p className="text-sm text-destructive" role="alert">{t("turnstileFailed")}</p>}
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={!ready || pending}>{t("send")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
