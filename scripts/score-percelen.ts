/**
 * Batch scoring script — kansrijke agrarische percelen
 *
 * Gebruik:
 *   DATABASE_URL=postgres://... npx tsx scripts/score-percelen.ts --provincie Utrecht
 *
 * Vereisten:
 *   npm install -D tsx pg @types/pg
 *
 * Werking:
 *   1. Haalt agrarische percelen op via PDOK/BRK WFS per gemeente
 *   2. Controleert bestemmingsplan via Ruimtelijkeplannen.nl API
 *   3. Berekent slagingskans + financiële schattingen
 *   4. Slaat resultaten op in PostGIS database
 *
 * Dit script is bedoeld als wekelijkse cron-job op een VPS of als
 * GitHub Actions workflow met schedule: cron.
 */

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Gemeenten per provincie om te scannen ───────────────────────────────────
const GEMEENTEN_PER_PROVINCIE: Record<string, string[]> = {
  "Noord-Holland": ["Haarlemmermeer", "Amsterdam", "Amstelveen", "Purmerend"],
  "Zuid-Holland":  ["Westland", "Zoetermeer", "Katwijk", "Leiden", "Dordrecht"],
  "Utrecht":       ["De Ronde Venen", "Woerden", "Stichtse Vecht", "Amersfoort"],
  "Flevoland":     ["Dronten", "Almere", "Lelystad"],
  "Noord-Brabant": ["Boekel", "Breda", "Eindhoven", "Tilburg"],
  "Gelderland":    ["Berkelland", "Nijmegen", "Apeldoorn", "Arnhem"],
  "Overijssel":    ["Zwartewaterland", "Zwolle", "Deventer"],
  "Limburg":       ["Horst aan de Maas", "Venlo", "Maastricht"],
  "Friesland":     ["Smallingerland", "Leeuwarden"],
  "Groningen":     ["Groningen", "Westerwolde"],
  "Drenthe":       ["Emmen"],
  "Zeeland":       ["Schouwen-Duiveland", "Middelburg"],
};

// ─── Agrarische grondprijzen per provincie (€/ha, DLG/RVO 2024) ──────────────
const GRONDPRIJS_PER_PROVINCIE: Record<string, number> = {
  "Noord-Holland": 105000, "Zuid-Holland": 95000, "Utrecht": 100000,
  "Flevoland": 115700,     "Gelderland": 87000,   "Noord-Brabant": 82000,
  "Overijssel": 78000,     "Limburg": 74000,      "Friesland": 62000,
  "Groningen": 60000,      "Drenthe": 68000,      "Zeeland": 78000,
};

// ─── Bouwgrondprijzen na wijziging (€/m², regionale benchmarks) ──────────────
const BOUWGROND_REGIO: Record<string, { min: number; max: number }> = {
  "Noord-Holland": { min: 300, max: 600 },
  "Zuid-Holland":  { min: 280, max: 560 },
  "Utrecht":       { min: 260, max: 520 },
  "Flevoland":     { min: 180, max: 360 },
  "Gelderland":    { min: 150, max: 300 },
  "Noord-Brabant": { min: 150, max: 300 },
  "Overijssel":    { min: 120, max: 240 },
  "Limburg":       { min: 110, max: 220 },
  "Friesland":     { min: 100, max: 200 },
  "Groningen":     { min: 100, max: 180 },
  "Drenthe":       { min: 90,  max: 180 },
  "Zeeland":       { min: 110, max: 220 },
};

interface PDOKPerceel {
  perceelId: string;
  oppervlakteM2: number;
  lat: number;
  lon: number;
  gemeente: string;
  provincie: string;
}

// ─── PDOK: haal agrarische percelen op voor een gemeente ─────────────────────
async function haalPercelenOp(gemeente: string, maxPercelen = 100): Promise<PDOKPerceel[]> {
  try {
    // Stap 1: gemeente centroide ophalen
    const geoRes = await fetch(
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(gemeente)}&fq=type:gemeente&rows=1`
    );
    if (!geoRes.ok) return [];
    const geoData = await geoRes.json();
    const centroide: string = geoData.response?.docs?.[0]?.centroide_ll ?? "";
    const match = centroide.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) return [];
    const lon = parseFloat(match[1]);
    const lat = parseFloat(match[2]);

    // Stap 2: percelen binnen 10 km ophalen via BRK WFS
    const bbox = `${lon - 0.15},${lat - 0.1},${lon + 0.15},${lat + 0.1}`;
    const wfsUrl =
      `https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0` +
      `?service=WFS&version=2.0.0&request=GetFeature&typeName=kadastralekaart:perceel` +
      `&outputFormat=json&count=${maxPercelen}&bbox=${bbox}&srsName=EPSG:4326`;
    const wfsRes = await fetch(wfsUrl, { signal: AbortSignal.timeout(15000) });
    if (!wfsRes.ok) return [];
    const wfsData = await wfsRes.json();

    return (wfsData.features ?? []).map((f: { properties: Record<string, unknown>; geometry: { coordinates: number[][][] } }) => {
      const coords = f.geometry?.coordinates?.[0] ?? [];
      const latC = coords.reduce((s: number, c: number[]) => s + c[1], 0) / (coords.length || 1);
      const lonC = coords.reduce((s: number, c: number[]) => s + c[0], 0) / (coords.length || 1);
      return {
        perceelId: String(f.properties.perceelidentificatie ?? f.properties.kadastralegemeentecode ?? ""),
        oppervlakteM2: Number(f.properties.kadastraleGrootteWaarde ?? 0),
        lat: latC, lon: lonC,
        gemeente, provincie: "",
      };
    }).filter((p: PDOKPerceel) => p.oppervlakteM2 >= 500 && p.oppervlakteM2 <= 50000);
  } catch {
    console.error(`PDOK fout voor ${gemeente}`);
    return [];
  }
}

// ─── Ruimtelijkeplannen.nl: huidig bestemmingsplan ophalen ───────────────────
async function haalBestemming(lat: number, lon: number): Promise<{ naam: string; code: string; isAgrarisch: boolean }> {
  try {
    const url =
      `https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/bestemmingsplangebieden` +
      `?_geo=${lon},${lat}&planType=bestemmingsplan&page=1&pageSize=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { naam: "onbekend", code: "", isAgrarisch: false };
    const data = await res.json();
    const plan = data._embedded?.bestemmingsplangebieden?.[0];
    if (!plan) return { naam: "onbekend", code: "", isAgrarisch: false };
    const naam = String(plan.naam ?? "").toLowerCase();
    const isAgrarisch =
      naam.includes("agrar") || naam.includes("agr.") ||
      naam.includes("landbouw") || naam.includes("buitengebied");
    return { naam: plan.naam ?? "onbekend", code: plan.planIdentificatie ?? "", isAgrarisch };
  } catch {
    return { naam: "onbekend", code: "", isAgrarisch: false };
  }
}

