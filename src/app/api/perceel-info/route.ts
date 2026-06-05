import { NextRequest, NextResponse } from "next/server";

const WFS = "https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0";
const LOCATIE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse";

function toEPSG3857(lon: number, lat: number): [number, number] {
  const R = 6378137;
  const x = (lon * Math.PI * R) / 180;
  const y = Math.log(Math.tan((Math.PI / 4) + (lat * Math.PI) / 360)) * R;
  return [x, y];
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat en lon zijn verplicht" }, { status: 400 });
  }

  // Buffer: ~25m — groot genoeg voor klikken aan de rand van een perceel
  const d = 25;
  const [cx, cy] = toEPSG3857(lon, lat);
  const bbox = `${cx - d},${cy - d},${cx + d},${cy + d},EPSG:3857`;

  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeName: "kadastralekaart:Perceel",
    outputFormat: "application/json",
    srsName: "EPSG:4326", // geometrie terug in lon/lat voor Leaflet
    count: "1",
    bbox,
  });

  try {
    const [wfsRes, revRes] = await Promise.all([
      fetch(`${WFS}?${params}`, { signal: AbortSignal.timeout(8000) }),
      fetch(`${LOCATIE}?lat=${lat}&lon=${lon}&rows=1&type=adres`, { signal: AbortSignal.timeout(5000) }),
    ]);

    if (!wfsRes.ok) {
      return NextResponse.json({ error: "WFS niet beschikbaar" }, { status: 502 });
    }

    const wfsData = await wfsRes.json();
    const feature = wfsData.features?.[0];

    if (!feature) {
      return NextResponse.json({ gevonden: false });
    }

    const props = feature.properties;
    const akrCode: string = props.AKRKadastraleGemeenteCodeWaarde ?? "";
    const gemeenteNaam: string = props.kadastraleGemeenteWaarde ?? "";
    const sectie: string = props.sectie ?? "";
    const perceelnummer: number = props.perceelnummer ?? 0;
    const oppervlakte: number = props.kadastraleGrootteWaarde ?? 0;

    // Centroid berekenen via gemiddelde van polygon-coördinaten
    let centLat = lat;
    let centLon = lon;
    try {
      const coords: [number, number][] = feature.geometry?.coordinates?.[0] ?? [];
      if (coords.length > 0) {
        centLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        centLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      }
    } catch { /* gebruik klik-coördinaten als fallback */ }

    // Adresgegevens uit reverse geocode
    let gemeente: string | undefined;
    let provincie: string | undefined;
    try {
      if (revRes.ok) {
        const revData = await revRes.json();
        const doc = revData.response?.docs?.[0];
        gemeente = doc?.gemeentenaam;
        provincie = doc?.provincienaam;
      }
    } catch { /* geen adres */ }

    return NextResponse.json({
      gevonden: true,
      akrCode,
      gemeenteNaam,
      sectie,
      perceelnummer,
      oppervlakte,
      lat: centLat,
      lon: centLon,
      gemeente,
      provincie,
      geometry: feature.geometry,
    });
  } catch (e) {
    console.error("[perceel-info]", e);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}
