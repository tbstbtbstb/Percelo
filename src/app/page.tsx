"use client";

import Link from "next/link";
import { Button, Tag, Tile } from "@carbon/react";
import {
  ArrowRight,
  CheckmarkFilled,
  ChartLineSmooth,
  Document,
  Flag,
  Growth,
  Location,
  Email,
  StarFilled,
} from "@carbon/icons-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const STATS = [
  { waarde: "1.200+", label: "analyses uitgevoerd" },
  { waarde: "36",     label: "gemeenten gedekt" },
  { waarde: "4.8/5",  label: "gebruikersscore" },
  { waarde: "9",      label: "ruimtelijke factoren" },
];

const FEATURES = [
  { icon: ChartLineSmooth, titel: "Kansscoring",             beschrijving: "Score op 9 factoren: bestemmingsplan, woningtekort, Natura2000, ladder duurzame verstedelijking en meer." },
  { icon: Document,        titel: "AI-rapport",              beschrijving: "Juridische onderbouwing per factor, specifiek voor uw perceel, gemeente en provincie." },
  { icon: Flag,            titel: "Actieplan",               beschrijving: "Stap-voor-stap procedure van principeverzoek tot vaststelling, met doorlooptijden en risico's." },
  { icon: Growth,          titel: "Waardestijging",          beschrijving: "Indicatieve berekening van agrarische waarde naar bouwgrondwaarde — inclusief conversiekosten." },
  { icon: Location,        titel: "Kostenraming",            beschrijving: "Alle verplichte onderzoeken, leges en advieskosten per fase — gebaseerd op marktprijzen 2024–2025." },
  { icon: Email,           titel: "Verzendklare brieven",    beschrijving: "Principeverzoek, informatievraag provincie en vooroverleg omgevingsdienst — direct klaar voor gebruik." },
];

const STAPPEN = [
  { nummer: "01", titel: "Voer uw adres in",         beschrijving: "Typ een adres of perceelnummer. Percelo haalt automatisch de kadastrale gegevens en locatie op." },
  { nummer: "02", titel: "AI analyseert uw perceel", beschrijving: "9 ruimtelijke factoren worden gelijktijdig getoetst aan bestemmingsplannen, beleid en precedenten." },
  { nummer: "03", titel: "Ontvang uw rapport",       beschrijving: "Binnen 60 seconden een complete analyse: score, actieplan, kosten, waardestijging en brieven." },
];

const TESTIMONIALS = [
  {
    naam: "Jan Vermeer",
    rol: "Agrariër, Drenthe",
    tekst: "Ik dacht dat de procedure jaren zou duren en enorm duur zou zijn. Percelo gaf me in één overzicht precies wat ik moest doen en wat het zou kosten. De score van 74 bleek realistisch — de gemeente reageerde positief op mijn principeverzoek.",
    score: 5,
  },
  {
    naam: "Sophie Bakker",
    rol: "Vastgoedinvesteerder, Utrecht",
    tekst: "Ik beoordeel maandelijks meerdere percelen op potentie. Voorheen besteedde ik dat uit aan adviseurs. Met Percelo doe ik een eerste filter in minuten en schakel ik pas een adviseur in als de score interessant genoeg is.",
    score: 5,
  },
  {
    naam: "Pieter de Groot",
    rol: "Particulier, Noord-Brabant",
    tekst: "Het perceel van mijn vader stond al jaren te wachten. Percelo maakte duidelijk dat de ligging naast een Natura2000-gebied het risico hoog maakte — dat had me veel geld en tijd bespaard als ik dit eerder had geweten.",
    score: 4,
  },
];

