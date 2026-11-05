"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemImage } from "@/components/gram/item-image.client";
import { useDialogs } from "@/components/dialogs.client";
import { reviewContributionsAction, reviewSuggestionAction } from "@/app/(app)/manage/actions.server";
import { altText, type GalleryItem } from "@/utils/gram";
import { formatInstant, formatPeriod } from "@/utils/format";
import { track } from "@/utils/umami";

type Suggestion = {
  id: string;
  title: string;
  suggestedBy?: string | null;
  createdAt: string;
  album?: { id: string; title: string; dateFrom?: string | null; dateTo?: string | null; place?: string | null; description?: string | null } | null;
};

/**
 * Contributions waiting for review, per album, oldest first: accept (as members' items), accept and edit, or reject
 * with an optional message, one by one or the whole album's at once.
 */
export function ContributionReview({ items }: { items: (GalleryItem & { fileSize?: number | null })[] }) {
  const t = useTranslations("Review");
  const locale = useLocale();
  const router = useRouter();
  const dialogs = useDialogs();
  const [pending, start] = useTransition();
  const groups = new Map<string, { title: string; items: typeof items }>();

  for (const item of items) {
    const key = item.album?.id ?? "";
    const group = groups.get(key) ?? { title: item.album?.title ?? t("noAlbum"), items: [] };

    group.items.push(item);
    groups.set(key, group);
  }

  const review = async (ids: string[], accept: boolean, then?: string) => {
    let message: string | null = null;

    if (!accept) {
      if (!await dialogs.confirm({ title: t("rejectTitle", { count: ids.length }), description: t("rejectText"), confirmLabel: t("reject"), destructive: true })) {
        return;
      }
      message = await dialogs.prompt({ title: t("messageTitle"), label: t("message"), confirmLabel: t("send"), maxLength: 2000 });
    }
    start(async () => {
      const result = await reviewContributionsAction(ids, accept, message);

      if (result.ok) {
        track("contribution-review", { accepted: accept, count: ids.length });
        toast.success(accept ? t("accepted", { count: ids.length }) : t("rejected", { count: ids.length }));
        if (then) {
          router.push(then);
        }
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  if (items.length === 0) {
    return <p className="text-muted-foreground">{t("none")}</p>;
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([albumId, group]) => (
        <section key={albumId} className="space-y-2" aria-label={group.title}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">
              {albumId ? <Link href={`/manage/albums/${albumId}`} className="hover:underline">{group.title}</Link> : group.title}
            </h3>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => review(group.items.map(item => item.id), true)}>
              <Check /> {t("acceptAll", { count: group.items.length })}
            </Button>
          </div>
          <ul className="divide-y rounded-lg border">
            {group.items.map(item => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-2" data-testid="review-item">
                <a href={`/items/${item.id}`} className="block size-20 shrink-0 overflow-hidden rounded">
                  <ItemImage src={item.media?.thumbnailUrl} alt={altText(item, locale)} status={item.status} type={item.type} fill />
                </a>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{item.originalFileName ?? altText(item, locale)}</p>
                  <p className="text-xs text-muted-foreground">{[item.uploadedBy, formatInstant(item.createdAt)].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" disabled={pending} onClick={() => review([item.id], true)}><Check /> {t("accept")}</Button>
                  {albumId && (
                    <Button size="sm" variant="outline" disabled={pending}
                            onClick={() => review([item.id], true, `/manage/albums/${albumId}?item=${item.id}`)}>
                      <Pencil /> {t("acceptEdit")}
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" disabled={pending} onClick={() => review([item.id], false)}>
                    <X /> {t("reject")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Members' album suggestions waiting for review: accepting publishes the album for members, rejecting deletes it with
 * its contributions.
 */
export function SuggestionReview({ suggestions }: { suggestions: Suggestion[] }) {
  const t = useTranslations("Review");
  const locale = useLocale();
  const router = useRouter();
  const dialogs = useDialogs();
  const [pending, start] = useTransition();

  const review = async (id: string, accept: boolean) => {
    let message: string | null = null;

    if (!accept) {
      if (!await dialogs.confirm({ title: t("rejectSuggestionTitle"), description: t("rejectSuggestionText"), confirmLabel: t("reject"), destructive: true })) {
        return;
      }
      message = await dialogs.prompt({ title: t("messageTitle"), label: t("message"), confirmLabel: t("send"), maxLength: 2000 });
    }
    start(async () => {
      const result = await reviewSuggestionAction(id, accept, message);

      if (result.ok) {
        toast.success(accept ? t("suggestionAccepted") : t("suggestionRejected"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  if (suggestions.length === 0) {
    return <p className="text-muted-foreground">{t("noSuggestions")}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {suggestions.map(suggestion => (
        <li key={suggestion.id} className="flex flex-wrap items-start gap-3 p-3">
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-medium">
              {suggestion.album ? <Link href={`/manage/albums/${suggestion.album.id}`} className="hover:underline">{suggestion.title}</Link> : suggestion.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {[suggestion.suggestedBy, formatPeriod(suggestion.album?.dateFrom, suggestion.album?.dateTo, locale), suggestion.album?.place, formatInstant(suggestion.createdAt)].filter(Boolean).join(" · ")}
            </p>
            {suggestion.album?.description && <p>{suggestion.album.description}</p>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" disabled={pending} onClick={() => review(suggestion.id, true)}><Check /> {t("accept")}</Button>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => review(suggestion.id, false)}><X /> {t("reject")}</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
