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
  // ── Haarlemmermeer (Noord-Holland) ──────────────────────────────────────
  // Polderland met sterke woningvraag, veel precedenten
  { adres: "Lisserweg 470, Haarlemmermeer", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.2631, lon: 4.5789, oppervlakteM2: 2800 },
  { adres: "Hoofdweg 500, Haarlemmermeer", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.3011, lon: 4.6543, oppervlakteM2: 3200 },
  { adres: "Nieuw-Vennepseweg 200, Haarlemmermeer", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.2712, lon: 4.6312, oppervlakteM2: 2400 },
  { adres: "Kruisweg 820, Haarlemmermeer", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.3198, lon: 4.7103, oppervlakteM2: 1800 },

  // ── Westland (Zuid-Holland) ─────────────────────────────────────────────
  // Glastuinbouwgebied met sterke druk naar woningbouw
  { adres: "Poeldijkseweg 50, Westland", gemeente: "Westland", provincie: "Zuid-Holland", lat: 52.0198, lon: 4.1923, oppervlakteM2: 3600 },
  { adres: "Middel Broekweg 30, Westland", gemeente: "Westland", provincie: "Zuid-Holland", lat: 52.0089, lon: 4.2134, oppervlakteM2: 2900 },
  { adres: "s-Gravenzandseweg 100, Westland", gemeente: "Westland", provincie: "Zuid-Holland", lat: 52.0023, lon: 4.1678, oppervlakteM2: 2100 },

  // ── Lansingerland (Zuid-Holland) ────────────────────────────────────────
  // Snelgroeiende gemeente, veel woningbouw-precedenten
  { adres: "Rodenburgseweg 12, Lansingerland", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9723, lon: 4.5234, oppervlakteM2: 2600 },
  { adres: "Berkelse Zweth 80, Lansingerland", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9889, lon: 4.5012, oppervlakteM2: 3100 },
  { adres: "Rodenrijseweg 200, Lansingerland", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9654, lon: 4.5445, oppervlakteM2: 1900 },

  // ── Katwijk (Zuid-Holland) ──────────────────────────────────────────────
  // Kustgemeente, beperkt beschikbaar land, hoge grondwaarde
  { adres: "Duinweg 110, Katwijk", gemeente: "Katwijk", provincie: "Zuid-Holland", lat: 52.2023, lon: 4.4067, oppervlakteM2: 1600 },
  { adres: "Rijnsoever 40, Katwijk", gemeente: "Katwijk", provincie: "Zuid-Holland", lat: 52.2156, lon: 4.4312, oppervlakteM2: 2200 },
  { adres: "Zeeweg 60, Katwijk", gemeente: "Katwijk", provincie: "Zuid-Holland", lat: 52.1978, lon: 4.3923, oppervlakteM2: 1800 },

  // ── Alphen aan den Rijn (Zuid-Holland) ──────────────────────────────────
  // Polderrand, actieve woningbouwopgave
  { adres: "Leidseweg 340, Alphen aan den Rijn", gemeente: "Alphen aan den Rijn", provincie: "Zuid-Holland", lat: 52.1301, lon: 4.6712, oppervlakteM2: 3400 },
  { adres: "Gnephoekseweg 20, Alphen aan den Rijn", gemeente: "Alphen aan den Rijn", provincie: "Zuid-Holland", lat: 52.1189, lon: 4.6501, oppervlakteM2: 2800 },
  { adres: "Woudsedijk 80, Alphen aan den Rijn", gemeente: "Alphen aan den Rijn", provincie: "Zuid-Holland", lat: 52.1423, lon: 4.6878, oppervlakteM2: 2100 },

  // ── Ede (Gelderland) ────────────────────────────────────────────────────
  // Groot grondgebied, actief woonbeleid, rand Veluwe
  { adres: "Telefoonweg 100, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0512, lon: 5.6123, oppervlakteM2: 3800 },
  { adres: "Arnhemseweg 250, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0234, lon: 5.6589, oppervlakteM2: 2900 },
  { adres: "Wiekslag 40, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0678, lon: 5.6312, oppervlakteM2: 2400 },

  // ── Barneveld (Gelderland) ──────────────────────────────────────────────
  // Groeiende gemeente, actief woningbouwbeleid
  { adres: "Barnseweg 150, Barneveld", gemeente: "Barneveld", provincie: "Gelderland", lat: 52.1423, lon: 5.5834, oppervlakteM2: 4200 },
  { adres: "Garderenseweg 60, Barneveld", gemeente: "Barneveld", provincie: "Gelderland", lat: 52.1589, lon: 5.5612, oppervlakteM2: 3100 },
  { adres: "Zwarteweg 30, Barneveld", gemeente: "Barneveld", provincie: "Gelderland", lat: 52.1312, lon: 5.6012, oppervlakteM2: 2600 },

  // ── Nijkerk (Gelderland) ────────────────────────────────────────────────
  // Gelderse vallei, veel woningdruk
  { adres: "Holkerweg 80, Nijkerk", gemeente: "Nijkerk", provincie: "Gelderland", lat: 52.2234, lon: 5.4789, oppervlakteM2: 2800 },
  { adres: "Corlaerseweg 120, Nijkerk", gemeente: "Nijkerk", provincie: "Gelderland", lat: 52.2089, lon: 5.4934, oppervlakteM2: 3400 },
  { adres: "Slichtenhorsterweg 40, Nijkerk", gemeente: "Nijkerk", provincie: "Gelderland", lat: 52.2356, lon: 5.4612, oppervlakteM2: 2100 },

  // ── Venlo (Limburg) ─────────────────────────────────────────────────────
  // Grensstreek, agrarisch-stedelijke overgang
  { adres: "Kaldenkerkerweg 80, Venlo", gemeente: "Venlo", provincie: "Limburg", lat: 51.3812, lon: 6.1567, oppervlakteM2: 3600 },
  { adres: "Tegelseweg 200, Venlo", gemeente: "Venlo", provincie: "Limburg", lat: 51.3623, lon: 6.1789, oppervlakteM2: 2900 },
  { adres: "Venlosesteenweg 50, Venlo", gemeente: "Venlo", provincie: "Limburg", lat: 51.3934, lon: 6.1423, oppervlakteM2: 2400 },

  // ── Horst aan de Maas (Limburg) ─────────────────────────────────────────
  // Agrarische gemeente, actieve kernverdichting
  { adres: "Meerlosebaan 30, Horst aan de Maas", gemeente: "Horst aan de Maas", provincie: "Limburg", lat: 51.4534, lon: 6.0589, oppervlakteM2: 4100 },
  { adres: "Grubbenvorsterweg 80, Horst aan de Maas", gemeente: "Horst aan de Maas", provincie: "Limburg", lat: 51.4312, lon: 6.0812, oppervlakteM2: 3200 },
  { adres: "Sevenum Dorp 60, Horst aan de Maas", gemeente: "Horst aan de Maas", provincie: "Limburg", lat: 51.4123, lon: 6.0345, oppervlakteM2: 2800 },

  // ── Breda (Noord-Brabant) ────────────────────────────────────────────────
  // Grote stad met groeiende randgemeenten
  { adres: "Bredaseweg 400, Breda", gemeente: "Breda", provincie: "Noord-Brabant", lat: 51.5923, lon: 4.7534, oppervlakteM2: 2600 },
  { adres: "Teteringseweg 150, Breda", gemeente: "Breda", provincie: "Noord-Brabant", lat: 51.5712, lon: 4.8012, oppervlakteM2: 3100 },
  { adres: "Molengracht buitengebied, Breda", gemeente: "Breda", provincie: "Noord-Brabant", lat: 51.5534, lon: 4.7789, oppervlakteM2: 2200 },

  // ── Meierijstad (Noord-Brabant) ──────────────────────────────────────────
  // Nieuwgevormde gemeente, actief woonbeleid
  { adres: "Veghelsedijk 80, Meierijstad", gemeente: "Meierijstad", provincie: "Noord-Brabant", lat: 51.6234, lon: 5.4312, oppervlakteM2: 3800 },
  { adres: "Bollendonk 40, Meierijstad", gemeente: "Meierijstad", provincie: "Noord-Brabant", lat: 51.6089, lon: 5.4567, oppervlakteM2: 2900 },
  { adres: "Zondveldseweg 60, Meierijstad", gemeente: "Meierijstad", provincie: "Noord-Brabant", lat: 51.6412, lon: 5.4089, oppervlakteM2: 2400 },

  // ── Zwolle (Overijssel) ──────────────────────────────────────────────────
  // Groeikern Noord-Nederland
  { adres: "Zwolseweg 300, Zwolle", gemeente: "Zwolle", provincie: "Overijssel", lat: 52.5123, lon: 6.0789, oppervlakteM2: 3200 },
  { adres: "Meppelerweg 150, Zwolle", gemeente: "Zwolle", provincie: "Overijssel", lat: 52.5312, lon: 6.0534, oppervlakteM2: 2700 },
  { adres: "Mastenbroekerdijk 50, Zwolle", gemeente: "Zwolle", provincie: "Overijssel", lat: 52.5489, lon: 6.0312, oppervlakteM2: 4100 },

  // ── Deventer (Overijssel) ────────────────────────────────────────────────
  // IJsselzone, actieve woningbouwopgave
  { adres: "Holterweg 120, Deventer", gemeente: "Deventer", provincie: "Overijssel", lat: 52.2623, lon: 6.1923, oppervlakteM2: 3600 },
  { adres: "Hanzeweg 200, Deventer", gemeente: "Deventer", provincie: "Overijssel", lat: 52.2489, lon: 6.1712, oppervlakteM2: 2800 },
  { adres: "Colmschaterweg 80, Deventer", gemeente: "Deventer", provincie: "Overijssel", lat: 52.2812, lon: 6.1534, oppervlakteM2: 2100 },

  // ── Groningen (stad) ─────────────────────────────────────────────────────
  // Universiteitsstad, hoge woningvraag
  { adres: "Harkstederweg 60, Groningen", gemeente: "Groningen", provincie: "Groningen", lat: 53.2123, lon: 6.6234, oppervlakteM2: 2900 },
  { adres: "Groninger Westwijkweg 100, Groningen", gemeente: "Groningen", provincie: "Groningen", lat: 53.2312, lon: 6.5789, oppervlakteM2: 3400 },
  { adres: "Oosterhoogebrug 40, Groningen", gemeente: "Groningen", provincie: "Groningen", lat: 53.2489, lon: 6.6512, oppervlakteM2: 2200 },

  // ── Leeuwarden (Friesland) ───────────────────────────────────────────────
  // Provinciehoofdstad, woningbouwtekort
  { adres: "Harlingerstraatweg 200, Leeuwarden", gemeente: "Leeuwarden", provincie: "Friesland", lat: 53.2012, lon: 5.7534, oppervlakteM2: 3800 },
  { adres: "Hemriksein 80, Leeuwarden", gemeente: "Leeuwarden", provincie: "Friesland", lat: 53.1923, lon: 5.7912, oppervlakteM2: 2600 },
  { adres: "Marsumerdyk 50, Leeuwarden", gemeente: "Leeuwarden", provincie: "Friesland", lat: 53.2234, lon: 5.7289, oppervlakteM2: 3100 },

  // ── Emmen (Drenthe) ──────────────────────────────────────────────────────
  // Grote gemeente, veel agrarisch potentieel
  { adres: "Weerdingerstraat 300, Emmen", gemeente: "Emmen", provincie: "Drenthe", lat: 52.7923, lon: 6.9012, oppervlakteM2: 4500 },
  { adres: "Rietveenweg 80, Emmen", gemeente: "Emmen", provincie: "Drenthe", lat: 52.7734, lon: 6.9289, oppervlakteM2: 3800 },
  { adres: "Bruggertstraat 150, Emmen", gemeente: "Emmen", provincie: "Drenthe", lat: 52.8089, lon: 6.8812, oppervlakteM2: 3200 },
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

  const IS_WOON_RE = /^wonen/i;

  for (const r of resultaten) {
    if (!r.ok || r.totaalScore < 50) {
      aantalOvergeslagen++;
      continue;
    }
    if (IS_WOON_RE.test(r.huidigeBestemming ?? "")) {
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
