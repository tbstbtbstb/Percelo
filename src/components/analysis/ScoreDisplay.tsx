"use client";

import { useState } from "react";
import { Tag } from "@carbon/react";
import { CheckmarkFilled, MisuseOutline, WarningAltFilled, ChevronDown, ChevronUp } from "@carbon/icons-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { ScoreKlasse, ScoreFactor, PrecedentPlan, HardBlocker } from "@/types";
import { PrecedentenModal } from "./PrecedentenModal";
import { Uitleg } from "@/components/ui/Uitleg";

const SCORE_CONFIG: Record<ScoreKlasse, {
  label: string;
  tagType: "green" | "teal" | "warm-gray" | "red";
  kleur: string;
  achtergrond: string;
}> = {
  "ultra-hoog": { label: "Ultra Hoog",  tagType: "green",     kleur: "#24a148", achtergrond: "#defbe6" },
  "hoog":       { label: "Hoog",        tagType: "teal",      kleur: "#007d79", achtergrond: "#d9fbfb" },
  "gemiddeld":  { label: "Gemiddeld",   tagType: "warm-gray", kleur: "#b28600", achtergrond: "#fdf6dd" },
  "laag":       { label: "Laag",        tagType: "warm-gray", kleur: "#b45309", achtergrond: "#fff3e0" },
  "ultra-laag": { label: "Ultra Laag",  tagType: "red",       kleur: "#da1e28", achtergrond: "#fff1f1" },
};

const BRON_TYPE_LABEL: Record<string, string> = {
  bestemmingsplan: "Plan",
  wet:             "Wet",
  data:            "Data",
  jurisprudentie:  "Jur.",
  kaart:           "Kaart",
};

const KORTE_NAAM: Record<string, string> = {
  "Bestemmingsplan": "Bestemming",
  "Afstand tot bebouwde kom": "Bebouwde kom",
  "Provinciale omgevingsvisie": "Prov. beleid",
  "Natura 2000 nabijheid": "Natura 2000",
  "Nationaal Natuur Netwerk": "NNN",
  "Historische precedenten": "Precedenten",
  "Netcongestie regio": "Netcongestie",
  "Bodemgesteldheid": "Bodem",
  "Gemeentelijke woonvisie": "Woonvisie",
  "Geluidshinder": "Geluid",
  "Erfgoed & beschermd gezicht": "Erfgoed",
  "Gemeentelijke woningbouwactiviteit": "Woningbouw",
};

function kortNaam(naam: string) {
  return KORTE_NAAM[naam] ?? (naam.length > 16 ? naam.slice(0, 14) + "…" : naam);
}

