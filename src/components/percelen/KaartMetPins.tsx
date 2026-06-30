"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { KansrijkPerceel } from "@/types";

interface Props {
  percelen: KansrijkPerceel[];
  geselecteerdId: string | null;
  onSelect: (id: string) => void;
}

// Kleur op basis van slagingskans
function kleurVoorScore(score: number): { bg: string; tekst: string } {
  if (score >= 70) return { bg: "#d0f0da", tekst: "#0e4620" };
  if (score >= 50) return { bg: "#fdefc3", tekst: "#5c3f00" };
  return { bg: "#ffd7d9", tekst: "#750e13" };
}

// Dominante kleurklasse in een cluster bepalen
function dominanteKleur(scores: number[]): string {
  const groen = scores.filter((s) => s >= 70).length;
  const geel  = scores.filter((s) => s >= 50 && s < 70).length;
  if (groen >= geel && groen >= scores.length - groen - geel) return "#24a148";
  if (geel >= scores.length - groen - geel) return "#f1c21b";
  return "#da1e28";
}

function chipHtml(p: KansrijkPerceel, geselecteerd: boolean): string {
  const { bg, tekst } = geselecteerd
    ? { bg: "#0f62fe", tekst: "#ffffff" }
    : kleurVoorScore(p.slagingskans);
  const shadow = geselecteerd
    ? "0 4px 16px rgba(15,98,254,0.5), 0 1px 4px rgba(0,0,0,0.2)"
    : "0 4px 14px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12)";
  return `<div style="background:${bg};color:${tekst};border:none;border-radius:1000px;padding:5px 8px;font-size:13px;font-weight:700;font-family:'IBM Plex Sans',sans-serif;white-space:nowrap;box-shadow:${shadow};line-height:1;text-align:center;cursor:pointer;transform:${geselecteerd ? "scale(1.18)" : "scale(1)"};transition:transform 0.15s ease;">${p.slagingskans}%</div>`;
}

export default function KaartMetPins({ percelen, geselecteerdId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const clusterRef = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [mapReady, setMapReady] = useState(false);

  // Eenmalige kaart-initialisatie
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    Promise.all([
      import("leaflet"),
      import("leaflet.markercluster"),
    ]).then(([L]) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      let map: import("leaflet").Map;
      try {
        map = L.map(containerRef.current, { zoomControl: false }).setView([52.25, 5.3], 8);
      } catch {
        return;
      }

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "© Esri, Maxar, Earthstar Geographics", maxZoom: 19 }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Cluster-groep met aangepast cluster-icoon
      const cluster = (L as unknown as { markerClusterGroup: (opts: unknown) => import("leaflet").MarkerClusterGroup }).markerClusterGroup({
        maxClusterRadius: 60,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (c: import("leaflet").MarkerCluster) => {
          const markers = c.getAllChildMarkers();
          const scores = markers.map((m) => {
            const p = percelen.find((x) => x.id === (m as unknown as { _perceelId: string })._perceelId);
            return p?.slagingskans ?? 60;
          });
          const kleur = dominanteKleur(scores);
          const size = Math.min(44, 28 + markers.length * 1.2);
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${kleur};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;font-family:'IBM Plex Sans',sans-serif;">${markers.length}</div>`,
            className: "",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      });

      cluster.addTo(map);
      clusterRef.current = cluster;
      leafletRef.current = L;
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      clusterRef.current = null;
      markersRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Markers bijwerken bij wijziging percelen of selectie
  useEffect(() => {
    const L = leafletRef.current;
    const cluster = clusterRef.current;
    if (!mapReady || !L || !cluster) return;

    cluster.clearLayers();
    markersRef.current.clear();

    percelen.forEach((p) => {
      const geselecteerd = p.id === geselecteerdId;
      const icon = L.divIcon({
        html: chipHtml(p, geselecteerd),
        className: "",
        iconSize: [68, 28],
        iconAnchor: [34, 14],
      });

      const marker = L.marker([p.lat, p.lon], {
        icon,
        zIndexOffset: geselecteerd ? 1000 : 0,
      }).on("click", () => onSelectRef.current(p.id));

      // Bewaar perceel-id op de marker voor de cluster-kleurlogica
      (marker as unknown as { _perceelId: string })._perceelId = p.id;

      markersRef.current.set(p.id, marker);
      cluster.addLayer(marker);
    });
  }, [mapReady, percelen, geselecteerdId]);

  // Pan naar geselecteerd perceel
  useEffect(() => {
    if (!geselecteerdId || !mapRef.current) return;
    const p = percelen.find((x) => x.id === geselecteerdId);
    if (p) mapRef.current.setView([p.lat, p.lon], 14, { animate: true });
  }, [geselecteerdId, percelen]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
