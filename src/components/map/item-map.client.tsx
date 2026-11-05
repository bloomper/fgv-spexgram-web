"use client";

import { useCallback, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataEmpty } from "@/components/data-empty";
import { ItemViewer, type ViewerOptions } from "@/components/gram/viewer.client";
import { renewItemsAction } from "@/app/(app)/actions.server";
import type { MapPoint } from "@/components/map/leaflet-map.client";
import type { GalleryItem } from "@/utils/gram";
import { formatDay } from "@/utils/format";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map.client"), {
  ssr: false,
  loading: () => <Skeleton className="h-[70vh] w-full" />,
});

type MapItem = { id: string; latitude: number; longitude: number; takenAt?: string | null };

/**
 * Items with a position on a map, clustered; a marker or a cluster opens its items in the viewer.
 */
export function ItemMap({ items, options }: { items: MapItem[]; options: ViewerOptions }) {
  const t = useTranslations("Map");
  const locale = useLocale();
  const [open, setOpen] = useState<GalleryItem[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [, start] = useTransition();
  const points: MapPoint[] = items.map(item => ({
    id: item.id,
    latitude: item.latitude,
    longitude: item.longitude,
    label: formatDay(item.takenAt, locale) ?? t("item"),
  }));

  const onOpen = useCallback((ids: string[]) => start(async () => {
    const result = await renewItemsAction(ids);

    if (result.ok && result.data.length > 0) {
      setOpen(result.data);
      setIndex(0);
    } else if (!result.ok) {
      toast.error(result.message);
    }
  }), []);

  if (items.length === 0) {
    return <DataEmpty title={t("emptyTitle")} description={t("emptyDescription")} icon={MapPin} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("count", { count: items.length })}</p>
      <LeafletMap points={points} onOpen={onOpen} attribution={t("attribution")}
                  clusterLabel={count => t("cluster", { count })} />
      <ItemViewer items={open} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} options={options} />
    </div>
  );
}
