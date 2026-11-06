"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Flag, HardDriveDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemImage } from "@/components/gram/item-image.client";
import { ReportDialog, type ReportViewer } from "@/components/gram/report-dialog.client";
import { downloadFile } from "@/components/gram/download.client";
import { renewItemsAction } from "@/app/(app)/actions.server";
import { useServerState } from "@/hooks/use-server-state.client";
import { altText, downloadName, type GalleryItem, isShowable } from "@/utils/gram";
import { track } from "@/utils/umami";

/**
 * One item large on its own page: the photo, or the video playing in the page from its signed address. When the
 * address has run out (the page was left open for hours), loading fails and the item asks once for a new one, without
 * rendering the page again.
 */
export function ItemView({ item: initial, canDownloadOriginals, report }: {
  item: GalleryItem;
  canDownloadOriginals: boolean;
  report: ReportViewer
}) {
  const t = useTranslations("Viewer");
  const locale = useLocale();
  const [item, setItem] = useServerState(initial, value => value.id);
  const [reporting, setReporting] = useState(false);
  const renewed = useRef(false);
  const alt = altText(item, locale);

  const renew = async () => {
    if (renewed.current) {
      return;
    }
    renewed.current = true;

    const result = await renewItemsAction([item.id]);

    if (result.ok && result.data[0]) {
      setItem(result.data[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex max-h-[80vh] justify-center overflow-hidden rounded-lg bg-black">
        {isShowable(item) && item.type === "VIDEO" && item.media?.videoUrl ? (
          <video key={item.media.videoUrl} controls playsInline preload="metadata" poster={item.media.previewUrl}
                 className="max-h-[80vh] w-full" aria-label={alt} onError={() => void renew()} data-testid="item-video">
            <source src={item.media.videoUrl} type="video/mp4" />
          </video>
        ) : isShowable(item) && item.media ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed addresses on the media server, never next/image
          <img src={item.media.previewUrl} alt={alt} className="max-h-[80vh] w-auto object-contain"
               onError={() => void renew()} data-testid="item-photo" />
        ) : (
          <ItemImage src={null} alt={alt} status={item.status} className="aspect-[4/3] w-full max-w-xl" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {item.media && item.type === "PHOTO" && (
          <Button variant="outline" size="sm" onClick={() => {
            track("item-download", { original: false });
            void downloadFile(item.media!.previewUrl, downloadName(item, "preview"));
          }}>
            <Download /> {t("downloadPreview")}
          </Button>
        )}
        {canDownloadOriginals && item.media?.originalUrl && (
          <Button variant="outline" size="sm" onClick={() => {
            track("item-download", { original: true });
            void downloadFile(item.media!.originalUrl!, item.originalFileName ?? downloadName(item, "original"));
          }}>
            <HardDriveDownload /> {t("downloadOriginal")}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setReporting(true)}>
          <Flag /> {t("report")}
        </Button>
      </div>
      <ReportDialog itemId={item.id} open={reporting} onOpenChange={setReporting} viewer={report} />
    </div>
  );
}
