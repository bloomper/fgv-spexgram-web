"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { Download, ExternalLink, Flag, HardDriveDownload } from "lucide-react";
import { ReportDialog, type ReportViewer } from "@/components/gram/report-dialog.client";
import { altText, downloadName, type GalleryItem, isShowable } from "@/utils/gram";
import { formatDay } from "@/utils/format";
import { track } from "@/utils/umami";
import { downloadFile } from "@/components/gram/download.client";

export type ViewerOptions = {
  canDownloadOriginals: boolean;
  report: ReportViewer;
  /** The album's title, for items without a caption. */
  albumTitle?: string | null;
};

/** A button in the lightbox's toolbar, styled as its own. */
function ToolbarButton({ label, icon: Icon, onClick }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) {
  return (
    <button type="button" className="yarl__button" aria-label={label} title={label} onClick={onClick}>
      <Icon className="yarl__icon" />
    </button>
  );
}

/**
 * The lightbox: the items large, by swipe, arrow keys or buttons, zoom on photos, videos in the page (Immich's
 * browser version through its signed address), and a slideshow. The toolbar downloads the preview (and the original
 * when allowed), reports the item and opens its own page.
 */
export function ItemViewer({ items, index, onIndexChange, onClose, options }: {
  items: GalleryItem[];
  /** The open item's index in `items`, or null when closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  options: ViewerOptions
}) {
  const t = useTranslations("Viewer");
  const locale = useLocale();
  const [reportItem, setReportItem] = useState<string | null>(null);
  const shown = useMemo(() => items.filter(isShowable), [items]);
  const current = index === null ? null : items[index] ?? null;
  const slideIndex = current ? Math.max(0, shown.findIndex(item => item.id === current.id)) : 0;

  const slides: Slide[] = useMemo(() => shown.map((item): Slide => {
    const media = item.media!;
    const alt = altText(item, locale, options.albumTitle);
    const description = [item.photographer, formatDay(item.takenAt, locale)].filter(Boolean).join(" · ");

    if (item.type === "VIDEO" && media.videoUrl) {
      return {
        type: "video",
        poster: media.previewUrl,
        width: item.width ?? undefined,
        height: item.height ?? undefined,
        controls: true,
        playsInline: true,
        preload: "metadata",
        sources: [{ src: media.videoUrl, type: "video/mp4" }],
        title: item.caption ?? undefined,
        description: description || undefined,
      };
    }
    return {
      src: media.previewUrl,
      alt,
      width: item.width ?? undefined,
      height: item.height ?? undefined,
      srcSet: item.width && item.height ? [
        { src: media.thumbnailUrl, width: 250, height: Math.round(250 * item.height / item.width) },
        { src: media.previewUrl, width: Math.min(1440, item.width), height: Math.round(Math.min(1440, item.width) * item.height / item.width) },
      ] : undefined,
      title: item.caption ?? undefined,
      description: description || undefined,
    };
  }), [shown, locale, options.albumTitle]);

  const toItemsIndex = (slide: number) => items.findIndex(item => item.id === shown[slide]?.id);

  // A video is downloaded only as its original, when originals may be (spec 5.1); playing uses the browser version
  const buttons = current ? [
    ...(current.type === "PHOTO" && current.media ? [
      <ToolbarButton key="download" label={t("downloadPreview")} icon={Download}
                     onClick={() => {
                       track("item-download", { original: false });
                       void downloadFile(current.media!.previewUrl, downloadName(current, "preview"));
                     }} />,
    ] : []),
    ...(options.canDownloadOriginals && current.media?.originalUrl ? [
      <ToolbarButton key="original" label={t("downloadOriginal")} icon={HardDriveDownload}
                     onClick={() => {
                       track("item-download", { original: true });
                       void downloadFile(current.media!.originalUrl!, current.originalFileName ?? downloadName(current, "original"));
                     }} />,
    ] : []),
    <ToolbarButton key="report" label={t("report")} icon={Flag}
                   onClick={() => {
                  setReportItem(current.id);
                  onClose();
                }} />,
    <a key="page" href={`/items/${current.id}`} className="yarl__button" aria-label={t("openPage")} title={t("openPage")}>
      <ExternalLink aria-hidden className="yarl__icon" />
    </a>,
    "slideshow",
    "fullscreen",
    "zoom",
    "close",
  ] : ["close"];

  return (
    <>
      <Lightbox
        open={index !== null && slides.length > 0}
        index={slideIndex}
        close={onClose}
        slides={slides}
        plugins={[Captions, Counter, Fullscreen, Slideshow, Video, Zoom]}
        toolbar={{ buttons }}
        on={{ view: ({ index: viewed }) => {
          const next = toItemsIndex(viewed);

          if (next >= 0 && next !== index) {
            onIndexChange(next);
          }
        } }}
        carousel={{ finite: false, preload: 2 }}
        captions={{ descriptionTextAlign: "center", descriptionMaxLines: 3 }}
        counter={{ container: { style: { top: "unset", bottom: 0 } } }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        slideshow={{ delay: 4000 }}
        video={{ autoPlay: false }}
        labels={{
          Previous: t("previous"),
          Next: t("next"),
          Close: t("close"),
          Lightbox: t("lightbox"),
          Carousel: t("carousel"),
          Slide: t("slide"),
          "Photo gallery": t("gallery"),
          // The lightbox substitutes {index} and {total} itself, so the template must not be formatted here.
          "{index} of {total}": t.raw("indexOfTotal") as string,
          "Zoom in": t("zoomIn"),
          "Zoom out": t("zoomOut"),
          Play: t("play"),
          Pause: t("pause"),
          "Enter Fullscreen": t("fullscreen"),
          "Exit Fullscreen": t("exitFullscreen"),
        }}
      />
      <ReportDialog itemId={reportItem} open={reportItem !== null} onOpenChange={open => !open && setReportItem(null)}
                    viewer={options.report} />
    </>
  );
}