const FACTOR_UITLEG: Record<string, string> = {
  "Huidig bestemmingsplan":
    "Het bestemmingsplan legt per perceel vast wat er mag: wonen, landbouw, natuur, bedrijf, enzovoort. Een perceel met een agrarische bestemming heeft de meeste kans op omzetting naar wonen, zeker als het grenst aan bestaande bebouwing. Een perceel met een natuur- of waterbestemming heeft minder kans, tenzij de gemeente al bezig is met een planwijziging.",

  "Woningmarktdruk":
    "Woningmarktdruk geeft aan hoe groot het tekort aan woningen is in een gemeente. In gebieden waar de vraag naar woningen veel groter is dan het aanbod, staan gemeenten en provincies meer open voor nieuwe bouwlocaties. Een hoge druk vergroot de kans dat een bestemmingswijziging politiek en beleidsmatig wordt goedgekeurd.",

  "Provinciale omgevingsvisie":
    "Elke provincie heeft een omgevingsvisie: een langetermijnplan dat aangeeft welke gebieden geschikt zijn voor woningbouw, landbouw of natuur. Als de provincie een perceel aanwijst als zoekgebied voor woningbouw, vergroot dit de kans op goedkeuring aanzienlijk. Staat het gebied aangemerkt als 'geen verstedelijking', dan is een wijziging veel moeilijker door te voeren.",

  "Natura2000 & stikstof":
    "Natura 2000 is een Europees netwerk van beschermde natuur- en leefgebieden voor zeldzame planten en dieren. Ligt een perceel dicht bij zo'n gebied, dan moet bij een bouwplan worden aangetoond dat de werkzaamheden de natuur niet schaden. Dit gebeurt via een AERIUS-berekening: een computerprogramma dat uitrekent hoeveel stikstof een bouwproject uitstoot en of dat de nabijgelegen natuur verslechtert. Hoe verder het perceel van een Natura 2000-gebied, hoe eenvoudiger de procedure.",

  "Nutsvoorzieningen & infrastructuur":
    "Voordat er gebouwd kan worden, moeten riolering, water, gas en elektriciteit beschikbaar zijn. Als een perceel ver van bestaande aansluitpunten ligt, zijn extra aanlegkosten nodig. Ook de bereikbaarheid via wegen en fietspaden speelt een rol: een perceel zonder goede ontsluiting vereist extra investeringen die de haalbaarheid van een project beïnvloeden.",

  "Historische precedenten":
    "Een bestemmingswijziging die eerder al is toegestaan in dezelfde gemeente, werkt in uw voordeel. Het toont aan dat de gemeente bereid is om agrarische grond om te zetten naar woonbestemming. Hoe meer vergelijkbare gevallen zijn goedgekeurd, hoe sterker uw onderbouwing bij een nieuwe aanvraag.",

  "Ladder duurzame verstedelijking":
    "De Ladder voor duurzame verstedelijking is een wettelijke verplichting: bij elke nieuwe woonlocatie moet worden aangetoond dat er werkelijk behoefte is aan die woningen én dat er geen geschikte locaties binnen bestaand bebouwd gebied beschikbaar zijn. Hoe beter een perceel aan deze criteria voldoet — door de aantoonbare woningvraag en de ligging buiten de kern — hoe sterker de motivering die ingediend kan worden.",

  "Grondwater & bodemrisico":
    "De bodemgesteldheid zegt iets over de grondsoort en het grondwaterpeil. Klei en veen zijn slappe gronden waarbij diepere funderingen nodig zijn — dit maakt bouwen duurder. Een hoog grondwaterpeil kan problemen geven met kelders en kruipruimtes. Zandgrond en rivierklei zijn steviger en gunstiger voor bouwplannen.",

  "Netcongestie elektriciteit":
    "In delen van Nederland is het elektriciteitsnet zo vol dat netbeheerders als Liander of Stedin tijdelijk geen nieuwe aansluitingen kunnen realiseren. Voor individuele woningbouw is dit nu een beperkt obstakel, maar voor nieuwbouwwijken is netuitbreiding noodzakelijk. In gebieden met ernstige netcongestie kan dit een vertraging van meerdere jaren opleveren.",

  "Natuur Netwerk Nederland (NNN)":
    "Het Natuur Netwerk Nederland (NNN) is een groot aaneengesloten netwerk van beschermde natuurgebieden, vastgelegd door de provincies. Percelen die volledig binnen het NNN liggen, mogen in principe niet bebouwd worden. Ligt een perceel in de buurt maar er niet in, dan kan er soms nog wel gebouwd worden, maar vraagt de provincie een stevige extra motivering.",

  "Watertoets":
    "De watertoets is een verplichte stap bij ruimtelijke plannen: het waterschap beoordeelt of een bouwplan geen negatieve gevolgen heeft voor waterafvoer, waterberging of overstromingsrisico. In laaggelegen poldergebieden of gebieden met veel regenval is dit een kritischer factor. Een positieve watertoets is een vereiste voordat een bestemmingsplan kan worden vastgesteld.",

  "Leeftijd bestemmingsplan":
    "Een oud bestemmingsplan — ouder dan tien jaar — vergroot de kans op een succesvolle wijziging. Gemeenten zijn wettelijk verplicht om bestemmingsplannen actueel te houden, en bij een herziening worden nieuwe inzichten over woningbehoefte meegenomen. Een recent vastgesteld bestemmingsplan is moeilijker aan te passen, omdat de gemeente net een bewuste keuze heeft gemaakt.",

  "Geluidshinder":
    "Als een perceel dicht bij een drukke weg, spoorlijn of industrieterrein ligt, geldt er een geluidscontour: een zone waarbinnen de geluidsoverlast te hoog is voor woningbouw. Binnen die zone zijn extra maatregelen nodig, zoals geluidsisolatie of een geluidswal, of is bouwen soms helemaal niet toegestaan. Hoe verder het perceel van drukke wegen af, hoe kleiner dit probleem.",

  "Erfgoed & beschermd gezicht":
    "Als een perceel in of vlak naast een beschermd dorps- of stadsgezicht ligt, gelden extra regels voor de uitstraling van nieuwe gebouwen. Een rijks- of gemeentelijk monument in de buurt betekent dat plannen worden getoetst door de Rijksdienst voor het Cultureel Erfgoed (RCE) of de gemeentelijke monumentencommissie. Dit verlengt de procedure, maar is zelden een absolute blokkade.",

  "Gemeentelijke woonvisie":
    "Een woonvisie is een gemeentelijk beleidsplan over hoeveel woningen er nog nodig zijn en welk type. Een gemeente die in haar woonvisie aangeeft dat er te weinig woningen zijn en dat uitbreiding gewenst is, staat veel vaker open voor een bestemmingswijziging. Heeft de gemeente al voldoende woningbouwlocaties ingepland, dan neemt de kans op goedkeuring af.",
};

