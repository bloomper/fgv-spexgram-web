import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemView } from "@/components/gram/item-view.client";
import { VisibilityBadge } from "@/components/gram/visibility-badge";
import { LoginPrompt } from "@/components/login-prompt.client";
import { getItem } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { privateMetadata, publicMetadata } from "@/lib/gram/metadata.server";
import { formatDay, formatDurationMs } from "@/utils/format";
import { altText } from "@/utils/gram";
import { ID } from "@/utils/ids";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = ID.test(id) ? (await getItem(id).catch(() => null))?.item : null;

  if (!item || item.effectiveVisibility !== "PUBLIC") {
    return privateMetadata();
  }

  const locale = await getLocale();
  const alt = altText(item, locale);

  return publicMetadata({
    title: alt,
    description: [item.photographer, formatDay(item.takenAt, locale)].filter(Boolean).join(" · ") || null,
    image: item.media ? { url: item.media.previewUrl, width: item.width, height: item.height, alt } : null,
    type: "article",
  });
}

/**
 * An item's own, stable page, linked to from anywhere. A public item in an album for members is shown to visitors
 * without the album, which they may not see.
 */
export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  const data = ID.test(id) ? await getItem(id) : null;
  const item = data?.item;

  if (!item) {
    if (viewer.member) {
      notFound();
    }
    return <LoginPrompt noAccess={viewer.loggedIn} />;
  }

  const t = await getTranslations("ItemPage");
  const locale = await getLocale();
  const duration = formatDurationMs(item.durationMs);

  return (
    <div className="mx-auto w-full max-w-5xl flex flex-1 flex-col gap-4 p-4 md:p-8">
      {item.album && (
        <nav aria-label={t("breadcrumb")} className="text-sm text-muted-foreground">
          <Link href={`/albums/${item.album.id}`} className="hover:text-primary" data-testid="item-album-link">
            {t("inAlbum", { album: item.album.title })}
          </Link>
        </nav>
      )}
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{altText(item, locale)}</h1>
      <ItemView item={item} canDownloadOriginals={data?.limits.canDownloadOriginals ?? false} report={viewer.report} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {item.photographer && <><dt className="text-muted-foreground">{t("photographer")}</dt><dd>{item.photographer}</dd></>}
        {item.takenAt && <><dt className="text-muted-foreground">{t("taken")}</dt><dd>{formatDay(item.takenAt, locale)}</dd></>}
        {duration && <><dt className="text-muted-foreground">{t("length")}</dt><dd>{duration}</dd></>}
        {item.width && item.height && <><dt className="text-muted-foreground">{t("size")}</dt><dd>{item.width} × {item.height}</dd></>}
        {viewer.editor && item.uploadedBy && <><dt className="text-muted-foreground">{t("uploadedBy")}</dt><dd>{item.uploadedBy}</dd></>}
        {item.latitude !== null && item.longitude !== null && viewer.member && (
          <><dt className="text-muted-foreground">{t("position")}</dt><dd>
            <Link href={`/map?item=${item.id}`} className="text-primary hover:text-primary/80">
              {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
            </Link>
          </dd></>
        )}
      </dl>
      {(viewer.editor || (viewer.member && item.effectiveVisibility === "PUBLIC")) && (
        <div className="flex flex-wrap items-center gap-2">
          <VisibilityBadge visibility={item.effectiveVisibility} />
          {viewer.editor && item.album && (
            <Button variant="outline" size="sm" nativeButton={false}
                    render={<Link href={`/manage/albums/${item.album.id}?item=${item.id}`} />}>
              <Pencil /> {t("edit")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
