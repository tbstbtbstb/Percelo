import type { Perceel, KostenRaming, WaardestijgingData } from "@/types";

const AGRARISCH_PRIJS_PER_HA: Record<string, number> = {
  Flevoland: 115700,
  "Noord-Holland": 105000,
  Utrecht: 100000,
  "Zuid-Holland": 95000,
  Gelderland: 87000,
  "Noord-Brabant": 82000,
  Zeeland: 78000,
  Overijssel: 78000,
  Limburg: 74000,
  Drenthe: 68000,
  Friesland: 62000,
  Groningen: 60000,
};

type RegioType = "randstad" | "randstad-omgeving" | "oost-zuid" | "perifeer";

const BOUWGROND_PER_M2: Record<RegioType, { min: number; max: number; label: string }> = {
  randstad:            { min: 300, max: 600, label: "Randstad" },
  "randstad-omgeving": { min: 200, max: 400, label: "Randstad-omgeving" },
  "oost-zuid":         { min: 150, max: 300, label: "Oost/Zuid-Nederland" },
  perifeer:            { min: 100, max: 200, label: "Perifeer Nederland" },
};

const PROVINCIE_NAAR_REGIO: Record<string, RegioType> = {
  "Noord-Holland": "randstad",
  "Zuid-Holland":  "randstad",
  Utrecht:         "randstad",
  Flevoland:       "randstad-omgeving",
  Gelderland:      "oost-zuid",
  "Noord-Brabant": "oost-zuid",
  Overijssel:      "oost-zuid",
  Limburg:         "oost-zuid",
  Zeeland:         "perifeer",
  Drenthe:         "perifeer",
  Friesland:       "perifeer",
  Groningen:       "perifeer",
};

const WONINGDRUK: Record<string, number> = {
  Amsterdam: 95, Rotterdam: 90, "Den Haag": 88, Utrecht: 92, Eindhoven: 85,
  Groningen: 80, Tilburg: 78, Almere: 82, Breda: 76, Nijmegen: 79,
  Haarlem: 87, Arnhem: 75, Zaanstad: 83, Amersfoort: 84, Apeldoorn: 70,
  Enschede: 68, "s-Hertogenbosch": 77, Zwolle: 74, Leiden: 86,
  Dordrecht: 72, Haarlemmermeer: 88,
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchBRKOppervlakte(perceelId: string | undefined, lat: number, lon: number): Promise<number | null> {
  // Stap 1: locatieserver /free op perceel-ID — retourneert kadastrale_grootte direct en betrouwbaar
  if (perceelId) {
    try {
      const url =
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free` +
        `?q=${encodeURIComponent(perceelId)}&fq=type:perceel&fl=kadastrale_grootte&rows=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const data = await res.json();
        const grootte: number | undefined = data.response?.docs?.[0]?.kadastrale_grootte;
        if (grootte && grootte > 0) return grootte;
      }
    } catch { /* val terug */ }
  }

  // Stap 2: coördinaat-gebaseerde fallback via kadastrale kaart WFS
  // Risico: bij dichtbevolkte gebieden kan een aangrenzend kleiner perceel worden geraakt.
  try {
    const url =
      `https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0?service=WFS&version=2.0.0` +
      `&request=GetFeature&typeName=kadastralekaart:perceel&outputFormat=json&count=1` +
      `&CQL_FILTER=${encodeURIComponent(`INTERSECTS(geometrie,POINT(${lon} ${lat}))`)}&srsName=EPSG:4326`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0]?.properties?.kadastraleGrootteWaarde ?? null;
  } catch {
    return null;
  }
}

async function fetchBodemtype(lat: number, lon: number): Promise<{ naam: string; factor: number }> {
  try {
    const url =
      `https://service.pdok.nl/bzk/bro-bodemkaart-50k/wfs/v1_0?service=WFS&version=2.0.0` +
      `&request=GetFeature&typeName=bodemkaart50k:kaarteenheid&outputFormat=json&count=1` +
      `&CQL_FILTER=INTERSECTS(geometrie,POINT(${lon}%20${lat}))&srsName=EPSG:4326`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return { naam: "onbekend", factor: 1.0 };
    const data = await res.json();
    const props = data.features?.[0]?.properties ?? {};
    const code = (
      props.kaarteenheidcode ??
      props.bodemcode ??
      props.symboolcode ??
      ""
    ).toLowerCase();

    if (!code) return { naam: "onbekend", factor: 1.0 };

    if (code.startsWith("v") || code.includes("veen")) return { naam: "Veengrond", factor: 0.78 };
    if (code.startsWith("w") || code.includes("moer"))  return { naam: "Moerige grond", factor: 0.87 };
    if (code.startsWith("k") || code.includes("klei"))  return { naam: "Kleigrond", factor: 0.95 };
    if (code.startsWith("z") || code.includes("zand"))  return { naam: "Zandgrond", factor: 1.05 };
    if (code.startsWith("l"))                            return { naam: "Löss", factor: 1.02 };
    return { naam: "Onbekend", factor: 1.0 };
  } catch {
    return { naam: "onbekend", factor: 1.0 };
  }
}

