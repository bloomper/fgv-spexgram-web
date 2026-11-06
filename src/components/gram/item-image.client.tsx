"use client";

import * as React from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImageOff, Loader2, Play, TriangleAlert } from "lucide-react";
import type { ItemStatus, ItemType } from "@/gql/graphql";
import { cn } from "@/utils/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  status?: ItemStatus;
  type?: ItemType;
  className?: string;
  /** For the justified grid: fills its box. */
  fill?: boolean;
  loading?: "lazy" | "eager";
  sizes?: string;
  srcSet?: string;
};

/**
 * A thumbnail or preview from the media server. While Immich processes the item, when it failed, and when the image
 * cannot be loaded (e.g. Immich is down), a placeholder says so instead. Videos get a play mark.
 */
export function ItemImage({ src, alt, status = "READY", type = "PHOTO", className, fill, loading = "lazy", sizes, srcSet }: Props) {
  const t = useTranslations("Item");
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = !src || failedSrc === src;

  if (status !== "READY" || broken) {
    const Icon = status === "PROCESSING" ? Loader2 : status === "FAILED" ? TriangleAlert : ImageOff;
    const text = status === "PROCESSING" ? t("processing") : status === "FAILED" ? t("failed") : t("unavailable");

    return (
      <div role="img" aria-label={`${alt} (${text})`}
           className={cn("flex flex-col items-center justify-center gap-1 bg-muted p-2 text-center text-xs text-muted-foreground",
             fill && "h-full w-full", className)}
           data-status={status}>
        <Icon className={cn("size-6", status === "PROCESSING" && "animate-spin")} aria-hidden />
        <span>{text}</span>
      </div>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden bg-muted", fill && "h-full w-full", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed addresses on the media server, never next/image */}
      <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} loading={loading} decoding="async"
           className={cn("block h-full w-full object-cover")}
           onError={() => setFailedSrc(src)} />
      {type === "VIDEO" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="rounded-full bg-black/55 p-2 text-white"><Play className="size-5 fill-current" /></span>
        </span>
      )}
    </span>
  );
}
