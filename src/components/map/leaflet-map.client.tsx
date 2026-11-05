"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const SWEDEN: L.LatLngTuple = [62.0, 15.0];
const INITIAL_ZOOM = 5;
const MAX_ZOOM = 19;

export type MapPoint = { id: string; latitude: number; longitude: number; label: string };

type LeafletMapProps = {
  points: MapPoint[];
  /** The items of a marker or a cluster, nearest first. */
  onOpen: (ids: string[]) => void;
  attribution: string;
  clusterLabel: (count: number) => string;
};

const markerIcon = L.divIcon({
  className: "",
  html: "<span class=\"block h-3.5 w-3.5 rounded-full border-2 border-white bg-primary shadow\"></span>",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/**
 * An OpenStreetMap map with clustered markers, the same component and tiles as Spexregister's map of spexare.
 * Clicking a marker opens its item, clicking a cluster its items. The first set of markers fits the view.
 */
export default function LeafletMap({ points, onOpen, attribution, clusterLabel }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const fittedRef = useRef(false);
  const onOpenRef = useRef(onOpen);
  const clusterLabelRef = useRef(clusterLabel);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onOpenRef.current = onOpen;
    clusterLabelRef.current = clusterLabel;
  }, [onOpen, clusterLabel]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    let cancelled = false;
    const map = L.map(containerRef.current, { center: SWEDEN, zoom: INITIAL_ZOOM, maxZoom: MAX_ZOOM });

    L.tileLayer(TILE_URL, {
      maxZoom: MAX_ZOOM,
      attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">${attribution}</a>`,
    }).addTo(map);
    mapRef.current = map;

    (window as unknown as { L: typeof L }).L = L;
    import("leaflet.markercluster").then(() => {
      if (cancelled) {
        return;
      }
      const cluster = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
      });

      cluster.on("clusterclick", event => {
        const ids = (event as unknown as { layer: L.MarkerCluster }).layer.getAllChildMarkers()
          .map(marker => (marker.options as { itemId?: string }).itemId)
          .filter((id): id is string => Boolean(id));

        onOpenRef.current(ids.slice(0, 200));
      });
      cluster.on("clustermouseover", event => {
        const layer = (event as unknown as { layer: L.MarkerCluster }).layer;

        layer.getElement()?.setAttribute("aria-label", clusterLabelRef.current(layer.getChildCount()));
      });
      map.addLayer(cluster);
      clusterRef.current = cluster;
      setReady(true);
    });

    return () => {
      cancelled = true;
      clusterRef.current = null;
      mapRef.current = null;
      fittedRef.current = false;
      setReady(false);
      map.remove();
    };
  }, [attribution]);

  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;

    if (!ready || !cluster || !map) {
      return;
    }
    cluster.clearLayers();
    cluster.addLayers(points.map(point => L.marker([point.latitude, point.longitude], {
      icon: markerIcon,
      keyboard: true,
      title: point.label,
      itemId: point.id,
    } as L.MarkerOptions)
      .on("click", () => onOpenRef.current([point.id]))));

    if (!fittedRef.current && points.length > 0) {
      map.fitBounds(cluster.getBounds(), { padding: [24, 24], maxZoom: 14 });
      fittedRef.current = true;
    }
  }, [ready, points]);

  return <div ref={containerRef} className="isolate h-[70vh] w-full rounded-md border" data-testid="item-map" />;
}