async function fetchWozWaarde(
  adresseerbaarobjectId: string | undefined
): Promise<{ waarde: number; peildatum: string } | null> {
  if (!adresseerbaarobjectId) return null;
  try {
    const url = `https://api.wozwaardeloket.nl/woz-waarden/${adresseerbaarobjectId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data: { peildatum: string; vastgesteldeWaarde: number; statusCode: string }[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    // Meest recente definitieve waarde
    const definitief = data
      .filter((d) => d.statusCode === "definitief" && d.vastgesteldeWaarde > 0)
      .sort((a, b) => b.peildatum.localeCompare(a.peildatum));
    const beste = definitief[0] ?? data.sort((a, b) => b.peildatum.localeCompare(a.peildatum))[0];
    if (!beste?.vastgesteldeWaarde) return null;
    return { waarde: beste.vastgesteldeWaarde, peildatum: beste.peildatum.slice(0, 4) };
  } catch {
    return null;
  }
}

async function fetchAfstandTotKern(
  lat: number,
  lon: number
): Promise<{ km: number; naam: string }> {
  try {
    const url =
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free` +
      `?q=*&lat=${lat}&lon=${lon}&fq=type:woonplaats&rows=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { km: 5, naam: "onbekend" };
    const data = await res.json();
    const item = data.response?.docs?.[0];
    if (!item) return { km: 5, naam: "onbekend" };
    const centroide: string = item.centroide_ll ?? "";
    const match = centroide.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) return { km: 5, naam: item.weergavenaam ?? "onbekend" };
    const wLon = parseFloat(match[1]);
    const wLat = parseFloat(match[2]);
    const km = Math.round(haversineKm(lat, lon, wLat, wLon) * 10) / 10;
    return { km, naam: item.weergavenaam ?? "onbekend" };
  } catch {
    return { km: 5, naam: "onbekend" };
  }
}

export async function berekenWaardestijging(
  perceel: Perceel,
  kostenRaming: KostenRaming
): Promise<WaardestijgingData> {
  const provincie = perceel.provincie ?? "";
  const regio: RegioType = PROVINCIE_NAAR_REGIO[provincie] ?? "oost-zuid";
  const base = BOUWGROND_PER_M2[regio];
  const agrarischPrijsPerHa = AGRARISCH_PRIJS_PER_HA[provincie] ?? 95400;

  const [brkOpp, bodem, kern, woz] = await Promise.all([
    perceel.perceelOppervlakte
      ? Promise.resolve(perceel.perceelOppervlakte)
      : fetchBRKOppervlakte(perceel.gekoppeldPerceel?.[0], perceel.lat, perceel.lon),
    fetchBodemtype(perceel.lat, perceel.lon),
    fetchAfstandTotKern(perceel.lat, perceel.lon),
    fetchWozWaarde(perceel.adresseerbaarobjectId),
  ]);

  const perceelM2 = brkOpp ?? 2500;

  // Size factor: small plots are scarcer → premium; very large → bulk discount
  let sizeFactor = 1.0;
  if (perceelM2 < 800)        sizeFactor = 1.12;
  else if (perceelM2 < 2500)  sizeFactor = 1.04;
  else if (perceelM2 < 7500)  sizeFactor = 1.0;
  else if (perceelM2 < 20000) sizeFactor = 0.94;
  else                         sizeFactor = 0.87;

  // Distance factor: proximity to town centre drives price
  let distFactor = 1.0;
  if (kern.km < 1.0)       distFactor = 1.22;
  else if (kern.km < 2.5)  distFactor = 1.12;
  else if (kern.km < 6.0)  distFactor = 1.0;
  else if (kern.km < 12.0) distFactor = 0.90;
  else                      distFactor = 0.80;

  // Housing pressure factor
  const drukScore = WONINGDRUK[perceel.gemeente ?? ""] ?? 65;
  let drukFactor = 1.0;
  if (drukScore > 88)      drukFactor = 1.18;
  else if (drukScore > 80) drukFactor = 1.08;
  else if (drukScore > 70) drukFactor = 1.02;
  else if (drukScore > 55) drukFactor = 1.0;
  else                      drukFactor = 0.92;

  const combined = sizeFactor * distFactor * drukFactor * bodem.factor;

  // Narrow the range in proportion to available data quality
  const narrowing =
    (brkOpp !== null ? 0.08 : 0) +
    (bodem.naam !== "onbekend" ? 0.07 : 0) +
    (kern.naam !== "onbekend" ? 0.08 : 0) +
    (perceel.gemeente ? 0.07 : 0);

  let newMin = base.min * combined;
  let newMax = base.max * combined;
  const rangeWidth = newMax - newMin;
  newMin = Math.round(newMin + (rangeWidth * narrowing) / 2);
  newMax = Math.round(newMax - (rangeWidth * narrowing) / 2);
  newMin = Math.max(50, newMin);
  newMax = Math.max(newMin + 50, newMax);

  const aanpassingsPct = Math.round((combined - 1) * 100);

  return {
    agrarischPrijsPerHa,
    bouwgrondPrijsPerM2Min: newMin,
    bouwgrondPrijsPerM2Max: newMax,
    provincie,
    regio: base.label,
    databron: "Kadaster Q4 2025 + NVM 2024–2025 + BRK + BRO bodemkaart",
    conversiekostenMin: kostenRaming.totaalMin,
    conversiekostenMax: kostenRaming.totaalMax,
    perceelM2,
    bodemtype: bodem.naam,
    afstandTotKernKm: kern.km,
    afstandTotKernNaam: kern.naam,
    aanpassingsPct,
    wozWaarde: woz?.waarde,
    wozPeildatum: woz?.peildatum,
  };
}
