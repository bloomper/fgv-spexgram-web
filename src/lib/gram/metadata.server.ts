import "server-only";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Metadata for a page that shows something only some may see: never indexed, and without Open Graph tags, so that a
 * link shared elsewhere tells nothing about it.
 */
export async function privateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");

  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Metadata for a public album or item: indexable, with Open Graph tags whose image is a preview (which carries no
 * metadata). The signed preview address runs out after some hours; crawlers fetch it when the link is shared.
 */
export function publicMetadata({ title, description, image, type = "website" }: {
  title: string;
  description?: string | null;
  image?: { url: string; width?: number | null; height?: number | null; alt: string } | null;
  type?: "website" | "article"
}): Metadata {
  return {
    title: `${title} – Spexgram`,
    description: description ?? undefined,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: description ?? undefined,
      type,
      siteName: "Spexgram",
      images: image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: description ?? undefined },
  };
}
