"use client";

import { useSearchParams } from "next/navigation";
import { GemeenteVergelijker } from "@/components/vergelijker/GemeenteVergelijker";

export function VergelijkerInhoud() {
  const params = useSearchParams();
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : undefined;
  const lon = params.get("lon") ? parseFloat(params.get("lon")!) : undefined;
  const gemeente = params.get("gemeente") ?? undefined;

  return <GemeenteVergelijker perceelLat={lat} perceelLon={lon} perceelGemeente={gemeente} />;
}
