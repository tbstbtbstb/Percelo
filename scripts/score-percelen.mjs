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
  // Extreem hoge woningdruk, tussen Den Haag en Delft, glastuinbouw converteert
  { adres: "Brasserkade 40, Pijnacker", gemeente: "Pijnacker-Nootdorp", provincie: "Zuid-Holland", lat: 51.9978, lon: 4.4312, oppervlakteM2: 2400 },
  { adres: "Veenweg 80, Pijnacker", gemeente: "Pijnacker-Nootdorp", provincie: "Zuid-Holland", lat: 52.0089, lon: 4.4089, oppervlakteM2: 2800 },
  { adres: "Groeneweg 60, Nootdorp", gemeente: "Pijnacker-Nootdorp", provincie: "Zuid-Holland", lat: 52.0201, lon: 4.3923, oppervlakteM2: 2100 },

  // ── Lansingerland (Zuid-Holland) ────────────────────────────────────────
  // Snelst groeiende gemeente ZH, tientallen woningbouw-precedenten
  { adres: "Berkelse Zweth 80, Lansingerland", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9889, lon: 4.5012, oppervlakteM2: 3100 },
  { adres: "Rodenrijseweg 200, Lansingerland", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9654, lon: 4.5445, oppervlakteM2: 1900 },
  { adres: "Kruisweg 30, Bergschenhoek", gemeente: "Lansingerland", provincie: "Zuid-Holland", lat: 51.9812, lon: 4.4778, oppervlakteM2: 2600 },

  // ── Houten (Utrecht) ────────────────────────────────────────────────────
  // Groeikern Utrecht, veel historische precedenten, actief gemeente
  { adres: "Doornseweg 120, Houten", gemeente: "Houten", provincie: "Utrecht", lat: 52.0178, lon: 5.1823, oppervlakteM2: 2800 },
  { adres: "Randweg 80, Houten", gemeente: "Houten", provincie: "Utrecht", lat: 52.0312, lon: 5.1612, oppervlakteM2: 2300 },
  { adres: "Steenhovenweg 40, Houten", gemeente: "Houten", provincie: "Utrecht", lat: 52.0089, lon: 5.1978, oppervlakteM2: 3100 },

  // ── Nieuwegein (Utrecht) ─────────────────────────────────────────────────
  // Direct grenst aan Utrecht, hoge woningvraag, beperkte ruimte
  { adres: "Zandpad 60, Nieuwegein", gemeente: "Nieuwegein", provincie: "Utrecht", lat: 52.0289, lon: 5.0834, oppervlakteM2: 2000 },
  { adres: "Batauweg 100, Nieuwegein", gemeente: "Nieuwegein", provincie: "Utrecht", lat: 52.0423, lon: 5.0678, oppervlakteM2: 1800 },

  // ── Veenendaal (Utrecht) ─────────────────────────────────────────────────
  // Foodvalley hart, hoge woningdruk, actief woonbeleid
  { adres: "Rhenenseweg 200, Veenendaal", gemeente: "Veenendaal", provincie: "Utrecht", lat: 52.0123, lon: 5.5534, oppervlakteM2: 2600 },
  { adres: "Industrieweg 80, Veenendaal", gemeente: "Veenendaal", provincie: "Utrecht", lat: 52.0278, lon: 5.5312, oppervlakteM2: 2200 },

  // ── Wageningen (Gelderland) ──────────────────────────────────────────────
  // Universiteitsstad, extreme woningnood, agrarische rand
  { adres: "Droevendaalsesteeg 10, Wageningen", gemeente: "Wageningen", provincie: "Gelderland", lat: 51.9823, lon: 5.6612, oppervlakteM2: 2400 },
  { adres: "Bornsesteeg 80, Wageningen", gemeente: "Wageningen", provincie: "Gelderland", lat: 51.9712, lon: 5.6823, oppervlakteM2: 2800 },

  // ── Ede (Gelderland) ────────────────────────────────────────────────────
  // Foodvalley, grote woningbouwopgave, weinig NNN aan westzijde
  { adres: "Telefoonweg 100, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0512, lon: 5.6123, oppervlakteM2: 3800 },
  { adres: "Bennekomseweg 200, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0334, lon: 5.6734, oppervlakteM2: 2900 },
  { adres: "Wiekslag 40, Ede", gemeente: "Ede", provincie: "Gelderland", lat: 52.0678, lon: 5.6312, oppervlakteM2: 2400 },

  // ── Nijkerk (Gelderland) ────────────────────────────────────────────────
  // Gelderse Vallei, tussen Utrecht en Amersfoort, hoge druk
  { adres: "Holkerweg 80, Nijkerk", gemeente: "Nijkerk", provincie: "Gelderland", lat: 52.2234, lon: 5.4789, oppervlakteM2: 2800 },
  { adres: "Corlaerseweg 120, Nijkerk", gemeente: "Nijkerk", provincie: "Gelderland", lat: 52.2089, lon: 5.4934, oppervlakteM2: 3400 },

  // ── Son en Breugel (Noord-Brabant) ──────────────────────────────────────
  // Direct bij Eindhoven, Brainport, weinig NNN, hoge grondwaarde
  { adres: "Ekkersrijt 80, Son en Breugel", gemeente: "Son en Breugel", provincie: "Noord-Brabant", lat: 51.5189, lon: 5.5023, oppervlakteM2: 2600 },
  { adres: "Breugelse Bossen rand, Son", gemeente: "Son en Breugel", provincie: "Noord-Brabant", lat: 51.5312, lon: 5.4823, oppervlakteM2: 3000 },
  { adres: "Sonseweg 120, Son en Breugel", gemeente: "Son en Breugel", provincie: "Noord-Brabant", lat: 51.5089, lon: 5.5189, oppervlakteM2: 2200 },

  // ── Veldhoven (Noord-Brabant) ────────────────────────────────────────────
  // ASML-effect: extreem hoge woningvraag, weinig beschikbare grond
  { adres: "Oerleseweg 60, Veldhoven", gemeente: "Veldhoven", provincie: "Noord-Brabant", lat: 51.4012, lon: 5.3834, oppervlakteM2: 2400 },
  { adres: "Heerbaan 200, Veldhoven", gemeente: "Veldhoven", provincie: "Noord-Brabant", lat: 51.4178, lon: 5.4012, oppervlakteM2: 2800 },

  // ── Waalwijk (Noord-Brabant) ─────────────────────────────────────────────
  // Actieve woningbouwgemeente, weinig NNN, goede infrastructuur
  { adres: "Taxandriaweg 80, Waalwijk", gemeente: "Waalwijk", provincie: "Noord-Brabant", lat: 51.6878, lon: 5.0534, oppervlakteM2: 3200 },
  { adres: "Baardwijksche Overlaat, Waalwijk", gemeente: "Waalwijk", provincie: "Noord-Brabant", lat: 51.7012, lon: 5.0312, oppervlakteM2: 2800 },

  // ── Tilburg rand (Noord-Brabant) ────────────────────────────────────────
  // Grote stad, groeirand, hoge woningvraag, historische precedenten
  { adres: "Udenhoutseweg 150, Tilburg", gemeente: "Tilburg", provincie: "Noord-Brabant", lat: 51.5823, lon: 5.1312, oppervlakteM2: 3400 },
  { adres: "Bredaseweg 500, Tilburg", gemeente: "Tilburg", provincie: "Noord-Brabant", lat: 51.5534, lon: 4.9923, oppervlakteM2: 2900 },

  // ── Alphen-Chaam (Noord-Brabant) ────────────────────────────────────────
  // Kleine gemeente, veel agrarische gronden, naast Breda
  { adres: "Alphenseweg 80, Alphen-Chaam", gemeente: "Alphen-Chaam", provincie: "Noord-Brabant", lat: 51.4978, lon: 4.9312, oppervlakteM2: 3800 },

  // ── Harderwijk (Gelderland) ──────────────────────────────────────────────
  // Veluwerand, hoge woningdruk, actieve gemeente
  { adres: "Zeeasterweg 60, Harderwijk", gemeente: "Harderwijk", provincie: "Gelderland", lat: 52.3423, lon: 5.6312, oppervlakteM2: 2600 },
  { adres: "Leuvenumseweg 100, Harderwijk", gemeente: "Harderwijk", provincie: "Gelderland", lat: 52.3589, lon: 5.6089, oppervlakteM2: 3100 },

  // ── Apeldoorn westzijde (Gelderland) ────────────────────────────────────
  // Westzijde = weinig Veluwe/NNN, hoge woningvraag, groot grondgebied
  { adres: "Kayersdijk 150, Apeldoorn", gemeente: "Apeldoorn", provincie: "Gelderland", lat: 52.2178, lon: 5.9412, oppervlakteM2: 3600 },
  { adres: "Laan van Malkenschoten 40, Apeldoorn", gemeente: "Apeldoorn", provincie: "Gelderland", lat: 52.2312, lon: 5.9234, oppervlakteM2: 2800 },

  // ── Zeewolde (Flevoland) ─────────────────────────────────────────────────
  // Geplande groeikern, goede infrastructuur, weinig beperkingen
  { adres: "Gooiseweg 200, Zeewolde", gemeente: "Zeewolde", provincie: "Flevoland", lat: 52.3312, lon: 5.5289, oppervlakteM2: 4200 },
  { adres: "Elspeterweg 80, Zeewolde", gemeente: "Zeewolde", provincie: "Flevoland", lat: 52.3489, lon: 5.5089, oppervlakteM2: 3600 },

  // ── Almere Poort rand (Flevoland) ───────────────────────────────────────
  // Massieve uitbreidingsopgave, actief gemeentebeleid, geen NNN
  { adres: "Hogering 300, Almere", gemeente: "Almere", provincie: "Flevoland", lat: 52.3623, lon: 5.2123, oppervlakteM2: 3200 },
  { adres: "Edvard Munchweg 60, Almere", gemeente: "Almere", provincie: "Flevoland", lat: 52.3789, lon: 5.1923, oppervlakteM2: 2700 },

  // ── Dordrecht rand (Zuid-Holland) ───────────────────────────────────────
  // Eiland van Dordrecht, agrarische randen, hoge regionale druk
  { adres: "Wieldrechtseweg 80, Dordrecht", gemeente: "Dordrecht", provincie: "Zuid-Holland", lat: 51.7989, lon: 4.6623, oppervlakteM2: 3400 },
  { adres: "Baanhoekweg 120, Dordrecht", gemeente: "Dordrecht", provincie: "Zuid-Holland", lat: 51.8123, lon: 4.6834, oppervlakteM2: 2600 },

  // ── Rijswijk (Zuid-Holland) ──────────────────────────────────────────────
  // Direct bij Den Haag, schaarse grond, hoge waarde
  { adres: "Vlietweg 60, Rijswijk", gemeente: "Rijswijk", provincie: "Zuid-Holland", lat: 52.0334, lon: 4.3234, oppervlakteM2: 1800 },

  // ── Zoetermeer rand (Zuid-Holland) ──────────────────────────────────────
  // Grenst aan Randstad, actieve uitbreidingslocaties
  { adres: "Afrikaweg 40, Zoetermeer", gemeente: "Zoetermeer", provincie: "Zuid-Holland", lat: 52.0623, lon: 4.4723, oppervlakteM2: 2200 },

  // ── Katwijk (Zuid-Holland) ──────────────────────────────────────────────
  // Kustgemeente, beperkte ruimte, hoge grondwaarden
  { adres: "Duinweg 110, Katwijk", gemeente: "Katwijk", provincie: "Zuid-Holland", lat: 52.2023, lon: 4.4067, oppervlakteM2: 1600 },
  { adres: "Rijnsoever 40, Katwijk", gemeente: "Katwijk", provincie: "Zuid-Holland", lat: 52.2156, lon: 4.4312, oppervlakteM2: 2200 },

  // ── Zwolle westzijde (Overijssel) ───────────────────────────────────────
  // Groeikern Noord-Nederland, westzijde = weinig NNN
  { adres: "Meppelerweg 150, Zwolle", gemeente: "Zwolle", provincie: "Overijssel", lat: 52.5312, lon: 6.0534, oppervlakteM2: 2700 },
  { adres: "Zwolseweg 300, Zwolle", gemeente: "Zwolle", provincie: "Overijssel", lat: 52.5123, lon: 6.0789, oppervlakteM2: 3200 },

  // ── Barneveld (Gelderland) ──────────────────────────────────────────────
  // Foodvalley, actief woonbeleid, weinig NNN aan noordzijde
  { adres: "Barnseweg 150, Barneveld", gemeente: "Barneveld", provincie: "Gelderland", lat: 52.1423, lon: 5.5834, oppervlakteM2: 4200 },
  { adres: "Garderenseweg 60, Barneveld", gemeente: "Barneveld", provincie: "Gelderland", lat: 52.1589, lon: 5.5612, oppervlakteM2: 3100 },

  // ── Breda westzijde (Noord-Brabant) ────────────────────────────────────
  // Grote stad, westzijde = minder NNN, veel precedenten
  { adres: "Teteringseweg 150, Breda", gemeente: "Breda", provincie: "Noord-Brabant", lat: 51.5712, lon: 4.8012, oppervlakteM2: 3100 },
  { adres: "Bredaseweg 400, Breda", gemeente: "Breda", provincie: "Noord-Brabant", lat: 51.5923, lon: 4.7534, oppervlakteM2: 2600 },

  // ── Haarlemmermeer (Noord-Holland) ──────────────────────────────────────
  // Polderland, sterke woningvraag, nabij Schiphol
  { adres: "Hoofdweg 500, Haarlemmermeer", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.3011, lon: 4.6543, oppervlakteM2: 3200 },
  { adres: "Kruisweg 820, Haarlemmermeer", gemeente: "Haarlemmermeer", provincie: "Noord-Holland", lat: 52.3198, lon: 4.7103, oppervlakteM2: 1800 },
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
  const IS_TRANSFORMABEL_RE = /^agrarisch|^natuur|^recreatie|^groen|^landelijk/i;

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
