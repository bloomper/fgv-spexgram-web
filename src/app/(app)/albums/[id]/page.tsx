import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Download, ImagePlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Gallery } from "@/components/gram/gallery.client";
import { VisibilityBadge } from "@/components/gram/visibility-badge";
import { LoginPrompt } from "@/components/login-prompt.client";
import { DataEmpty } from "@/components/data-empty";
import { getAlbum, getAlbumMeta } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { privateMetadata, publicMetadata } from "@/lib/gram/metadata.server";
import { formatPeriod, kindName } from "@/utils/format";
import { ID } from "@/utils/ids";

const PAGE_SIZE = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const album = ID.test(id) ? await getAlbumMeta(id).catch(() => null) : null;

  if (!album || album.visibility !== "PUBLIC") {
    return privateMetadata();
  }

  const locale = await getLocale();
  const cover = album.cover?.effectiveVisibility === "PUBLIC" && album.cover.media ? album.cover : null;

  return publicMetadata({
    title: album.title,
    description: album.description ?? formatPeriod(album.dateFrom, null, locale),
    image: cover ? { url: cover.media!.previewUrl, alt: cover.caption ?? album.title } : null,
  });
}

/**
 * An album: its title, date, place, kind, spex and description, and its items in a justified grid that loads as the
 * viewer scrolls. Something the viewer may not see shows the login prompt, whether it exists or not.
 */
export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  const data = ID.test(id) ? await getAlbum(id, PAGE_SIZE) : null;
  const album = data?.album;

  if (!album) {
    if (viewer.member) {
      notFound();
    }
    return <LoginPrompt noAccess={viewer.loggedIn} />;
  }

  const t = await getTranslations("Album");
  const locale = await getLocale();
  const period = formatPeriod(album.dateFrom, album.dateTo, locale);
  const canContribute = viewer.member && album.visibility !== "UNPUBLISHED";
  const canZip = data?.limits.canDownloadOriginals && album.itemCount > 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-3">
        <nav aria-label={t("breadcrumb")} className="text-sm text-muted-foreground">
          <Link href="/albums" className="hover:text-primary">{t("albums")}</Link>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{album.title}</h1>
            <p className="text-sm text-muted-foreground">
              {[period, album.place, kindName(album.kind, locale), t("itemCount", { count: album.itemCount })].filter(Boolean).join(" · ")}
            </p>
            {album.spex.length > 0 && (
              <p className="text-sm">
                {album.spex.map((spex, index) => (
                  <span key={spex.id}>
                    {index > 0 && ", "}
                    <Link href={`/spex/${spex.familyId}`} className="text-primary hover:text-primary/80">
                      {[spex.title, spex.year].filter(Boolean).join(" ")}
                    </Link>
                    {spex.revival && <span className="text-muted-foreground"> ({t("revival")})</span>}
                    {spex.categoryName && <span className="text-muted-foreground"> · {spex.categoryName}</span>}
                  </span>
                ))}
              </p>
            )}
            {(viewer.editor || (viewer.member && album.visibility === "PUBLIC")) && <VisibilityBadge visibility={album.visibility} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {canContribute && (
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/albums/${album.id}/contribute`} />}>
                <ImagePlus /> {t("contribute")}
              </Button>
            )}
            {canZip && (
              <Button variant="outline" size="sm" nativeButton={false}
                      render={<a href={`/api/albums/${album.id}/zip`} download />}>
                <Download /> {t("zip")}
              </Button>
            )}
            {viewer.editor && (
              <Button size="sm" nativeButton={false} render={<Link href={`/manage/albums/${album.id}`} />}>
                <Pencil /> {t("edit")}
              </Button>
            )}
          </div>
        </div>
        {album.description && <p className="max-w-4xl whitespace-pre-line text-pretty">{album.description}</p>}
      </header>

      {album.items.items.length > 0 ? (
        <Gallery items={album.items.items} albumId={album.id} totalCount={album.items.totalCount} pageSize={PAGE_SIZE}
                 options={{ canDownloadOriginals: data?.limits.canDownloadOriginals ?? false, report: viewer.report, albumTitle: album.title }} />
      ) : <DataEmpty title={t("empty")} description={canContribute ? t("emptyContribute") : t("emptyText")} />}

    </div>
  );
}
