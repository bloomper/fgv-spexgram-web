import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlbumGrid } from "@/components/gram/album-card";
import { LoginPrompt } from "@/components/login-prompt.client";
import { getSpexAlbums } from "@/lib/gram/gram.server";
import { getViewer } from "@/lib/gram/viewer.server";
import { privateMetadata, publicMetadata } from "@/lib/gram/metadata.server";
import { ID } from "@/utils/ids";

type Props = { params: Promise<{ id: string }> };

type Albums = Awaited<ReturnType<typeof getSpexAlbums>>;

/** The spex the page is about, as the albums carry it. */
function spexOf(albums: Albums, id: string) {
  const all = albums.flatMap(album => album.spex);

  return all.find(spex => spex.id === id) ?? all.find(spex => spex.familyId === id) ?? null;
}

const nameOf = (spex: { title?: string | null; year?: number | null } | null) =>
  spex ? [spex.title, spex.year].filter(Boolean).join(" ") : "";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const albums = ID.test(id) ? await getSpexAlbums(id).catch(() => []) : [];
  // Built from public albums and public covers only: a member's page view must not put a members' photo in the tags
  const publicAlbums = albums.filter(album => album.visibility === "PUBLIC");

  if (publicAlbums.length === 0) {
    return privateMetadata();
  }

  const cover = publicAlbums.map(album => album.cover).find(candidate => candidate?.effectiveVisibility === "PUBLIC" && candidate.media);
  const title = nameOf(spexOf(publicAlbums, id));

  return publicMetadata({
    title: title || "Spexgram",
    image: cover?.media ? { url: cover.media.previewUrl, alt: title } : null,
  });
}

/**
 * Every album of a spex and its revivals, oldest first, that the viewer may see.
 */
export default async function SpexPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  const albums = ID.test(id) ? await getSpexAlbums(id) : [];

  if (albums.length === 0) {
    if (viewer.member) {
      notFound();
    }
    return <LoginPrompt noAccess={viewer.loggedIn} />;
  }

  const t = await getTranslations("Spex");
  const spex = spexOf(albums, id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{nameOf(spex) || t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {[spex?.categoryName, spex?.revival ? t("revival") : null, t("albumCount", { count: albums.length })].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm text-muted-foreground">{t("text")}</p>
      </div>
      <AlbumGrid albums={albums} showVisibility={viewer.editor} />
    </div>
  );
}