// ─── Score berekenen ─────────────────────────────────────────────────────────
function berekenScore(perceel: PDOKPerceel, provincie: string): number {
  let score = 50;
  // Oppervlakte: 1000–5000m² = optimaal
  if (perceel.oppervlakteM2 < 1000)         score -= 10;
  else if (perceel.oppervlakteM2 <= 5000)    score += 15;
  else if (perceel.oppervlakteM2 <= 15000)   score += 5;
  else                                        score -= 5;
  // Provincie woningdruk proxy
  const hogeDruk = ["Noord-Holland", "Zuid-Holland", "Utrecht", "Flevoland"];
  const middenDruk = ["Noord-Brabant", "Gelderland", "Overijssel"];
  if (hogeDruk.includes(provincie))           score += 20;
  else if (middenDruk.includes(provincie))    score += 10;
  return Math.max(0, Math.min(100, score));
}

// ─── Financieel model ────────────────────────────────────────────────────────
function berekenFinancieel(perceel: PDOKPerceel, provincie: string, slagingskans: number) {
  const grondprijs = (GRONDPRIJS_PER_PROVINCIE[provincie] ?? 80000) / 10000;
  const bouwgrond = BOUWGROND_REGIO[provincie] ?? { min: 120, max: 240 };
  const aankoopprijs = Math.round(perceel.oppervlakteM2 * grondprijs);
  const waardeMin = Math.round(perceel.oppervlakteM2 * bouwgrond.min);
  const waardeMax = Math.round(perceel.oppervlakteM2 * bouwgrond.max);
  const kosten = Math.round(aankoopprijs * 0.35 + 30000); // ~35% procedurekosten + vaste basis
  const margeMin = waardeMin - kosten - aankoopprijs;
  const margeMax = waardeMax - kosten - aankoopprijs;
  const investering = aankoopprijs + kosten;
  const roi = investering > 0 ? Math.round((margeMax / investering) * 100) : 0;
  return { aankoopprijs, waardeMin, waardeMax, kosten, margeMin, margeMax, roi, grondprijs };
}

// ─── Hoofdfunctie ─────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const provFilter = args.includes("--provincie") ? args[args.indexOf("--provincie") + 1] : null;

  const provincies = provFilter
    ? { [provFilter]: GEMEENTEN_PER_PROVINCIE[provFilter] ?? [] }
    : GEMEENTEN_PER_PROVINCIE;

  let totaal = 0;

  for (const [provincie, gemeenten] of Object.entries(provincies)) {
    console.log(`\n── ${provincie} ──`);

    for (const gemeente of gemeenten) {
      console.log(`  Scanning ${gemeente}...`);
      const percelen = await haalPercelenOp(gemeente, 50);

      for (const perceel of percelen) {
        perceel.provincie = provincie;
        const bestemming = await haalBestemming(perceel.lat, perceel.lon);
        if (!bestemming.isAgrarisch) continue;

        const slagingskans = berekenScore(perceel, provincie);
        if (slagingskans < 40) continue;

        const fin = berekenFinancieel(perceel, provincie, slagingskans);
        if (fin.margeMin < 50000) continue;

        await pool.query(`
          INSERT INTO kansrijke_percelen (
            perceel_id, gemeente, provincie, oppervlakte_m2, lat, lon,
            bestemmingsplan_naam, bestemming_code,
            slagingskans, agrarische_prijs_per_m2,
            geschatte_aankoopprijs, bouwgrond_waarde_min, bouwgrond_waarde_max,
            proceskosten_min, proceskosten_max,
            marge_min, marge_max, roi_pct, score_berekend_op
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
          ON CONFLICT (perceel_id) DO UPDATE SET
            slagingskans = EXCLUDED.slagingskans,
            marge_min = EXCLUDED.marge_min,
            marge_max = EXCLUDED.marge_max,
            roi_pct = EXCLUDED.roi_pct,
            score_berekend_op = NOW()
        `, [
          perceel.perceelId, gemeente, provincie, perceel.oppervlakteM2,
          perceel.lat, perceel.lon,
          bestemming.naam, bestemming.code,
          slagingskans, fin.grondprijs,
          fin.aankoopprijs, fin.waardeMin, fin.waardeMax,
          fin.kosten, Math.round(fin.kosten * 1.3),
          fin.margeMin, fin.margeMax, fin.roi,
        ]);

        totaal++;
      }
    }
  }

  console.log(`\nKlaar. ${totaal} percelen opgeslagen.`);
  await pool.end();
}

main().catch(console.error);
