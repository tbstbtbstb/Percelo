/**
 * score-percelen.mjs
 *
 * Haal per kansrijke gemeente 4-5 agrarische percelen op, score ze,
 * en sla op als src/lib/percelenData.json.
 *
 * Gebruik:
 *   1. Start de dev-server: npm run dev
 *   2. Zet ADMIN_SECRET in .env.local (bijv. ADMIN_SECRET=geheim123)
 *   3. node scripts/score-percelen.mjs
 *
 * Het script pauzeert 3 seconden tussen batches om de externe APIs
 * (PDOK, Ruimtelijkeplannen, CBS) niet te overbelasten.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

// Laad .env.local voor ADMIN_SECRET
config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../src/lib/percelenData.json");
const BASE_URL = process.env.SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const API = `${BASE_URL}/api/score-percelen`;
const SECRET = process.env.ADMIN_SECRET;

if (!SECRET) {
  console.error("Zet ADMIN_SECRET in .env.local");
  process.exit(1);
}

// ─── Agrarische zones → grid-generator ──────────────────────────────────────
// Elke zone definieert een bounding box over een bewezen agrarisch gebied.
// De generator legt er een grid overheen met stap ~0.022° (~1.7km).
// Doel: ~2.600 seeds → ~20% yield → ~520 gekwalificeerde percelen → top 250.
//
// Uitgesloten: Veluwe, Waddenzee, Biesbosch, grote stedelijke kernen.

const ZONES = [
  // ── Groningen: klei-akkerbouw ─────────────────────────────────────────────
  { gemeente: "Het Hogeland",    provincie: "Groningen",     minLat: 53.26, maxLat: 53.41, minLon: 6.42, maxLon: 6.80, m2: 3500 },
  { gemeente: "Eemsdelta",       provincie: "Groningen",     minLat: 53.18, maxLat: 53.33, minLon: 6.88, maxLon: 7.08, m2: 4000 },
  { gemeente: "Oldambt",         provincie: "Groningen",     minLat: 53.08, maxLat: 53.22, minLon: 6.95, maxLon: 7.13, m2: 4200 },
  { gemeente: "Westerkwartier",  provincie: "Groningen",     minLat: 53.08, maxLat: 53.22, minLon: 6.28, maxLon: 6.52, m2: 3000 },

  // ── Friesland: weidebouw ──────────────────────────────────────────────────
  { gemeente: "Waadhoeke",       provincie: "Friesland",     minLat: 53.14, maxLat: 53.27, minLon: 5.40, maxLon: 5.68, m2: 3200 },
  { gemeente: "Súdwest-Fryslân", provincie: "Friesland",     minLat: 52.98, maxLat: 53.12, minLon: 5.38, maxLon: 5.68, m2: 3000 },
  { gemeente: "Smallingerland",  provincie: "Friesland",     minLat: 53.09, maxLat: 53.22, minLon: 5.95, maxLon: 6.20, m2: 2800 },

  // ── Drenthe: gemengd zandgrond ────────────────────────────────────────────
  { gemeente: "Emmen",           provincie: "Drenthe",       minLat: 52.72, maxLat: 52.85, minLon: 6.82, maxLon: 7.02, m2: 3000 },
  { gemeente: "Coevorden",       provincie: "Drenthe",       minLat: 52.60, maxLat: 52.74, minLon: 6.65, maxLon: 6.88, m2: 3200 },
  { gemeente: "Hoogeveen",       provincie: "Drenthe",       minLat: 52.68, maxLat: 52.80, minLon: 6.45, maxLon: 6.65, m2: 2800 },
  { gemeente: "Meppel",          provincie: "Drenthe",       minLat: 52.68, maxLat: 52.80, minLon: 6.15, maxLon: 6.35, m2: 2500 },

  // ── Overijssel: gemengd ───────────────────────────────────────────────────
  { gemeente: "Hardenberg",      provincie: "Overijssel",    minLat: 52.54, maxLat: 52.68, minLon: 6.58, maxLon: 6.82, m2: 3000 },
  { gemeente: "Ommen",           provincie: "Overijssel",    minLat: 52.50, maxLat: 52.63, minLon: 6.38, maxLon: 6.58, m2: 2800 },
  { gemeente: "Twenterand",      provincie: "Overijssel",    minLat: 52.40, maxLat: 52.55, minLon: 6.55, maxLon: 6.78, m2: 2500 },
  { gemeente: "Hof van Twente",  provincie: "Overijssel",    minLat: 52.26, maxLat: 52.40, minLon: 6.55, maxLon: 6.80, m2: 2500 },

  // ── Gelderland: rivierklei + zandgrond ───────────────────────────────────
  { gemeente: "Bronckhorst",     provincie: "Gelderland",    minLat: 52.00, maxLat: 52.15, minLon: 6.22, maxLon: 6.46, m2: 2800 },
  { gemeente: "Berkelland",      provincie: "Gelderland",    minLat: 51.98, maxLat: 52.13, minLon: 6.55, maxLon: 6.82, m2: 2600 },
  { gemeente: "Buren",           provincie: "Gelderland",    minLat: 51.88, maxLat: 52.00, minLon: 5.28, maxLon: 5.55, m2: 2500 },
  { gemeente: "Maasdriel",       provincie: "Gelderland",    minLat: 51.76, maxLat: 51.88, minLon: 5.20, maxLon: 5.42, m2: 2200 },

  // ── Utrecht: veenweide + rivierengebied ──────────────────────────────────
  { gemeente: "Woerden",         provincie: "Utrecht",       minLat: 52.02, maxLat: 52.13, minLon: 4.78, maxLon: 4.98, m2: 2200 },
  { gemeente: "De Ronde Venen",  provincie: "Utrecht",       minLat: 52.16, maxLat: 52.27, minLon: 4.82, maxLon: 5.00, m2: 2000 },
  { gemeente: "Lopik",           provincie: "Utrecht",       minLat: 51.96, maxLat: 52.08, minLon: 4.90, maxLon: 5.10, m2: 2200 },

  // ── Noord-Holland: polder-akkerbouw ──────────────────────────────────────
  { gemeente: "Hollands Kroon",  provincie: "Noord-Holland", minLat: 52.78, maxLat: 52.98, minLon: 4.82, maxLon: 5.12, m2: 3500 },
  { gemeente: "Schagen",         provincie: "Noord-Holland", minLat: 52.68, maxLat: 52.83, minLon: 4.70, maxLon: 4.90, m2: 3000 },
  { gemeente: "Koggenland",      provincie: "Noord-Holland", minLat: 52.62, maxLat: 52.75, minLon: 4.98, maxLon: 5.18, m2: 2800 },
  { gemeente: "Medemblik",       provincie: "Noord-Holland", minLat: 52.72, maxLat: 52.84, minLon: 5.00, maxLon: 5.22, m2: 2800 },

  // ── Zuid-Holland: polder + eilanden ──────────────────────────────────────
  { gemeente: "Goeree-Overflakkee", provincie: "Zuid-Holland", minLat: 51.73, maxLat: 51.90, minLon: 3.92, maxLon: 4.28, m2: 3500 },
  { gemeente: "Hoeksche Waard",  provincie: "Zuid-Holland",  minLat: 51.75, maxLat: 51.88, minLon: 4.38, maxLon: 4.62, m2: 3000 },
  { gemeente: "Molenlanden",     provincie: "Zuid-Holland",  minLat: 51.85, maxLat: 51.97, minLon: 4.78, maxLon: 5.00, m2: 2500 },
  { gemeente: "Vijfheerenlanden",provincie: "Zuid-Holland",  minLat: 51.90, maxLat: 52.02, minLon: 4.98, maxLon: 5.18, m2: 2500 },

  // ── Zeeland: klei-akkerbouw ───────────────────────────────────────────────
  { gemeente: "Noord-Beveland",  provincie: "Zeeland",       minLat: 51.55, maxLat: 51.67, minLon: 3.68, maxLon: 3.90, m2: 4000 },
  { gemeente: "Schouwen-Duiveland", provincie: "Zeeland",    minLat: 51.64, maxLat: 51.75, minLon: 3.76, maxLon: 4.05, m2: 3800 },
  { gemeente: "Terneuzen",       provincie: "Zeeland",       minLat: 51.25, maxLat: 51.38, minLon: 3.82, maxLon: 4.05, m2: 3500 },

  // ── Noord-Brabant: intensieve veehouderij + akkerbouw ────────────────────
  { gemeente: "Land van Cuijk",  provincie: "Noord-Brabant", minLat: 51.68, maxLat: 51.82, minLon: 5.72, maxLon: 5.96, m2: 2800 },
  { gemeente: "Bernheze",        provincie: "Noord-Brabant", minLat: 51.68, maxLat: 51.80, minLon: 5.52, maxLon: 5.72, m2: 2500 },
  { gemeente: "Boekel",          provincie: "Noord-Brabant", minLat: 51.58, maxLat: 51.70, minLon: 5.65, maxLon: 5.82, m2: 2500 },
  { gemeente: "Moerdijk",        provincie: "Noord-Brabant", minLat: 51.64, maxLat: 51.75, minLon: 4.52, maxLon: 4.72, m2: 3000 },

  // ── Limburg: tuinbouw + akkerbouw ────────────────────────────────────────
  { gemeente: "Venray",          provincie: "Limburg",       minLat: 51.52, maxLat: 51.65, minLon: 5.96, maxLon: 6.18, m2: 2500 },
  { gemeente: "Horst aan de Maas", provincie: "Limburg",     minLat: 51.42, maxLat: 51.56, minLon: 6.02, maxLon: 6.22, m2: 2800 },
  { gemeente: "Peel en Maas",    provincie: "Limburg",       minLat: 51.32, maxLat: 51.47, minLon: 5.98, maxLon: 6.18, m2: 2500 },

  // ── Flevoland: grote-schaal akkerbouw (hoogste yield verwacht) ───────────
  { gemeente: "Noordoostpolder", provincie: "Flevoland",     minLat: 52.64, maxLat: 52.85, minLon: 5.52, maxLon: 5.90, m2: 3200 },
  { gemeente: "Dronten",         provincie: "Flevoland",     minLat: 52.46, maxLat: 52.65, minLon: 5.55, maxLon: 5.85, m2: 3000 },
  { gemeente: "Zeewolde",        provincie: "Flevoland",     minLat: 52.27, maxLat: 52.45, minLon: 5.42, maxLon: 5.70, m2: 2800 },
];

const GRID_STAP = 0.022; // ~1.7km per stap

function generateSeeds(zones) {
  const seeds = [];
  for (const z of zones) {
    for (let lat = z.minLat + GRID_STAP / 2; lat < z.maxLat; lat += GRID_STAP) {
      for (let lon = z.minLon + GRID_STAP / 2; lon < z.maxLon; lon += GRID_STAP) {
        seeds.push({
          adres: `Agrarisch perceel ${z.gemeente}`,
          gemeente: z.gemeente,
          provincie: z.provincie,
          lat: Math.round(lat * 10000) / 10000,
          lon: Math.round(lon * 10000) / 10000,
          oppervlakteM2: z.m2,
        });
      }
    }
  }
  return seeds;
}

const SEEDS = generateSeeds(ZONES);
console.log(`\n📍 ${SEEDS.length} seeds gegenereerd uit ${ZONES.length} agrarische zones`);

// ─── Aankoopprijs en marge schatten ─────────────────────────────────────────
// Op basis van regio-grondprijzen (agrarisch vs bouwgrond)
const GRONDPRIJZEN = {
  "Noord-Holland":  { agrarisch: 14, bouwgrond: 450 },
  "Zuid-Holland":   { agrarisch: 12, bouwgrond: 420 },
  "Utrecht":        { agrarisch: 11, bouwgrond: 390 },
  "Noord-Brabant":  { agrarisch: 8,  bouwgrond: 320 },
  "Gelderland":     { agrarisch: 7,  bouwgrond: 290 },
  "Overijssel":     { agrarisch: 6,  bouwgrond: 260 },
  "Limburg":        { agrarisch: 6,  bouwgrond: 250 },
  "Groningen":      { agrarisch: 5,  bouwgrond: 220 },
  "Friesland":      { agrarisch: 4,  bouwgrond: 200 },
  "Drenthe":        { agrarisch: 4,  bouwgrond: 195 },
  "Flevoland":      { agrarisch: 9,  bouwgrond: 310 },
  "Zeeland":        { agrarisch: 5,  bouwgrond: 230 },
};

function berekenFinancieel(provincie, oppervlakteM2, slagingskans) {
  const prijzen = GRONDPRIJZEN[provincie] ?? { agrarisch: 7, bouwgrond: 280 };
  const aankoopprijs = Math.round(oppervlakteM2 * prijzen.agrarisch / 1000) * 1000;
  const ontwikkelingskosten = Math.round(oppervlakteM2 * 80 / 1000) * 1000;
  const bouwgrondMin = Math.round(oppervlakteM2 * prijzen.bouwgrond * 0.7 / 1000) * 1000;
  const bouwgrondMax = Math.round(oppervlakteM2 * prijzen.bouwgrond / 1000) * 1000;
  const margeMin = Math.max(0, bouwgrondMin - aankoopprijs - ontwikkelingskosten);
  const margeMax = Math.max(0, bouwgrondMax - aankoopprijs - ontwikkelingskosten);
  return { aankoopprijs, bouwgrondMin, bouwgrondMax, margeMin, margeMax };
}

// ─── Hoofdlogica ─────────────────────────────────────────────────────────────
const bestaand = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, "utf8")) : [];
const alGescoord = new Set(bestaand.map((p) => `${p.lat},${p.lon}`));
const resterend = SEEDS.filter((s) => !alGescoord.has(`${s.lat},${s.lon}`));

console.log(`\n🌍 ${SEEDS.length} seed-percelen | ${bestaand.length} al gescoord | ${resterend.length} te doen\n`);

if (resterend.length === 0) {
  console.log("✅ Alles al gescoord. Klaar!");
  process.exit(0);
}

let aantalGoed = bestaand.length;
let aantalOvergeslagen = 0;

for (let i = 0; i < resterend.length; i += 5) {
  const batch = resterend.slice(i, i + 5);
  const batchNr = Math.floor(i / 5) + 1;
  const totaalBatches = Math.ceil(resterend.length / 5);

  process.stdout.write(`Batch ${batchNr}/${totaalBatches} (${batch.map((b) => b.gemeente).join(", ")})... `);

  let resultaten;
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, percelen: batch }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    resultaten = await res.json();
  } catch (e) {
    console.log(`❌ fout: ${e.message}`);
    continue;
  }

  // Whitelist: alleen bestemmingen die transformeerbaar zijn naar wonen
  const IS_TRANSFORMABEL_RE = /^agrarisch|^natuur|^recreatie|^landelijk/i;

  for (const r of resultaten) {
    if (!r.ok || r.totaalScore < 50) {
      aantalOvergeslagen++;
      continue;
    }
    if (r.reedsBouwgrond) {
      aantalOvergeslagen++;
      continue;
    }
    if (!IS_TRANSFORMABEL_RE.test(r.huidigeBestemming ?? "")) {
      aantalOvergeslagen++;
      continue;
    }

    const seed = batch.find((s) => s.lat === r.perceel.lat && s.lon === r.perceel.lon);
    if (!seed) continue;

    const fin = berekenFinancieel(seed.provincie, seed.oppervlakteM2, r.totaalScore);
    aantalGoed++;

    bestaand.push({
      id: String(bestaand.length + 1),
      perceelId: `${seed.gemeente.substring(0, 3).toUpperCase()}00-X-${Math.floor(1000 + Math.random() * 9000)}`,
      straatAdres: seed.adres,
      gemeente: seed.gemeente,
      provincie: seed.provincie,
      oppervlakteM2: seed.oppervlakteM2,
      lat: seed.lat,
      lon: seed.lon,
      bestemming: r.huidigeBestemming ?? "Agrarisch",
      reedsBouwgrond: r.reedsBouwgrond ?? false,
      slagingskans: r.totaalScore,
      scoreKlasse: r.scoreKlasse,
      geschatteAankoopprijs: fin.aankoopprijs,
      bouwgrondWaardeMin: fin.bouwgrondMin,
      bouwgrondWaardeMax: fin.bouwgrondMax,
      margeMin: fin.margeMin,
      margeMax: fin.margeMax,
    });
  }

  writeFileSync(OUTPUT, JSON.stringify(bestaand, null, 2));
  console.log(`✅ ${resultaten.filter((r) => r.ok && r.totaalScore >= 50).length} bruikbaar`);

  if (i + 5 < resterend.length) await new Promise((r) => setTimeout(r, 3000));
}

console.log(`\n🎉 Klaar! ${aantalGoed} percelen opgeslagen, ${aantalOvergeslagen} overgeslagen (score < 50)\n`);
