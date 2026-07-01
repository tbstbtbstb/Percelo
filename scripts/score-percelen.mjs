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

// ─── Seed-coördinaten ───────────────────────────────────────────────────────
// Per gemeente 4-5 punten op de rand van de bebouwde kom,
// in agrarisch gebied zonder bekende harde blokkades.
// Formaat: { adres, gemeente, provincie, lat, lon, oppervlakteM2 }
//
// Selectiecriteria per punt:
// - Agrarisch gebied direct grenzend aan woonwijk/kern
// - Niet in NNN, Natura2000, beschermd gezicht
// - Niet langs snelweg (>300m buffer) of spoor (>200m buffer)
// - Oppervlakte 1.500-4.000m² (realistisch voor particulier)

const SEEDS = [
  // ── Pijnacker-Nootdorp (Zuid-Holland) ────────────────────────────────────
  { adres: "Klapwijkseweg 152, Pijnacker", gemeente: "Pijnacker-Nootdorp", provincie: "Zuid-Holland", lat: 52.0012, lon: 4.4478, oppervlakteM2: 2800 },
  { adres: "Boezembocht 8, Pijnacker", gemeente: "Pijnacker-Nootdorp", provincie: "Zuid-Holland", lat: 51.9945, lon: 4.4215, oppervlakteM2: 3200 },

  // ── Lansingerland (Zuid-Holland) ─────────────────────────────────────────
  { adres: "Bergweg Noord 60, Berkel en Rodenrijs", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9823, lon: 4.5012, oppervlakteM2: 3500 },
  { adres: "Wilgweg 4, Bergschenhoek", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9710, lon: 4.5145, oppervlakteM2: 2400 },

  // ── Houten (Utrecht) ─────────────────────────────────────────────────────
  { adres: "Schalkwijkerweg 18, Schalkwijk", gemeente: "Houten", provincie: "Utrecht", lat: 51.9645, lon: 5.1312, oppervlakteM2: 2200 },
  { adres: "Achterweg 6, Tull en 't Waal", gemeente: "Houten", provincie: "Utrecht", lat: 51.9578, lon: 5.1478, oppervlakteM2: 1800 },
  { adres: "Weidseweg 22, Schalkwijk", gemeente: "Houten", provincie: "Utrecht", lat: 51.9701, lon: 5.1189, oppervlakteM2: 2600 },

  // ── Nieuwegein (Utrecht) ──────────────────────────────────────────────────
  { adres: "Nedereindseweg 40, Jutphaas", gemeente: "Nieuwegein", provincie: "Utrecht", lat: 52.0189, lon: 5.0478, oppervlakteM2: 1900 },
  { adres: "Lekdijk Oost 14, Nieuwegein", gemeente: "Nieuwegein", provincie: "Utrecht", lat: 52.0134, lon: 5.0812, oppervlakteM2: 2100 },

  // ── Veenendaal (Utrecht) ──────────────────────────────────────────────────
  { adres: "Slaperdijk 12, Veenendaal-West", gemeente: "Veenendaal", provincie: "Utrecht", lat: 52.0312, lon: 5.5234, oppervlakteM2: 2000 },
  { adres: "Emminkhuizerberg 8, Veenendaal", gemeente: "Veenendaal", provincie: "Utrecht", lat: 52.0201, lon: 5.5089, oppervlakteM2: 1700 },

  // ── Wageningen (Gelderland) ───────────────────────────────────────────────
  { adres: "Droevendaalsesteeg 10, Wageningen", gemeente: "Wageningen", provincie: "Gelderland", lat: 51.9823, lon: 5.6612, oppervlakteM2: 2400 },
  { adres: "Haarweg, Wageningen", gemeente: "Wageningen", provincie: "Gelderland", lat: 51.9648, lon: 5.6198, oppervlakteM2: 2800 },

  // ── Ede (Gelderland) ──────────────────────────────────────────────────────
  { adres: "Bennekomseweg 200, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0334, lon: 5.6734, oppervlakteM2: 2900 },
  { adres: "Telefoonweg 100, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0512, lon: 5.6123, oppervlakteM2: 3800 },

  // ── Nijkerk (Gelderland) ──────────────────────────────────────────────────
  { adres: "Holkerweg 80, Nijkerk", gemeente: "Nijkerk", provincie: "Gelderland", lat: 52.2234, lon: 5.4789, oppervlakteM2: 2800 },
  { adres: "Corlaerseweg 120, Nijkerk", gemeente: "Nijkerk", provincie: "Gelderland", lat: 52.2089, lon: 5.4934, oppervlakteM2: 3400 },

  // ── Son en Breugel (Noord-Brabant) ───────────────────────────────────────
  { adres: "Nijnselseweg 26, Nijnsel", gemeente: "Son en Breugel", provincie: "Noord-Brabant", lat: 51.5201, lon: 5.5023, oppervlakteM2: 2300 },
  { adres: "Kanaaldijk Noord 28, Son en Breugel", gemeente: "Son en Breugel", provincie: "Noord-Brabant", lat: 51.5312, lon: 5.4912, oppervlakteM2: 1900 },

  // ── Veldhoven (Noord-Brabant) ─────────────────────────────────────────────
  { adres: "Wintelresedijk 14, Wintelre", gemeente: "Veldhoven", provincie: "Noord-Brabant", lat: 51.3923, lon: 5.3812, oppervlakteM2: 2700 },
  { adres: "Riethovensedijk 8, Riethoven", gemeente: "Veldhoven", provincie: "Noord-Brabant", lat: 51.3712, lon: 5.3623, oppervlakteM2: 2100 },

  // ── Waalwijk (Noord-Brabant) ──────────────────────────────────────────────
  { adres: "Grotestraat 44, Baardwijk", gemeente: "Waalwijk", provincie: "Noord-Brabant", lat: 51.6834, lon: 5.0312, oppervlakteM2: 2400 },
  { adres: "Capelseweg 16, Sprang-Capelle", gemeente: "Waalwijk", provincie: "Noord-Brabant", lat: 51.6601, lon: 5.0089, oppervlakteM2: 1800 },

  // ── Tilburg (Noord-Brabant) ───────────────────────────────────────────────
  { adres: "Udenhoutseweg 34, Udenhout", gemeente: "Tilburg", provincie: "Noord-Brabant", lat: 51.6234, lon: 5.1234, oppervlakteM2: 2200 },
  { adres: "Haarensebaan 12, Udenhout", gemeente: "Tilburg", provincie: "Noord-Brabant", lat: 51.6189, lon: 5.1089, oppervlakteM2: 3000 },

  // ── Alphen-Chaam (Noord-Brabant) ──────────────────────────────────────────
  { adres: "Alphenseweg 80, Alphen-Chaam", gemeente: "Alphen-Chaam", provincie: "Noord-Brabant", lat: 51.4978, lon: 4.9312, oppervlakteM2: 3800 },

  // ── Harderwijk (Gelderland) ───────────────────────────────────────────────
  { adres: "Overkampsweg 4, Hierden", gemeente: "Harderwijk", provincie: "Gelderland", lat: 52.3423, lon: 5.6012, oppervlakteM2: 2500 },
  { adres: "Berkenboomsweg 8, Hierden", gemeente: "Harderwijk", provincie: "Gelderland", lat: 52.3401, lon: 5.6089, oppervlakteM2: 2000 },

  // ── Apeldoorn westzijde (Gelderland) ─────────────────────────────────────
  { adres: "Waterweg 8, Beemte-Broekland", gemeente: "Apeldoorn", provincie: "Gelderland", lat: 52.2412, lon: 5.9234, oppervlakteM2: 2900 },
  { adres: "Nieuwe Wetering 12, Beemte-Broekland", gemeente: "Apeldoorn", provincie: "Gelderland", lat: 52.2456, lon: 5.9178, oppervlakteM2: 2400 },

  // ── Zeewolde (Flevoland) ──────────────────────────────────────────────────
  { adres: "Gruttoweg 1, Zeewolde", gemeente: "Zeewolde", provincie: "Flevoland", lat: 52.3389, lon: 5.5312, oppervlakteM2: 1500 },
  { adres: "Gruttoweg 12, Zeewolde", gemeente: "Zeewolde", provincie: "Flevoland", lat: 52.3412, lon: 5.5289, oppervlakteM2: 1430 },
  { adres: "Reigerweg 26, Zeewolde", gemeente: "Zeewolde", provincie: "Flevoland", lat: 52.3512, lon: 5.5423, oppervlakteM2: 2800 },

  // ── Almere (Flevoland) ────────────────────────────────────────────────────
  { adres: "Jac. P. Thijsseweg 4, Almere Buitenvaart", gemeente: "Almere", provincie: "Flevoland", lat: 52.3812, lon: 5.3078, oppervlakteM2: 3000 },
  { adres: "Verbindingspad 8, Almere Buitenvaart", gemeente: "Almere", provincie: "Flevoland", lat: 52.3856, lon: 5.3134, oppervlakteM2: 2200 },

  // ── Dordrecht (Zuid-Holland) ──────────────────────────────────────────────
  { adres: "Provincialeweg 8, Dordrecht Bovenpolder", gemeente: "Dordrecht", provincie: "Zuid-Holland", lat: 51.8012, lon: 4.7234, oppervlakteM2: 2400 },
  { adres: "Bildersteegweg 4, Dordrecht Kop van 't Land", gemeente: "Dordrecht", provincie: "Zuid-Holland", lat: 51.7934, lon: 4.7412, oppervlakteM2: 1900 },

  // ── Rijswijk (Zuid-Holland) ───────────────────────────────────────────────
  { adres: "Middelweg 14, Rijswijk Meerpolder", gemeente: "Rijswijk", provincie: "Zuid-Holland", lat: 52.0523, lon: 4.3689, oppervlakteM2: 1700 },

  // ── Zoetermeer (Zuid-Holland) ─────────────────────────────────────────────
  { adres: "Meerpolder 42, Zoetermeer", gemeente: "Zoetermeer", provincie: "Zuid-Holland", lat: 52.0645, lon: 4.4312, oppervlakteM2: 2000 },
  { adres: "Meerpolder 46, Zoetermeer", gemeente: "Zoetermeer", provincie: "Zuid-Holland", lat: 52.0612, lon: 4.4289, oppervlakteM2: 1800 },

  // ── Katwijk (Zuid-Holland) ────────────────────────────────────────────────
  { adres: "Duinweg 110, Katwijk", gemeente: "Katwijk", provincie: "Zuid-Holland", lat: 52.2023, lon: 4.4067, oppervlakteM2: 1600 },
  { adres: "Rijnsoever 40, Katwijk", gemeente: "Katwijk", provincie: "Zuid-Holland", lat: 52.2156, lon: 4.4312, oppervlakteM2: 2200 },

  // ── Zwolle (Overijssel) ───────────────────────────────────────────────────
  { adres: "Meppelerweg 150, Zwolle", gemeente: "Zwolle", provincie: "Overijssel", lat: 52.5312, lon: 6.0534, oppervlakteM2: 2700 },
  { adres: "Zwolseweg 300, Zwolle", gemeente: "Zwolle", provincie: "Overijssel", lat: 52.5123, lon: 6.0789, oppervlakteM2: 3200 },

  // ── Barneveld (Gelderland) ────────────────────────────────────────────────
  { adres: "Barnseweg 150, Barneveld", gemeente: "Barneveld", provincie: "Gelderland", lat: 52.1423, lon: 5.5834, oppervlakteM2: 4200 },
  { adres: "Garderenseweg 60, Barneveld", gemeente: "Barneveld", provincie: "Gelderland", lat: 52.1589, lon: 5.5612, oppervlakteM2: 3100 },

  // ── Breda (Noord-Brabant) ─────────────────────────────────────────────────
  { adres: "Teteringseweg 150, Breda", gemeente: "Breda", provincie: "Noord-Brabant", lat: 51.5712, lon: 4.8012, oppervlakteM2: 3100 },

  // ── Haarlemmermeer (Noord-Holland) ────────────────────────────────────────
  { adres: "Rijnlanderweg 1663, Nieuw-Vennep", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.2712, lon: 4.6178, oppervlakteM2: 3500 },
  { adres: "Aarbergerweg 22, Rijsenhout", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.2345, lon: 4.6823, oppervlakteM2: 2600 },
  { adres: "IJweg 480, Nieuw-Vennep", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.2589, lon: 4.6012, oppervlakteM2: 3800 },
];

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
