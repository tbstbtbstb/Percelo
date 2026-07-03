"use client";

import { useState, useEffect } from "react";
import { Tag, TextInput } from "@carbon/react";
import { Growth, Information, Edit, Checkmark, ArrowUp, ArrowDown, Subtract } from "@carbon/icons-react";
import type { WaardestijgingData, GemeenteMarktData } from "@/types";

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function BetrouwbaarheidMeter({ score, label }: { score: number; label: string }) {
  const kleur = score >= 80 ? "#24a148" : score >= 60 ? "#b28600" : score >= 40 ? "#f1c21b" : "#da1e28";
  const bg    = score >= 80 ? "#f0fdf4" : score >= 60 ? "#fffbeb" : score >= 40 ? "#fffde7" : "#fff5f5";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ flex: 1, height: "6px", backgroundColor: "#f4f4f4", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, backgroundColor: kleur, borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.125rem 0.5rem", backgroundColor: bg, color: kleur, borderRadius: "4px", flexShrink: 0, letterSpacing: "0.04em" }}>
        {label}
      </span>
    </div>
  );
}

function RegelRij({ label, waarde, sub, kleur }: { label: string; waarde: string; sub?: string; kleur?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", padding: "0.625rem 0", borderBottom: "1px solid #f4f4f4" }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: "0.8125rem", color: "#525252" }}>{label}</span>
        {sub && <p style={{ fontSize: "0.75rem", color: "#8d8d8d", marginTop: "0.125rem" }}>{sub}</p>}
      </div>
      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: kleur ?? "#161616", flexShrink: 0 }}>{waarde}</span>
    </div>
  );
}

