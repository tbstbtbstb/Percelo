"use client";

import { Launch } from "@carbon/icons-react";

interface Props {
  lat: number;
  lon: number;
  adres: string;
}

export function PerceelKaart({ lat, lon, adres }: Props) {
  const embedUrl =
    `https://maps.google.com/maps?q=${lat},${lon}&z=18&t=k&output=embed&hl=nl`;

  const mapsUrl =
    `https://www.google.com/maps/@${lat},${lon},18z/data=!3m1!1e3`;

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "8/3", minHeight: "200px", overflow: "hidden", backgroundColor: "#1a1a1a" }}>
      <iframe
        src={embedUrl}
        title={`Satellietkaart ${adres}`}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          border: "none",
          filter: "saturate(1.1) contrast(1.05)",
        }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      {/* Adres label */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
        padding: "1.5rem 0.875rem 0.5rem",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        pointerEvents: "none",
      }}>
        <p style={{ color: "#ffffff", fontSize: "0.8125rem", fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
          {adres}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: "0.25rem",
            color: "rgba(255,255,255,0.85)", fontSize: "0.6875rem",
            textDecoration: "none", pointerEvents: "auto", flexShrink: 0,
          }}
        >
          <Launch size={11} />
          Google Maps
        </a>
      </div>
    </div>
  );
}
