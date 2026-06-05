"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Perceel } from "@/types";

interface Props {
  onPerceelGeselecteerd: (perceel: Perceel) => void;
  beginLat?: number;
  beginLon?: number;
  flyTo?: { lat: number; lon: number; zoom?: number } | null;
}

const LAGEN = {
  satelliet: {
    label: "Satelliet",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 19,
    maxZoom: 21,
  },
  kaart: {
    label: "Kaart",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    maxNativeZoom: 19,
    maxZoom: 21,
  },
} as const;

type LaagNaam = keyof typeof LAGEN;

export default function KadastraleKaartPicker({ onPerceelGeselecteerd, beginLat, beginLon, flyTo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const basisLaagRef = useRef<import("leaflet").TileLayer | null>(null);
  const perceelLaagRef = useRef<import("leaflet").GeoJSON | null>(null);
  const [laden, setLaden] = useState(false);
  const [zoom, setZoom] = useState(beginLat ? 15 : 9);
  const [actieveLaag, setActieveLaag] = useState<LaagNaam>("satelliet");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      const startView: [number, number] = beginLat && beginLon
        ? [beginLat, beginLon]
        : [52.15, 5.38];
      const startZoom = beginLat ? 15 : 9;

      const map = L.map(containerRef.current!, { zoomControl: false }).setView(startView, startZoom);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Satelliet als standaard basislaag
      const sat = LAGEN.satelliet;
      basisLaagRef.current = L.tileLayer(sat.url, {
        attribution: sat.attribution,
        maxNativeZoom: sat.maxNativeZoom,
        maxZoom: sat.maxZoom,
      }).addTo(map);

      // PDOK Kadastrale Kaart WMS — perceelgrenzen altijd bovenop
      L.tileLayer.wms("https://service.pdok.nl/kadaster/kadastralekaart/wms/v5_0", {
        layers: "Perceel",
        format: "image/png",
        transparent: true,
        opacity: 0.8,
        attribution: "© Kadaster",
        maxZoom: 21,
        zIndex: 10,
      } as Parameters<typeof L.tileLayer.wms>[1]).addTo(map);

      map.on("zoomend", () => setZoom(map.getZoom()));

      map.on("click", async (e) => {
        const currentZoom = map.getZoom();
        if (currentZoom < 14) {
          map.flyTo(e.latlng, 15, { duration: 0.8 });
          return;
        }

        setLaden(true);
        const { lat, lng } = e.latlng;

        try {
          const res = await fetch(`/api/perceel-info?lat=${lat}&lon=${lng}`);
          const data = await res.json();

          if (!data.gevonden) return;

          // Highlight het aangeklikte perceel
          if (perceelLaagRef.current) map.removeLayer(perceelLaagRef.current);
          if (data.geometry) {
            const feature = { type: "Feature" as const, geometry: data.geometry, properties: {} };
            const laag = L.geoJSON(feature, {
              style: { color: "#0f62fe", weight: 2.5, fillColor: "#0f62fe", fillOpacity: 0.2 },
            }).addTo(map);
            perceelLaagRef.current = laag;
            map.fitBounds(laag.getBounds(), { padding: [80, 80], maxZoom: 20 });
          }

          // Direct doorgeven aan de parent — geen tussenstap via balk
          const kadastralAanduiding = `${data.akrCode ?? ""}-${data.sectie ?? ""}-${data.perceelnummer ?? 0}`;
          onPerceelGeselecteerd({
            adres: kadastralAanduiding,
            lat: data.lat,
            lon: data.lon,
            gemeente: data.gemeente,
            provincie: data.provincie,
            perceelOppervlakte: data.oppervlakte,
            kadastralAanduiding,
          });
        } catch (err) {
          console.error("[KadastraleKaartPicker]", err);
        } finally {
          setLaden(false);
        }
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vlieg naar locatie + arceer perceel wanneer flyTo prop wijzigt (bijv. na adresselectie)
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    const map = mapRef.current;
    map.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom ?? 17, { duration: 1.2 });

    // Na de animatie: WFS-lookup + highlight + fitBounds op het perceel
    const timeout = setTimeout(async () => {
      if (!mapRef.current) return;
      try {
        const res = await fetch(`/api/perceel-info?lat=${flyTo.lat}&lon=${flyTo.lon}`);
        const data = await res.json();
        if (!data.gevonden || !data.geometry) return;

        import("leaflet").then((L) => {
          if (!mapRef.current) return;
          if (perceelLaagRef.current) mapRef.current.removeLayer(perceelLaagRef.current);
          const feature = { type: "Feature" as const, geometry: data.geometry, properties: {} };
          const laag = L.geoJSON(feature, {
            style: { color: "#0f62fe", weight: 2.5, fillColor: "#0f62fe", fillOpacity: 0.2 },
          }).addTo(mapRef.current);
          perceelLaagRef.current = laag;
          mapRef.current.fitBounds(laag.getBounds(), { padding: [80, 80], maxZoom: 20 });
        });
      } catch { /* geen highlight — geen bezwaar */ }
    }, 1400); // wacht tot flyTo-animatie klaar is

    return () => clearTimeout(timeout);
  }, [flyTo]);

  function wisselLaag(naam: LaagNaam) {
    if (!mapRef.current || !basisLaagRef.current || naam === actieveLaag) return;
    import("leaflet").then((L) => {
      mapRef.current!.removeLayer(basisLaagRef.current!);
      const laag = LAGEN[naam];
      basisLaagRef.current = L.tileLayer(laag.url, {
        attribution: laag.attribution,
        maxNativeZoom: laag.maxNativeZoom,
        maxZoom: laag.maxZoom,
      });
      basisLaagRef.current.setZIndex(0);
      basisLaagRef.current.addTo(mapRef.current!);
      basisLaagRef.current.bringToBack();
    });
    setActieveLaag(naam);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Laagwisselaar — linksonder */}
      <div style={{
        position: "absolute", bottom: "1.5rem", left: "0.625rem",
        zIndex: 1000,
        display: "flex",
        boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
        borderRadius: "2px",
        overflow: "hidden",
      }}>
        {(Object.keys(LAGEN) as LaagNaam[]).map((naam) => (
          <button
            key={naam}
            onClick={() => wisselLaag(naam)}
            style={{
              padding: "0.3rem 0.625rem",
              fontSize: "0.75rem",
              fontWeight: actieveLaag === naam ? 700 : 400,
              backgroundColor: actieveLaag === naam ? "#161616" : "#ffffff",
              color: actieveLaag === naam ? "#ffffff" : "#525252",
              border: "none",
              cursor: actieveLaag === naam ? "default" : "pointer",
              lineHeight: 1.4,
            }}
          >
            {LAGEN[naam].label}
          </button>
        ))}
      </div>

      {/* Zoom-hint */}
      {zoom < 14 && (
        <div style={{
          position: "absolute", bottom: "3rem", left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000, pointerEvents: "none",
          backgroundColor: "rgba(22,22,22,0.72)", color: "#ffffff",
          padding: "0.5rem 1rem", fontSize: "0.8125rem",
          whiteSpace: "nowrap", borderRadius: "2px",
        }}>
          Klik op de kaart om in te zoomen — perceelgrenzen zijn zichtbaar vanaf zoom 14
        </div>
      )}

      {/* Laad-indicator */}
      {laden && (
        <div style={{
          position: "absolute", top: "0.75rem", left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          backgroundColor: "#ffffff",
          padding: "0.4rem 0.875rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          fontSize: "0.8125rem", color: "#161616",
          display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <span style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", border: "2px solid #0f62fe", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
          Perceel ophalen...
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