function formatToelichting(tekst: string) {
  return tekst.replace(/ — ([a-z])/g, (_, c) => `. ${c.toUpperCase()}`).replace(/ — /g, ". ");
}

const PRECEDENT_RE = /^(\d+ bestemmingswijziging(?:en)? vastgesteld)/;

function renderToelichting(tekst: string, onPrecedentClick?: () => void) {
  const formatted = formatToelichting(tekst);
  if (!onPrecedentClick) return formatted;
  const match = formatted.match(PRECEDENT_RE);
  if (!match) return formatted;
  const [clickable] = match;
  const rest = formatted.slice(clickable.length);
  return (
    <>
      <button
        onClick={onPrecedentClick}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", color: "inherit", fontSize: "inherit", fontFamily: "inherit", lineHeight: "inherit" }}
      >
        {clickable}
      </button>
      {rest}
    </>
  );
}

function factorKleur(score: number) {
  if (score >= 70) return "#24a148";
  if (score >= 40) return "#b28600";
  return "#da1e28";
}

function BronChips({ bronnen }: { bronnen: NonNullable<ScoreFactor["bronnen"]> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.625rem" }}>
      {bronnen.map((bron, i) => {
        const typeLabel = BRON_TYPE_LABEL[bron.type] ?? bron.type;
        const gemeenschappelijk: React.CSSProperties = {
          display: "inline-flex", alignItems: "center", gap: "0.3rem",
          padding: "0.25rem 0.625rem", borderRadius: "999px",
          fontSize: "0.6875rem", fontWeight: 500, lineHeight: 1.4,
          textDecoration: "none", border: "1px solid",
        };
        const inner = (
          <>
            <span style={{ fontWeight: 700, opacity: 0.7 }}>{typeLabel}</span>
            <span>{bron.label}</span>
          </>
        );
        if (bron.url) {
          return (
            <a key={i} href={bron.url} target="_blank" rel="noopener noreferrer"
              style={{ ...gemeenschappelijk, backgroundColor: "#edf5ff", color: "#0043ce", borderColor: "#a6c8ff" }}>
              {inner}
            </a>
          );
        }
        return (
          <span key={i} style={{ ...gemeenschappelijk, backgroundColor: "#f4f4f4", color: "#525252", borderColor: "#e0e0e0" }}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

function ScoreGauge({ score, kleur }: { score: number; kleur: string }) {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const omtrek = 2 * Math.PI * r;
  const gevuld = (score / 100) * omtrek;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
      {/* Achtergrondring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff" strokeWidth="10" />
      {/* Gekleurde boog */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={kleur}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${gevuld} ${omtrek - gevuld}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
      {/* Score getal */}
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
        fontSize="30" fontWeight="800" fill={kleur} fontFamily="system-ui, sans-serif">
        {score}
      </text>
      {/* /100 label */}
      <text x={cx} y={cy + 18} textAnchor="middle"
        fontSize="12" fill="#8d8d8d" fontFamily="system-ui, sans-serif">
        /100
      </text>
    </svg>
  );
}

interface HoofdProps {
  score: number;
  scoreKlasse: ScoreKlasse;
  hardBlockers?: HardBlocker[];
}

interface FactorenProps {
  score: number;
  scoreKlasse: ScoreKlasse;
  factoren: ScoreFactor[];
  precedentPlannen?: PrecedentPlan[];
  gemeente?: string;
}

export function ScoreHoofd({ score, scoreKlasse, hardBlockers = [] }: HoofdProps) {
  const cfg = SCORE_CONFIG[scoreKlasse];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {hardBlockers.length > 0 && (
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ height: "4px", backgroundColor: "#da1e28" }} />
          <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem", color: "#da1e28" }}>
              <MisuseOutline size={18} />
              {hardBlockers.length === 1 ? "Hard blocker aanwezig" : `${hardBlockers.length} hard blockers aanwezig`}
            </div>
            {hardBlockers.map((b) => (
              <div key={b.naam}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#161616", marginBottom: "0.2rem" }}>{b.naam}</div>
                <div style={{ fontSize: "0.75rem", color: "#525252", lineHeight: 1.4 }}>{b.toelichting}</div>
                <div style={{ fontSize: "0.75rem", color: "#da1e28", marginTop: "0.2rem", fontStyle: "italic" }}>
                  Totaalscore begrensd op {b.maxTotaal}/100 — overige factoren beïnvloeden de uitkomst niet.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ backgroundColor: cfg.achtergrond, borderRadius: "12px", boxShadow: `0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px ${cfg.kleur}30`, overflow: "hidden" }}>
        <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.75rem", flexWrap: "wrap" }}>
          <ScoreGauge score={score} kleur={cfg.kleur} />
          <div style={{ flex: 1, minWidth: "10rem" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8d8d8d", marginBottom: "0.75rem" }}>
              <Uitleg term="Slagingskans" uitleg="Hoe groot de kans is dat uw aanvraag voor bestemmingswijziging wordt goedgekeurd, berekend op basis van locatiedata, gemeentelijk beleid en historische vergelijkingen.">
                Slagingskans
              </Uitleg>
            </p>
            <Tag type={cfg.tagType} size="lg" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", marginBottom: "0.5rem" }}>
              {cfg.label}
            </Tag>
            {hardBlockers.length > 0 && (
              <p style={{ fontSize: "0.6875rem", color: "#da1e28", fontWeight: 600, marginTop: "0.5rem" }}>
                Geblokkeerd op max {Math.max(...hardBlockers.map(b => b.maxTotaal))}/100
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoreFactoren({ scoreKlasse, factoren, precedentPlannen = [], gemeente }: FactorenProps) {
  const cfg = SCORE_CONFIG[scoreKlasse];
  const [modalOpen, setModalOpen] = useState(false);
  const [weergave, setWeergave] = useState<"lijst" | "radar">("lijst");
  const [geselecteerdIndex, setGeselecteerdIndex] = useState(0);
  const [openFactoren, setOpenFactoren] = useState<Set<string>>(new Set());

  function toggleFactor(naam: string) {
    setOpenFactoren((prev) => {
      const next = new Set(prev);
      next.has(naam) ? next.delete(naam) : next.add(naam);
      return next;
    });
  }

  const radarData = factoren.map((f) => ({
    factor: kortNaam(f.naam),
    score: f.score,
    volledigeNaam: f.naam,
  }));

  function renderDot(props: Record<string, unknown>) {
    const cx = props.cx as number;
    const cy = props.cy as number;
    const index = props.index as number;
    const selected = index === geselecteerdIndex;
    return (
      <g key={`dot-${index}`} onClick={() => setGeselecteerdIndex(index)} style={{ cursor: "pointer" }}>
        <circle cx={cx} cy={cy} r={selected ? 7 : 5}
          fill={selected ? cfg.kleur : "#fff"}
          stroke={cfg.kleur}
          strokeWidth={selected ? 0 : 2}
        />
      </g>
    );
  }

  function renderAxisTick(props: Record<string, unknown>) {
    const x = props.x as number;
    const y = props.y as number;
    const index = props.index as number;
    const payload = props.payload as { value: string };
    const selected = index === geselecteerdIndex;
    return (
      <g key={`tick-${index}`} onClick={() => setGeselecteerdIndex(index)} style={{ cursor: "pointer", userSelect: "none" }}>
        <rect x={x - 36} y={y - 16} width={72} height={32} fill="transparent" />
        <text
          x={x} y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={selected ? 700 : 400}
          fill={selected ? cfg.kleur : "#525252"}
        >
          {payload.value}
        </text>
      </g>
    );
  }

  return (
    <>
      {/* Scorefactoren */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        padding: "1.25rem",
      }}>
        {/* Header met toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: "0.75rem", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)", margin: 0 }}>
            Scorefactoren
          </h3>
          <div style={{ display: "flex", gap: 0, border: "1px solid #e0e0e0", borderRadius: "2px", overflow: "hidden", flexShrink: 0 }}>
            {(["lijst", "radar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setWeergave(v)}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: weergave === v ? 600 : 400,
                  background: weergave === v ? "#161616" : "#ffffff",
                  color: weergave === v ? "#ffffff" : "#525252",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                {v === "lijst" ? "Lijst" : "Radar"}
              </button>
            ))}
          </div>
        </div>

        {/* Radarweergave */}
        {weergave === "radar" && (
          <div>
            {/* onMouseDown preventDefault voorkomt focusring bij muisklik */}
            <div onMouseDown={(e) => e.preventDefault()} style={{ outline: "none" }}>
              <ResponsiveContainer width="100%" height={340} style={{ outline: "none" }}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }} style={{ outline: "none" }}>
                  <PolarGrid stroke="#e0e0e0" />
                  <PolarAngleAxis
                    dataKey="factor"
                    tick={renderAxisTick as Parameters<typeof PolarAngleAxis>[0]["tick"]}
                    tickLine={false}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tickCount={5}
                    tick={{ fontSize: 9, fill: "#8d8d8d" }}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="score"
                    stroke={cfg.kleur}
                    fill={cfg.kleur}
                    fillOpacity={0.18}
                    strokeWidth={2}
                    dot={renderDot as Parameters<typeof Radar>[0]["dot"]}
                    activeDot={false}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Detail-panel voor geselecteerde factor */}
            {(() => {
              const factor = factoren[geselecteerdIndex];
              if (!factor) return null;
              const heeftBronnen = (factor.bronnen?.length ?? 0) > 0;
              return (
                <div style={{ marginTop: "1rem", padding: "0.875rem 1rem", backgroundColor: "#f4f4f4", borderLeft: `3px solid ${factorKleur(factor.score)}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                      <span style={{ marginTop: "0.0625rem", flexShrink: 0 }}>
                        {factor.positief
                          ? <CheckmarkFilled size={16} style={{ color: "#24a148" }} />
                          : factor.score >= 40
                          ? <WarningAltFilled size={16} style={{ color: "#b28600" }} />
                          : <MisuseOutline size={16} style={{ color: "#da1e28" }} />
                        }
                      </span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{factor.naam}</span>
                      {factor.isHardBlocker && (
                        <span style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.04em", color: "#da1e28", backgroundColor: "#fff1f1", border: "1px solid #da1e28", borderRadius: "2px", padding: "0.1rem 0.35rem", lineHeight: 1.4 }}>
                          BLOCKER
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: factorKleur(factor.score), flexShrink: 0 }}>
                      {factor.score}/100
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#525252", lineHeight: 1.5, margin: 0 }}>
                    {renderToelichting(factor.toelichting)}
                  </p>
                  {factor.naam === "Historische precedenten" && precedentPlannen.length > 0
                    ? (
                      <div style={{ marginTop: "0.625rem" }}>
                        <button
                          onClick={() => setModalOpen(true)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.625rem", borderRadius: "999px", fontSize: "0.6875rem", fontWeight: 500, lineHeight: 1.4, cursor: "pointer", backgroundColor: "#edf5ff", color: "#0043ce", borderColor: "#a6c8ff", border: "1px solid #a6c8ff" }}
                        >
                          Bekijk bestemmingswijzigingen
                        </button>
                      </div>
                    )
                    : heeftBronnen && <BronChips bronnen={factor.bronnen!} />}
                </div>
              );
            })()}
          </div>
        )}

        {/* Lijstweergave */}
        {weergave === "lijst" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {factoren.map((factor) => {
              const heeftBronnen = (factor.bronnen?.length ?? 0) > 0;
              const uitleg = FACTOR_UITLEG[factor.naam];
              const isOpen = openFactoren.has(factor.naam);

              return (
                <div key={factor.naam}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ marginTop: "0.0625rem", flexShrink: 0 }}>
                      {factor.positief
                        ? <CheckmarkFilled size={16} style={{ color: "#24a148" }} />
                        : factor.score >= 40
                        ? <WarningAltFilled size={16} style={{ color: "#b28600" }} />
                        : <MisuseOutline size={16} style={{ color: "#da1e28" }} />
                      }
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{factor.naam}</span>
                        {factor.isHardBlocker && (
                          <span style={{
                            fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.04em",
                            color: "#da1e28", backgroundColor: "#fff1f1",
                            border: "1px solid #da1e28", borderRadius: "2px",
                            padding: "0.1rem 0.35rem", lineHeight: 1.4, flexShrink: 0,
                          }}>
                            BLOCKER
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                        {renderToelichting(factor.toelichting)}
                      </p>

                      {uitleg && (
                        <div style={{ marginTop: "0.375rem" }}>
                          <button
                            onClick={() => toggleFactor(factor.naam)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "0.25rem",
                              background: "none", border: "none", padding: "0.25rem 0", cursor: "pointer",
                              fontSize: "0.75rem", color: "#525252", fontFamily: "inherit",
                            }}
                          >
                            {isOpen ? "Minder uitleg" : "Wat betekent dit?"}
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isOpen && (
                            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.375rem", lineHeight: 1.5 }}>
                              {uitleg}
                            </p>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div style={{ flex: 1, height: "5px", backgroundColor: "#f4f4f4", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${factor.score}%`, backgroundColor: factorKleur(factor.score), borderRadius: "999px", transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: factorKleur(factor.score), flexShrink: 0 }}>
                          {factor.score}/100
                        </span>
                      </div>

                      {factor.naam === "Historische precedenten" && precedentPlannen.length > 0
                        ? (
                          <div style={{ marginTop: "0.625rem" }}>
                            <button
                              onClick={() => setModalOpen(true)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.625rem", borderRadius: "999px", fontSize: "0.6875rem", fontWeight: 500, lineHeight: 1.4, cursor: "pointer", backgroundColor: "#edf5ff", color: "#0043ce", borderColor: "#a6c8ff", border: "1px solid #a6c8ff" }}
                            >
                              Bekijk bestemmingswijzigingen
                            </button>
                          </div>
                        )
                        : heeftBronnen && <BronChips bronnen={factor.bronnen!} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PrecedentenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        plannen={precedentPlannen}
        gemeente={gemeente}
      />
    </>
  );
}