const TIERS = [
  {
    naam: "Starter",
    prijs: 0,
    beschrijving: "Gratis voor altijd",
    features: ["1 analyse per maand", "Kansscoring", "Samenvatting rapport", "Actieplan (beperkt)"],
    cta: "Begin gratis",
    aanbevolen: false,
  },
  {
    naam: "Pro",
    prijs: 49,
    beschrijving: "Voor serieuze initiatieven",
    features: ["10 analyses per maand", "Volledig AI-rapport", "Actieplan + kostenraming", "Waardestijgingsberekening", "Verzendklare brieven & e-mails", "PDF-export", "Analyses opslaan"],
    cta: "Start Pro",
    aanbevolen: true,
  },
  {
    naam: "Business",
    prijs: 199,
    beschrijving: "Voor adviseurs & ontwikkelaars",
    features: ["Onbeperkte analyses", "Alles uit Pro", "Gemeentevergelijker", "Portefeuillebeheer", "Monitoring & alerts", "Prioriteit support"],
    cta: "Neem contact op",
    aanbevolen: false,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function KadastraleAchtergrond() {
  return (
    <svg
      viewBox="0 0 1400 500"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <defs>
        <radialGradient id="heroVignette" cx="50%" cy="46%" r="62%">
          <stop offset="0%"   stopColor="#161616" stopOpacity="0.96" />
          <stop offset="45%"  stopColor="#161616" stopOpacity="0.88" />
          <stop offset="75%"  stopColor="#161616" stopOpacity="0.52" />
          <stop offset="100%" stopColor="#161616" stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* ── Wegen / sloten ── */}
      <path d="M0,244 Q350,237 700,241 Q1050,245 1400,239 L1400,261 Q1050,267 700,263 Q350,259 0,266 Z"
        fill="#071620" fillOpacity="0.85" />
      <rect x="305" y="0" width="17" height="500" fill="#071620" fillOpacity="0.85" />
      <rect x="655" y="0" width="17" height="500" fill="#071620" fillOpacity="0.85" />
      <rect x="1005" y="0" width="17" height="500" fill="#071620" fillOpacity="0.85" />
      <path d="M0,117 Q700,111 1400,115 L1400,126 Q700,132 0,128 Z" fill="#071620" fillOpacity="0.6" />
      <path d="M0,374 Q700,368 1400,372 L1400,383 Q700,389 0,385 Z" fill="#071620" fillOpacity="0.6" />

      {/* ── Reguliere percelen ── */}
      <g fill="#1a3d5c" stroke="#2b6a96" strokeWidth="1.5" fillOpacity="0.42" strokeOpacity="0.7">
        {/* Rij boven-links */}
        <polygon points="2,2 305,2 303,62 2,65" />
        <polygon points="2,65 303,62 301,117 2,119" />
        {/* Rij boven-midden-links: smalle stroken (polder) */}
        <polygon points="322,2 408,1 406,117 322,119" />
        <polygon points="408,1 490,2 488,117 406,117" />
        <polygon points="490,2 572,1 570,117 488,117" />
        <polygon points="572,1 655,2 653,117 570,117" />
        {/* Rij boven-midden-rechts */}
        <polygon points="672,2 790,1 788,62 672,64" />
        <polygon points="672,64 788,62 786,117 672,119" />
        <polygon points="790,1 890,2 888,117 788,117" />
        <polygon points="890,2 1005,1 1003,117 888,117" />
        {/* Rij boven-rechts */}
        <polygon points="1022,2 1185,4 1183,117 1022,119" />
        <polygon points="1185,4 1398,2 1396,117 1183,117" />
        {/* Midden-links */}
        <polygon points="2,131 305,129 303,241 2,243" />
        {/* Midden-midden (rechts van gemarkeerde) */}
        <polygon points="492,129 575,131 573,241 490,243" />
        <polygon points="575,131 655,129 653,241 573,241" />
        {/* Midden-rechts */}
        <polygon points="672,129 756,131 754,241 672,243" />
        <polygon points="756,131 840,129 838,241 754,241" />
        <polygon points="840,129 928,131 926,241 838,241" />
        <polygon points="928,131 1005,129 1003,241 926,241" />
        {/* Midden ver-rechts */}
        <polygon points="1022,131 1395,129 1392,241 1022,243" />
        {/* Rij onder-links */}
        <polygon points="2,267 145,265 143,374 2,376" />
        <polygon points="145,265 305,267 303,374 143,374" />
        {/* Rij onder-midden */}
        <polygon points="322,265 492,263 490,374 322,376" />
        <polygon points="492,263 655,265 653,374 490,374" />
        {/* Rij onder-rechts: smalle stroken */}
        <polygon points="672,263 732,265 730,374 672,376" />
        <polygon points="732,265 792,263 790,374 730,374" />
        <polygon points="792,263 854,265 852,374 790,374" />
        <polygon points="854,265 922,263 920,374 852,374" />
        <polygon points="922,263 1005,265 1003,374 920,374" />
        {/* Rij onder-ver-rechts */}
        <polygon points="1022,263 1205,265 1203,374 1022,376" />
        <polygon points="1205,265 1398,263 1396,374 1203,374" />
        {/* Rij laagste */}
        <polygon points="2,387 205,385 203,498 2,498" />
        <polygon points="205,385 305,387 303,498 203,498" />
        <polygon points="322,385 555,383 553,498 322,498" />
        <polygon points="555,383 655,385 653,498 553,498" />
        <polygon points="672,383 825,385 823,498 672,498" />
        <polygon points="825,385 1005,383 1003,498 823,498" />
        <polygon points="1022,383 1225,385 1223,498 1022,498" />
        <polygon points="1225,385 1398,383 1396,498 1223,498" />
      </g>

      {/* ── Gemarkeerde percelen (worden geanalyseerd) ── */}
      <polygon points="322,129 492,131 490,241 322,243"
        fill="#0f62fe" stroke="#78a9ff" strokeWidth="2"
        fillOpacity="0.3" strokeOpacity="0.9" />
      <polygon points="672,2 790,1 788,62 672,64"
        fill="#24a148" stroke="#42be65" strokeWidth="2"
        fillOpacity="0.25" strokeOpacity="0.8" />

      {/* ── Locatie-pins ── */}
      <circle cx="407" cy="185" r="16" fill="#0f62fe" fillOpacity="0.35" />
      <circle cx="407" cy="185" r="6"  fill="#78a9ff" fillOpacity="0.95" />
      <circle cx="407" cy="185" r="6"  stroke="#ffffff" strokeWidth="1.5" fill="none" />

      <circle cx="731" cy="32"  r="12" fill="#24a148" fillOpacity="0.35" />
      <circle cx="731" cy="32"  r="5"  fill="#42be65" fillOpacity="0.95" />
      <circle cx="731" cy="32"  r="5"  stroke="#ffffff" strokeWidth="1.5" fill="none" />

      {/* ── Perceelnummer labels ── */}
      <g fill="#5b9ec9" fontSize="9" fontFamily="monospace" opacity="0.45">
        <text x="100" y="36">A 2841</text>
        <text x="350" y="55">B 1204</text>
        <text x="340" y="72">0.48 ha</text>
        <text x="693" y="35">C 0892</text>
        <text x="1090" y="55">D 3311</text>
        <text x="100" y="195">E 2845</text>
        <text x="334" y="165">F 1207</text>
        <text x="334" y="178">0.91 ha</text>
        <text x="860" y="195">G 0895</text>
        <text x="1185" y="195">H 3315</text>
        <text x="100" y="325">I 2848</text>
        <text x="390" y="320">J 1210</text>
        <text x="848" y="325">K 0898</text>
        <text x="1100" y="320">L 3318</text>
        <text x="100" y="440">M 2851</text>
        <text x="420" y="438">N 1213</text>
        <text x="720" y="440">O 0901</text>
        <text x="1100" y="438">P 3321</text>
      </g>

      {/* ── Vignette: donker centrum (tekst leesbaar), kaart zichtbaar aan randen ── */}
      <rect x="0" y="0" width="1400" height="500" fill="url(#heroVignette)" />
    </svg>
  );
}

function Sterren({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: "0.125rem" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarFilled key={i} size={14} style={{ color: i < n ? "#f1c21b" : "#e0e0e0" }} />
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        backgroundColor: "#161616",
        color: "#ffffff",
        padding: "5rem 1rem 4rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <KadastraleAchtergrond />
        <div style={{ maxWidth: "52rem", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <Tag type="blue" size="sm" style={{ marginBottom: "1.5rem" }}>
            Omgevingswet 2024 geïntegreerd
          </Tag>
          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "1.25rem",
          }}>
            Weet binnen 60 seconden of uw<br />
            <span style={{ color: "#78a9ff" }}>grond bouwbaar kan worden</span>
          </h1>
          <p style={{
            fontSize: "1.125rem",
            color: "#a8b3c1",
            maxWidth: "36rem",
            margin: "0 auto 2.5rem",
            lineHeight: 1.6,
          }}>
            Percelo analyseert 9 ruimtelijke factoren en geeft u een complete analyse — van kansscoring tot verzendklare brieven.
          </p>
          <div className="percelo-hero-cta" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/analyse">
              <Button size="lg" renderIcon={ArrowRight}>
                Start gratis analyse
              </Button>
            </Link>
            <Link href="#hoe-het-werkt">
              <Button size="lg" kind="tertiary">
                Hoe werkt het?
              </Button>
            </Link>
          </div>
          <p style={{ marginTop: "1.25rem", fontSize: "0.8125rem", color: "#6f6f6f" }}>
            Eerste analyse gratis · Geen creditcard vereist
          </p>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#0f62fe", padding: "2rem 1rem" }}>
        <div style={{
          maxWidth: "52rem", margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
          gap: "1.5rem", textAlign: "center",
        }}>
          {STATS.map(({ waarde, label }) => (
            <div key={label}>
              <p style={{ fontSize: "2rem", fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>{waarde}</p>
              <p style={{ fontSize: "0.8125rem", color: "#a6c8ff", marginTop: "0.25rem" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#f4f4f4", padding: "5rem 1rem" }}>
        <div style={{ maxWidth: "60rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Alles in één analyse</h2>
            <p style={{ color: "#525252", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
              Van eerste scan tot verzendklare brieven — geen losse tools meer
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(17rem, 1fr))",
            gap: "1px",
            backgroundColor: "#e0e0e0",
          }}>
            {FEATURES.map(({ icon: Icon, titel, beschrijving }) => (
              <div key={titel} style={{ backgroundColor: "#ffffff", padding: "1.75rem 1.5rem" }}>
                <div style={{
                  width: "2.5rem", height: "2.5rem", backgroundColor: "#edf5ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                }}>
                  <Icon size={20} style={{ color: "#0f62fe" }} />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.5rem" }}>{titel}</h3>
                <p style={{ fontSize: "0.8125rem", color: "#525252", lineHeight: 1.6 }}>{beschrijving}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOE HET WERKT ────────────────────────────────────────────────── */}
      <section id="hoe-het-werkt" style={{ padding: "5rem 1rem", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Drie stappen, één rapport</h2>
            <p style={{ color: "#525252", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
              Geen account vereist voor de eerste analyse
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {STAPPEN.map(({ nummer, titel, beschrijving }, i) => (
              <div key={nummer} style={{
                display: "flex", gap: "2rem", alignItems: "flex-start",
                padding: "2rem 0",
                borderBottom: i < STAPPEN.length - 1 ? "1px solid #e0e0e0" : "none",
              }}>
                <div style={{
                  flexShrink: 0, width: "3.5rem", height: "3.5rem",
                  backgroundColor: "#161616", color: "#78a9ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1rem", fontWeight: 700, fontFamily: "var(--cds-code-01-font-family, monospace)",
                }}>
                  {nummer}
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: "1.0625rem", marginBottom: "0.5rem" }}>{titel}</h3>
                  <p style={{ fontSize: "0.875rem", color: "#525252", lineHeight: 1.6 }}>{beschrijving}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link href="/analyse">
              <Button renderIcon={ArrowRight}>Probeer het zelf</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#f4f4f4", padding: "5rem 1rem" }}>
        <div style={{ maxWidth: "60rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Wat gebruikers zeggen</h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
            gap: "1rem",
          }}>
            {TESTIMONIALS.map(({ naam, rol, tekst, score }) => (
              <Tile key={naam} style={{ padding: "1.75rem", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Sterren n={score} />
                <p style={{ fontSize: "0.875rem", color: "#393939", lineHeight: 1.7, flex: 1 }}>
                  &ldquo;{tekst}&rdquo;
                </p>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{naam}</p>
                  <p style={{ fontSize: "0.75rem", color: "#525252" }}>{rol}</p>
                </div>
              </Tile>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="prijzen" style={{ padding: "5rem 1rem", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "60rem", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Transparante prijzen</h2>
            <p style={{ color: "#525252", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
              Maandelijks opzegbaar · Geen verborgen kosten
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(17rem, 1fr))",
            gap: "1rem",
            alignItems: "start",
          }}>
            {TIERS.map(({ naam, prijs, beschrijving, features, cta, aanbevolen }) => (
              <div key={naam} style={{
                border: aanbevolen ? "2px solid #0f62fe" : "1px solid #e0e0e0",
                backgroundColor: aanbevolen ? "#edf5ff" : "#ffffff",
                padding: "2rem 1.5rem",
                position: "relative",
              }}>
                {aanbevolen && (
                  <div style={{
                    position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%) translateY(-50%)",
                  }}>
                    <Tag type="blue" size="sm">Meest gekozen</Tag>
                  </div>
                )}
                <p style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: "0.25rem" }}>{naam}</p>
                <p style={{ fontSize: "0.8125rem", color: "#525252", marginBottom: "1.25rem" }}>{beschrijving}</p>
                <div style={{ marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1 }}>
                    {prijs === 0 ? "Gratis" : `€${prijs}`}
                  </span>
                  {prijs > 0 && (
                    <span style={{ fontSize: "0.875rem", color: "#525252" }}>/maand</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "2rem" }}>
                  {features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <CheckmarkFilled size={16} style={{ color: "#24a148", flexShrink: 0, marginTop: "0.125rem" }} />
                      <span style={{ fontSize: "0.8125rem", color: "#393939" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href={naam === "Business" ? "/contact" : "/analyse"} style={{ display: "block" }}>
                  <Button
                    kind={aanbevolen ? "primary" : "secondary"}
                    style={{ width: "100%", maxWidth: "100%", justifyContent: "center" }}
                  >
                    {cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#161616", padding: "5rem 1rem", textAlign: "center" }}>
        <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ffffff", marginBottom: "1rem" }}>
            Klaar om uw perceel te analyseren?
          </h2>
          <p style={{ color: "#a8b3c1", fontSize: "0.9375rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
            Meer dan 1.200 eigenaren, investeerders en adviseurs gingen u voor. De eerste analyse is gratis.
          </p>
          <Link href="/analyse">
            <Button size="lg" renderIcon={ArrowRight}>
              Start gratis analyse
            </Button>
          </Link>
          <p style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "#6f6f6f" }}>
            Geen registratie vereist voor de eerste analyse
          </p>
        </div>
      </section>

    </div>
  );
}
