"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { GalleryItem } from "@/utils/gram";
import { formatDay } from "@/utils/format";
import { tileOf } from "@/utils/timeline";

const ZOOM = 15;

/**
 * The place on a small map: one OpenStreetMap tile with a mark, without a map library, linking to the map there.
 */
function SmallMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const tile = tileOf(latitude, longitude, ZOOM);

  return (
    <a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${ZOOM}/${latitude}/${longitude}`}
       target="_blank" rel="noopener noreferrer" className="relative block size-64 max-w-full overflow-hidden rounded-md border"
       aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a map tile, not a photo */}
      <img src={`https://tile.openstreetmap.org/${ZOOM}/${tile.x}/${tile.y}.png`} alt="" width={256} height={256} loading="lazy"
           className="block size-64 max-w-none" />
      <span className="absolute size-3.5 -translate-1/2 rounded-full border-2 border-white bg-primary shadow"
            style={{ left: tile.left, top: tile.top }} aria-hidden />
    </a>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wide text-white/60">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/**
 * Beside the item in the viewer: when it was taken, its album and spex, caption and photographer, the place on a small
 * map for members (the server sends no position to visitors), and the uploader and file for editors.
 */
export function InfoPanel({ item, member, editor, onClose }: { item: GalleryItem; member: boolean; editor: boolean; onClose: () => void }) {
  const t = useTranslations("Viewer");
  const locale = useLocale();
  const taken = formatDay(item.takenAt, locale);
  const time = item.takenAt?.slice(11, 16);
  const spex = item.album?.spex ?? [];

  return (
    <aside aria-label={t("info")}
           className="absolute inset-y-0 right-0 z-10 flex w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-black/85 p-4 pt-16 text-white backdrop-blur"
           onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("info")}</h2>
        <button type="button" onClick={onClose} aria-label={t("closeInfo")} className="rounded p-1 hover:bg-white/10">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <dl className="space-y-3">
        {taken && <Row label={t("taken")}>{taken}{time && time !== "00:00" ? `, ${time}` : ""}</Row>}
        {item.caption && <Row label={t("caption")}>{item.caption}</Row>}
        {item.photographer && <Row label={t("photographer")}>{item.photographer}</Row>}
        {item.album && (
          <Row label={t("album")}>
            <Link href={`/albums/${item.album.id}`} className="underline underline-offset-2 hover:text-white/80">{item.album.title}</Link>
          </Row>
        )}
        {spex.length > 0 && (
          <Row label={t("spex")}>
            <ul>
              {spex.map(entry => (
                <li key={entry.id}>
                  <Link href={`/spex/${entry.id}`} className="underline underline-offset-2 hover:text-white/80">
                    {[entry.title, entry.year].filter(Boolean).join(" ")}
                  </Link>
                </li>
              ))}
            </ul>
          </Row>
        )}
        {editor && item.uploadedBy && <Row label={t("uploadedBy")}>{item.uploadedBy}</Row>}
        {editor && item.originalFileName && <Row label={t("file")}>{item.originalFileName}</Row>}
      </dl>
      {member && item.latitude != null && item.longitude != null && (
        <SmallMap latitude={item.latitude} longitude={item.longitude} label={t("place")} />
      )}
    </aside>
  );
}