function RangeSlider({ label, waarde, min, max, stap, format, onChange }: {
  label: string; waarde: number; min: number; max: number; stap: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((waarde - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
        <span style={{ fontSize: "0.8125rem", color: "#525252" }}>{label}</span>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#161616" }}>{format(waarde)}</span>
      </div>
      <div style={{ position: "relative", height: "20px", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: "4px", borderRadius: "999px", backgroundColor: "#e0e0e0" }}>
          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#0f62fe", borderRadius: "999px" }} />
        </div>
        <input
          type="range" min={min} max={max} step={stap} value={waarde}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: "absolute", left: 0, right: 0, width: "100%", opacity: 0, cursor: "pointer", height: "20px", margin: 0 }}
        />
        <div style={{
          position: "absolute", left: `${pct}%`, transform: "translateX(-50%)",
          width: "16px", height: "16px", borderRadius: "50%",
          backgroundColor: "#0f62fe", border: "2px solid #ffffff",
          boxShadow: "0 0 0 2px #0f62fe", pointerEvents: "none",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
        <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>{format(min)}</span>
        <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>{format(max)}</span>
      </div>
    </div>
  );
}

type Gevoeligheid = "pessimistisch" | "neutraal" | "optimistisch";

const GEVOELIGHEID_CONFIG: Record<Gevoeligheid, { label: string; bouwFactor: number; kostenFactor: number; kleur: string }> = {
  pessimistisch: { label: "Pessimistisch", bouwFactor: 0.85, kostenFactor: 1.25, kleur: "#da1e28" },
  neutraal:      { label: "Neutraal",      bouwFactor: 1.00, kostenFactor: 1.00, kleur: "#0f62fe" },
  optimistisch:  { label: "Optimistisch",  bouwFactor: 1.10, kostenFactor: 0.85, kleur: "#24a148" },
};

export function WaardestijgingCalculator({ data }: { data: WaardestijgingData }) {
  const kavelM2 = data.perceelM2 ?? 2500;

  // Eigenaar-waarde override
  const [overschrijfWaarde, setOverschrijfWaarde] = useState<number | null>(null);
  const [bewerkModus, setBewerkModus] = useState(false);
  const [inputWaarde, setInputWaarde] = useState("");

  // Gemeente marktdata (CBS)
  const [markt, setMarkt] = useState<GemeenteMarktData | null>(null);
  const [marktLaden, setMarktLaden] = useState(false);
  useEffect(() => {
    if (!data.gemeente) return;
    setMarktLaden(true);
    fetch(`/api/gemeente-markt?gemeente=${encodeURIComponent(data.gemeente)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMarkt(d))
      .catch(() => null)
      .finally(() => setMarktLaden(false));
  }, [data.gemeente]);

  // Scenario-state
  const [omzetPct, setOmzetPct] = useState(100);
  const [aantalKavels, setAantalKavels] = useState(1);
  const [gevoeligheid, setGevoeligheid] = useState<Gevoeligheid>("neutraal");

  const gev = GEVOELIGHEID_CONFIG[gevoeligheid];
  const agrarischeBase = data.agrarischeMarktwaarde;
  const huidigeWaarde = overschrijfWaarde ?? agrarischeBase;
  const isHandmatig = overschrijfWaarde != null;

  // Scenario-berekening
  const omzetM2 = kavelM2 * (omzetPct / 100);
  const bouwgrondMin = omzetM2 * data.bouwgrondPrijsPerM2Min * gev.bouwFactor;
  const bouwgrondMax = omzetM2 * data.bouwgrondPrijsPerM2Max * gev.bouwFactor;
  const kostenMin    = data.conversiekostenMin * gev.kostenFactor;
  const kostenMax    = data.conversiekostenMax * gev.kostenFactor;

  const maxVerwervingMin = bouwgrondMin - kostenMax;
  const maxVerwervingMax = bouwgrondMax - kostenMin;
  const maxVerwervingPerKavelMin = aantalKavels > 1 ? maxVerwervingMin / aantalKavels : null;
  const maxVerwervingPerKavelMax = aantalKavels > 1 ? maxVerwervingMax / aantalKavels : null;

  const nettoMin = maxVerwervingMin - huidigeWaarde;
  const nettoMax = maxVerwervingMax - huidigeWaarde;
  const winstPositief = nettoMax > 0;

  const wozAfwijkingPct = data.wozWaarde
    ? Math.round(((data.wozWaarde - agrarischeBase) / agrarischeBase) * 100)
    : null;

  const isScenarioGewijzigd = omzetPct !== 100 || aantalKavels !== 1 || gevoeligheid !== "neutraal";

  return (
    <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ height: "4px", backgroundColor: "#24a148" }} />
      <div style={{ padding: "1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <Growth size={16} />
          <h3 style={{ fontWeight: 700, fontSize: "0.875rem", letterSpacing: "-0.01em" }}>Waardestijgingsberekening</h3>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#8d8d8d", marginBottom: "1rem" }}>
          Indicatieve berekening op basis van openbare databronnen — {data.regio}
        </p>

        {/* Betrouwbaarheid */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#525252" }}>Betrouwbaarheid berekening</span>
            <span style={{ fontSize: "0.75rem", color: "#525252" }}>{data.betrouwbaarheid}/100</span>
          </div>
          <BetrouwbaarheidMeter score={data.betrouwbaarheid} label={data.betrouwbaarheidLabel} />
          {data.betrouwbaarheid < 60 && (
            <p style={{ fontSize: "0.75rem", color: "#b28600", marginTop: "0.375rem" }}>
              Beperkte lokale data beschikbaar — gebruik als richtlijn, niet als beslissingsbasis.
            </p>
          )}
        </div>

        {/* ── Scenariocalculator ── */}
        <div style={{ borderRadius: "10px", backgroundColor: "#f4f4f4", border: "1px solid #e0e0e0", padding: "1.125rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#161616", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Scenario doorrekenen
          </p>

          <RangeSlider
            label="Bestemmingsomzetting"
            waarde={omzetPct}
            min={10} max={100} stap={5}
            format={(v) => `${v}% van perceel`}
            onChange={setOmzetPct}
          />
          <RangeSlider
            label="Aantal woningen / kavels"
            waarde={aantalKavels}
            min={1} max={20} stap={1}
            format={(v) => v === 1 ? "1 kavel" : `${v} kavels`}
            onChange={setAantalKavels}
          />

          {/* Gevoeligheidsschakelaar */}
          <div>
            <p style={{ fontSize: "0.75rem", color: "#525252", marginBottom: "0.5rem" }}>Marktscenario</p>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {(["pessimistisch", "neutraal", "optimistisch"] as Gevoeligheid[]).map((g) => {
                const cfg = GEVOELIGHEID_CONFIG[g];
                const actief = gevoeligheid === g;
                return (
                  <button
                    key={g}
                    onClick={() => setGevoeligheid(g)}
                    style={{
                      padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontWeight: actief ? 700 : 400,
                      border: `1.5px solid ${actief ? cfg.kleur : "#c6c6c6"}`,
                      backgroundColor: actief ? cfg.kleur + "14" : "#ffffff",
                      color: actief ? cfg.kleur : "#525252",
                      borderRadius: "4px", cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {cfg.label}
                    {g === "pessimistisch" && <span style={{ fontSize: "0.6875rem", marginLeft: "0.25rem", opacity: 0.8 }}>−15% prijs / +25% kosten</span>}
                    {g === "optimistisch"  && <span style={{ fontSize: "0.6875rem", marginLeft: "0.25rem", opacity: 0.8 }}>+10% prijs / −15% kosten</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {isScenarioGewijzigd && (
            <button
              onClick={() => { setOmzetPct(100); setAantalKavels(1); setGevoeligheid("neutraal"); }}
              style={{ marginTop: "0.75rem", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.75rem", color: "#525252", textDecoration: "underline" }}
            >
              Terugzetten naar basisscenario
            </button>
          )}
        </div>

        {/* Hero: maximale verwervingsprijs */}
        <div style={{ borderRadius: "10px", backgroundColor: "#f0f4ff", border: "1px solid #d0e0ff", padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0043ce", marginBottom: "0.25rem" }}>
                Maximale verwervingsprijs
              </p>
              <p style={{ fontSize: "0.75rem", color: "#4d6fa0", marginBottom: "0.5rem" }}>
                Wat een koper maximaal kan betalen om quitte te spelen
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "#0043ce", lineHeight: 1.1 }}>{eur(maxVerwervingMin)}</span>
                <span style={{ fontSize: "1rem", color: "#4d6fa0" }}>tot {eur(maxVerwervingMax)}</span>
              </div>
            </div>
            {aantalKavels > 1 && maxVerwervingPerKavelMin !== null && maxVerwervingPerKavelMax !== null && (
              <div style={{ borderLeft: "2px solid #d0e0ff", paddingLeft: "1rem" }}>
                <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0043ce", marginBottom: "0.25rem" }}>
                  Per kavel ({aantalKavels}×)
                </p>
                <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0043ce", lineHeight: 1.1 }}>{eur(maxVerwervingPerKavelMin)}</p>
                <p style={{ fontSize: "0.8125rem", color: "#4d6fa0" }}>tot {eur(maxVerwervingPerKavelMax)}</p>
              </div>
            )}
          </div>
          {omzetPct < 100 && (
            <p style={{ fontSize: "0.75rem", color: "#4d6fa0", marginTop: "0.625rem" }}>
              Op basis van {omzetPct}% bestemmingsomzetting ({Math.round(omzetM2).toLocaleString("nl-NL")} m²)
            </p>
          )}
        </div>

        {/* Lokale woningmarkt (CBS) */}
        {(marktLaden || markt) && (
          <div style={{ borderRadius: "10px", backgroundColor: "#f4f4f4", border: "1px solid #e0e0e0", padding: "1rem", marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#161616", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: marktLaden ? 0 : "0.75rem" }}>
              Woningmarkt {data.gemeente}
            </p>

            {marktLaden && (
              <p style={{ fontSize: "0.75rem", color: "#8d8d8d", marginTop: "0.375rem" }}>Marktdata ophalen…</p>
            )}

            {markt && !marktLaden && (() => {
              const trend = markt.trendPct;
              const TrendIcon = trend === null ? Subtract : trend > 0 ? ArrowUp : ArrowDown;
              const trendKleur = trend === null ? "#8d8d8d" : trend > 0 ? "#24a148" : "#da1e28";

              return (
                <>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.625rem" }}>
                    {/* Gemiddelde prijs */}
                    <div style={{ flex: 1, minWidth: "8rem", backgroundColor: "#ffffff", borderRadius: "8px", padding: "0.75rem 1rem", border: "1px solid #e0e0e0" }}>
                      <p style={{ fontSize: "0.6875rem", color: "#525252", marginBottom: "0.25rem" }}>Gem. verkoopprijs {markt.meestRecentKwartaalLabel}</p>
                      <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "#161616", lineHeight: 1.1 }}>
                        {eur(markt.gemiddeldeVerkoopprijs)}
                      </p>
                      <p style={{ fontSize: "0.6875rem", color: "#8d8d8d", marginTop: "0.125rem" }}>bestaande woning</p>
                    </div>
                    {/* Trend */}
                    <div style={{ flex: 1, minWidth: "8rem", backgroundColor: "#ffffff", borderRadius: "8px", padding: "0.75rem 1rem", border: "1px solid #e0e0e0" }}>
                      <p style={{ fontSize: "0.6875rem", color: "#525252", marginBottom: "0.25rem" }}>Prijsontwikkeling</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <TrendIcon size={16} style={{ color: trendKleur, flexShrink: 0 }} />
                        <p style={{ fontSize: "1.25rem", fontWeight: 800, color: trendKleur, lineHeight: 1.1 }}>
                          {trend !== null ? `${trend > 0 ? "+" : ""}${trend}%` : "—"}
                        </p>
                      </div>
                      <p style={{ fontSize: "0.6875rem", color: "#8d8d8d", marginTop: "0.125rem" }}>jaar-op-jaar</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>
                    {markt.bron} · Bestaande koopwoningen; hogere vraag vergroot interesse in bouwgrond
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {/* Opbouw */}
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#525252", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Opbouw</p>
          <RegelRij
            label="Bouwgrondwaarde na conversie"
            sub={`${Math.round(omzetM2).toLocaleString("nl-NL")} m² × €${Math.round(data.bouwgrondPrijsPerM2Min * gev.bouwFactor)}–${Math.round(data.bouwgrondPrijsPerM2Max * gev.bouwFactor)}/m² (${data.regio}${data.aanpassingsPct !== undefined && data.aanpassingsPct !== 0 ? `, ${data.aanpassingsPct > 0 ? "+" : ""}${data.aanpassingsPct}%` : ""}${gevoeligheid !== "neutraal" ? `, ${gev.label.toLowerCase()}` : ""})`}
            waarde={`${eur(bouwgrondMin)} – ${eur(bouwgrondMax)}`}
            kleur="#24a148"
          />
          <RegelRij
            label="Conversiekosten"
            sub={`Procedures, onderzoeken, leges${gevoeligheid !== "neutraal" ? ` (${gev.label.toLowerCase()})` : ""}`}
            waarde={`− ${eur(kostenMin)} – − ${eur(kostenMax)}`}
            kleur="#b28600"
          />
          <div style={{ paddingTop: "0.625rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#161616" }}>= Maximale verwervingsprijs</span>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0043ce", flexShrink: 0 }}>{eur(maxVerwervingMin)} – {eur(maxVerwervingMax)}</span>
          </div>
        </div>

        {/* Netto waardestijging voor eigenaar */}
        <div style={{ borderRadius: "10px", backgroundColor: winstPositief ? "#f0fdf4" : "#fff5f5", border: `1px solid ${winstPositief ? "#bbf7d0" : "#fecaca"}`, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: winstPositief ? "#15803d" : "#b91c1c", marginBottom: "0.25rem" }}>
                {winstPositief ? "Potentiële netto waardestijging" : "Netto resultaat"} voor huidige eigenaar
              </p>
              <p style={{ fontSize: "0.75rem", color: winstPositief ? "#16a34a" : "#dc2626" }}>
                Maximale verwervingsprijs − {isHandmatig ? "handmatig ingevoerde waarde" : "agrarische marktwaarde"}
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: winstPositief ? "#15803d" : "#b91c1c", lineHeight: 1.1 }}>{eur(nettoMin)}</p>
              <p style={{ fontSize: "0.8125rem", color: winstPositief ? "#16a34a" : "#dc2626" }}>tot {eur(nettoMax)}</p>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${winstPositief ? "#bbf7d0" : "#fecaca"}`, paddingTop: "0.75rem" }}>
            {bewerkModus ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <TextInput
                    id="huidige-waarde-input"
                    labelText="Huidige marktwaarde perceel (€)"
                    placeholder={String(agrarischeBase)}
                    value={inputWaarde}
                    onChange={(e) => setInputWaarde(e.target.value)}
                    size="sm"
                  />
                </div>
                <button
                  onClick={() => {
                    const parsed = parseInt(inputWaarde.replace(/\D/g, ""), 10);
                    if (!isNaN(parsed) && parsed > 0) setOverschrijfWaarde(parsed);
                    setBewerkModus(false);
                  }}
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8125rem", backgroundColor: "#0f62fe", color: "#fff", border: "none", cursor: "pointer", height: "2rem", borderRadius: "4px", flexShrink: 0 }}
                >
                  <Checkmark size={14} />
                </button>
                <button
                  onClick={() => setBewerkModus(false)}
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8125rem", backgroundColor: "transparent", color: "#525252", border: "1px solid #c6c6c6", cursor: "pointer", height: "2rem", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <div>
                  <p style={{ fontSize: "0.75rem", color: "#525252" }}>
                    {isHandmatig ? "Handmatig ingevoerd" : `Agrarische marktwaarde (${data.provincie ?? "NL"})`}
                    {!isHandmatig && <span style={{ color: "#8d8d8d" }}> — {eur(data.agrarischPrijsPerHa)}/ha, BIS Grondmarkt</span>}
                  </p>
                  {isHandmatig && (
                    <button
                      onClick={() => { setOverschrijfWaarde(null); setInputWaarde(""); }}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.75rem", color: "#525252", textDecoration: "underline" }}
                    >
                      Terugzetten naar marktwaarde
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#161616" }}>{eur(huidigeWaarde)}</span>
                  <button
                    onClick={() => { setInputWaarde(String(huidigeWaarde)); setBewerkModus(true); }}
                    title="Waarde aanpassen"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem", color: "#525252", display: "flex", alignItems: "center" }}
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WOZ als context */}
        {data.wozWaarde && (
          <div style={{ borderRadius: "8px", backgroundColor: "#fafafa", border: "1px solid #e0e0e0", padding: "0.875rem", marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
            <Information size={14} style={{ color: "#525252", flexShrink: 0, marginTop: "0.2rem" }} />
            <div>
              <p style={{ fontSize: "0.75rem", color: "#161616", fontWeight: 600, marginBottom: "0.25rem" }}>
                WOZ-waarde {data.wozPeildatum}: {eur(data.wozWaarde)}
                {wozAfwijkingPct !== null && (
                  <span style={{ fontWeight: 400, color: wozAfwijkingPct < 0 ? "#b91c1c" : "#15803d" }}>
                    {" "}({wozAfwijkingPct > 0 ? "+" : ""}{wozAfwijkingPct}% t.o.v. marktwaarde)
                  </span>
                )}
              </p>
              <p style={{ fontSize: "0.75rem", color: "#525252" }}>
                WOZ van agrarische grond ligt structureel 20–40% onder marktwaarde door de pacht-gebaseerde taxatiemethode. De berekening gebruikt de agrarische marktprijs.
              </p>
            </div>
          </div>
        )}

        {/* Context chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
          {data.bodemtype && data.bodemtype !== "onbekend" && <Tag type="gray" size="sm">Bodem: {data.bodemtype}</Tag>}
          {data.afstandTotKernKm !== undefined && data.afstandTotKernNaam && data.afstandTotKernNaam !== "onbekend" && (
            <Tag type="gray" size="sm">{data.afstandTotKernKm} km van {data.afstandTotKernNaam}</Tag>
          )}
          {data.perceelM2 && (
            <Tag type="gray" size="sm">
              {data.perceelM2 >= 10000 ? `${(data.perceelM2 / 10000).toFixed(1)} ha` : `${data.perceelM2.toLocaleString("nl-NL")} m²`}
            </Tag>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "#8d8d8d" }}>
          <Information size={14} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
          <p>
            Bron: {data.databron}. Agrarische marktprijs: {eur(data.agrarischPrijsPerHa)}/ha ({data.provincie}, BIS Grondmarkt).
            Bouwgrond: €{data.bouwgrondPrijsPerM2Min}–{data.bouwgrondPrijsPerM2Max}/m² ({data.regio}, NVM/Kadaster).
            Berekening is indicatief en vervangt geen taxatierapport of RICS-waardering.
          </p>
        </div>

      </div>
    </div>
  );
}
