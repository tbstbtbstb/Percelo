"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { KansrijkPerceel } from "@/types";

interface Props {
  percelen: KansrijkPerceel[];
  geselecteerdId: string | null;
  onSelect: (id: string) => void;
}

function kleurVoorScore(score: number): { bg: string; tekst: string; fill: string; stroke: string } {
  if (score >= 70) return { bg: "#d0f0da", tekst: "#0e4620", fill: "#24a148", stroke: "#145a32" };
  if (score >= 50) return { bg: "#fdefc3", tekst: "#5c3f00", fill: "#f1c21b", stroke: "#8a6914" };
  return { bg: "#ffd7d9", tekst: "#750e13", fill: "#da1e28", stroke: "#750e13" };
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

async function fetchPerceelPolygon(lat: number, lon: number): Promise<GeoJSON.FeatureCollection | null> {
  const d = 0.0008;
  // WFS 2.0 met EPSG:4326: bbox in lat/lon volgorde (niet lon/lat)
  const bbox = `${lat - d},${lon - d},${lat + d},${lon + d},EPSG:4326`;
  const url = `https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0?service=WFS&version=2.0.0&request=GetFeature&typeName=kadastralekaart:Perceel&outputFormat=application/json&srsName=EPSG:4326&count=5&bbox=${bbox}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features?.length) return null;
    // Kies het perceel waarvan het middelpunt het dichtst bij de seed-coördinaat ligt
    const best = data.features.reduce((prev: GeoJSON.Feature, cur: GeoJSON.Feature) => {
      const dist = (f: GeoJSON.Feature) => {
        const coords = (f.geometry as GeoJSON.Polygon).coordinates[0];
        const cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        const cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        return Math.hypot(cx - lon, cy - lat);
      };
      return dist(cur) < dist(prev) ? cur : prev;
    });
    return { type: "FeatureCollection", features: [best] };
  } catch {
    return null;
  }
}

export default function KaartMetPins({ percelen, geselecteerdId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const polygonLayersRef = useRef<Map<string, import("leaflet").GeoJSON>>(new Map());
  const polygonCacheRef = useRef<Map<string, GeoJSON.FeatureCollection | null>>(new Map());
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
      polygonLayersRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polygonen laden en tekenen
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    // Verwijder bestaande polygonen
    polygonLayersRef.current.forEach((layer) => layer.remove());
    polygonLayersRef.current.clear();

    percelen.forEach((p) => {
      const cacheKey = `${p.lat},${p.lon}`;
      const geselecteerd = p.id === geselecteerdId;
      const { fill, stroke } = kleurVoorScore(p.slagingskans);

      const tekenPolygon = (geojson: GeoJSON.FeatureCollection | null) => {
        if (!geojson || !mapRef.current || !leafletRef.current) return;
        const L2 = leafletRef.current;
        const layer = L2.geoJSON(geojson, {
          style: {
            color: geselecteerd ? "#0f62fe" : "#ffffff",
            weight: geselecteerd ? 3 : 2,
            fillColor: geselecteerd ? "#0f62fe" : fill,
            fillOpacity: geselecteerd ? 0.3 : 0.12,
            dashArray: geselecteerd ? undefined : "5 4",
            opacity: 0.9,
          },
        }).on("click", () => onSelectRef.current(p.id));
        layer.addTo(mapRef.current);
        polygonLayersRef.current.set(p.id, layer);
      };

      if (polygonCacheRef.current.has(cacheKey)) {
        tekenPolygon(polygonCacheRef.current.get(cacheKey)!);
      } else {
        fetchPerceelPolygon(p.lat, p.lon).then((geojson) => {
          polygonCacheRef.current.set(cacheKey, geojson);
          tekenPolygon(geojson);
        });
      }
    });
  }, [mapReady, percelen, geselecteerdId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Markers bijwerken bij wijziging percelen of selectie
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

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
    if (p) mapRef.current.setView([p.lat, p.lon], 17, { animate: true });
  }, [geselecteerdId, percelen]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
