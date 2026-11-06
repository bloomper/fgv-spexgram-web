import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { AlbumCardFieldsFragment } from "@/gql/graphql";
import { ItemImage } from "@/components/gram/item-image.client";
import { VisibilityBadge } from "@/components/gram/visibility-badge";
import { formatPeriod, kindName } from "@/utils/format";

type Props = {
  album: AlbumCardFieldsFragment;
  /** Where the card leads; the album page by default. */
  href?: string;
  /** Show the album's visibility (for members and editors). */
  showVisibility?: boolean;
};

/**
 * An album as a card: its cover, title, date, kind and how many items the viewer may see.
 */
export function AlbumCard({ album, href, showVisibility }: Props) {
  const t = useTranslations("Albums");
  const locale = useLocale();
  const period = formatPeriod(album.dateFrom, album.dateTo, locale);

  return (
    <li className="group">
      <Link href={href ?? `/albums/${album.id}`}
            className="block overflow-hidden rounded-lg border bg-card focus-visible:ring-2 focus-visible:ring-ring">
        <div className="aspect-[4/3]">
          <ItemImage src={album.cover?.media?.thumbnailUrl} srcSet={album.cover?.media
            ? `${album.cover.media.thumbnailUrl} 250w, ${album.cover.media.previewUrl} 1440w` : undefined}
                     sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                     alt="" type={album.cover?.type} fill
                     className="transition-transform group-hover:scale-[1.02]" />
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 font-medium leading-snug">{album.title}</h3>
          <p className="text-xs text-muted-foreground">
            {[period, kindName(album.kind, locale), t("itemCount", { count: album.itemCount })].filter(Boolean).join(" · ")}
          </p>
          {showVisibility && album.visibility !== "MEMBERS" && <VisibilityBadge visibility={album.visibility} />}
        </div>
      </Link>
    </li>
  );
}

export function AlbumGrid({ albums, showVisibility, hrefOf }: {
  albums: AlbumCardFieldsFragment[];
  showVisibility?: boolean;
  hrefOf?: (album: AlbumCardFieldsFragment) => string
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {albums.map(album => <AlbumCard key={album.id} album={album} showVisibility={showVisibility} href={hrefOf?.(album)} />)}
    </ul>
  );
}
