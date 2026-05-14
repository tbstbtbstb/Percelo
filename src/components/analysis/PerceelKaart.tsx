"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

interface Props {
  lat: number;
  lon: number;
  adres: string;
}

export function PerceelKaart({ lat, lon, adres }: Props) {
  const [geladen, setGeladen] = useState(false);
  const [fout, setFout] = useState(false);

  // PDOK Luchtfoto WMS — actuele orthofoto 25cm resolutie, geen API-sleutel nodig
  // EPSG:4326 BBOX = minLat,minLon,maxLat,maxLon
  const dLat = 0.0005;
  const dLon = 0.0014;
  const bbox = `${lat - dLat},${lon - dLon},${lat + dLat},${lon + dLon}`;
  const fotoUrl =
    `https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0` +
    `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
    `&LAYERS=Actueel_ortho25&STYLES=&CRS=EPSG:4326` +
    `&BBOX=${bbox}&WIDTH=640&HEIGHT=240&FORMAT=image/jpeg`;

  const mapsUrl = `https://www.google.com/maps/@${lat},${lon},17z/data=!3m1!1e3`;

  if (fout) return null;

  return (
    <div className="relative rounded-lg overflow-hidden bg-slate-100 border" style={{ aspectRatio: "8/3" }}>
      {/* Luchtfoto */}
      <img
        src={fotoUrl}
        alt={`Luchtfoto ${adres}`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${geladen ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setGeladen(true)}
        onError={() => setFout(true)}
      />

      {/* Laadindicator */}
      {!geladen && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
        </div>
      )}

      {/* Kruishaar op de exacte locatie */}
      {geladen && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-px -translate-y-3 h-6 w-0.5 bg-red-500/90 shadow-sm" />
            <div className="absolute top-1/2 -translate-y-px -translate-x-3 w-6 h-0.5 bg-red-500/90 shadow-sm" />
            <div className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-white shadow" />
          </div>
        </div>
      )}

      {/* Label + Google Maps link */}
      {geladen && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-end justify-between">
          <p className="text-white text-xs font-medium truncate max-w-[70%]">{adres}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white text-[10px] flex items-center gap-1 shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
            Google Maps
          </a>
        </div>
      )}

      {/* Bronvermelding */}
      {geladen && (
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[9px] text-white/70 bg-black/30 rounded px-1 py-0.5">
            © PDOK Luchtfoto
          </span>
        </div>
      )}
    </div>
  );
}
