"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { KansrijkPerceel } from "@/types";

interface Props {
  percelen: KansrijkPerceel[];
  geselecteerdId: string | null;
  onSelect: (id: string) => void;
}

function kleurVoorScore(score: number): { bg: string; tekst: string } {
  if (score >= 70) return { bg: "#d0f0da", tekst: "#0e4620" };
  if (score >= 50) return { bg: "#fdefc3", tekst: "#5c3f00" };
  return { bg: "#ffd7d9", tekst: "#750e13" };
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
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [mapReady, setMapReady] = useState(false);

  // Eenmalige kaart-initialisatie
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
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

      leafletRef.current = L;
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Markers bijwerken bij wijziging percelen of selectie
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    // Verwijder bestaande markers
    markersRef.current.forEach((m) => m.remove());
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

      marker.addTo(map);
      markersRef.current.set(p.id, marker);
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
