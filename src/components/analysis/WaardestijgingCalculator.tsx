"use client";

import { useState } from "react";
import { Tag, TextInput } from "@carbon/react";
import { Growth, Information, Edit, Checkmark } from "@carbon/icons-react";
import type { WaardestijgingData } from "@/types";

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
      <span style={{
        fontSize: "0.6875rem", fontWeight: 700, padding: "0.125rem 0.5rem",
        backgroundColor: bg, color: kleur, borderRadius: "4px", flexShrink: 0,
        letterSpacing: "0.04em",
      }}>
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

export function WaardestijgingCalculator({ data }: { data: WaardestijgingData }) {
  const kavelM2 = data.perceelM2 ?? 2500;

  const [overschrijfWaarde, setOverschrijfWaarde] = useState<number | null>(null);
  const [bewerkModus, setBewerkModus] = useState(false);
  const [inputWaarde, setInputWaarde] = useState("");

  // Agrarische marktwaarde is altijd het startpunt — WOZ is context, geen basis
  const agrarischeBase = data.agrarischeMarktwaarde;
  const huidigeWaarde = overschrijfWaarde ?? agrarischeBase;
  const isHandmatig = overschrijfWaarde != null;

  const bouwgrondMin = kavelM2 * data.bouwgrondPrijsPerM2Min;
  const bouwgrondMax = kavelM2 * data.bouwgrondPrijsPerM2Max;

  // Maximale verwervingsprijs: wat een koper maximaal kan betalen om quitte te spelen
  // Conservatief: bouwgrond laag - conversiekosten hoog
  // Optimistisch: bouwgrond hoog - conversiekosten laag
  const maxVerwervingMin = bouwgrondMin - data.conversiekostenMax;
  const maxVerwervingMax = bouwgrondMax - data.conversiekostenMin;

  // Netto waardestijging voor huidige eigenaar
  const nettoMin = maxVerwervingMin - huidigeWaarde;
  const nettoMax = maxVerwervingMax - huidigeWaarde;
  const winstPositief = nettoMax > 0;

  // WOZ als context: hoeveel wijkt het af van marktwaarde?
  const wozAfwijkingPct = data.wozWaarde
    ? Math.round(((data.wozWaarde - agrarischeBase) / agrarischeBase) * 100)
    : null;

  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
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
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#525252" }}>Betrouwbaarheid berekening</span>
            <span style={{ fontSize: "0.75rem", color: "#525252" }}>{data.betrouwbaarheid}/100</span>
          </div>
          <BetrouwbaarheidMeter score={data.betrouwbaarheid} label={data.betrouwbaarheidLabel} />
          {data.betrouwbaarheid < 60 && (
            <p style={{ fontSize: "0.75rem", color: "#b28600", marginTop: "0.375rem" }}>
              Beperkte lokale data beschikbaar — gebruik deze berekening als richtlijn, niet als beslissingsbasis.
            </p>
          )}
        </div>

        {/* Hero: maximale verwervingsprijs */}
        <div style={{
          borderRadius: "10px",
          backgroundColor: "#f0f4ff",
          border: "1px solid #d0e0ff",
          padding: "1.25rem",
          marginBottom: "1.25rem",
        }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0043ce", marginBottom: "0.375rem" }}>
            Maximale verwervingsprijs
          </p>
          <p style={{ fontSize: "0.75rem", color: "#4d6fa0", marginBottom: "0.75rem" }}>
            Wat een koper maximaal kan betalen om quitte te spelen na procedures en conversie
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#0043ce", lineHeight: 1.1 }}>
              {eur(maxVerwervingMin)}
            </span>
            <span style={{ fontSize: "1rem", color: "#4d6fa0" }}>tot {eur(maxVerwervingMax)}</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
            Bouwgrondwaarde − conversiekosten (procedures + onderzoeken)
          </p>
        </div>

        {/* Opbouw berekening */}
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#525252", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Opbouw</p>
          <RegelRij
            label={`Bouwgrondwaarde na conversie`}
            sub={`${data.perceelM2 ? data.perceelM2.toLocaleString("nl-NL") + " m² × " : ""}€${data.bouwgrondPrijsPerM2Min}–${data.bouwgrondPrijsPerM2Max}/m² (${data.regio}${data.aanpassingsPct !== undefined && data.aanpassingsPct !== 0 ? `, ${data.aanpassingsPct > 0 ? "+" : ""}${data.aanpassingsPct}%` : ""})`}
            waarde={`${eur(bouwgrondMin)} – ${eur(bouwgrondMax)}`}
            kleur="#24a148"
          />
          <RegelRij
            label="Conversiekosten"
            sub="Procedures, onderzoeken, leges — zie actieplan"
            waarde={`− ${eur(data.conversiekostenMin)} – − ${eur(data.conversiekostenMax)}`}
            kleur="#b28600"
          />
          <div style={{ paddingTop: "0.625rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#161616" }}>= Maximale verwervingsprijs</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0043ce", flexShrink: 0 }}>{eur(maxVerwervingMin)} – {eur(maxVerwervingMax)}</span>
            </div>
          </div>
        </div>

        {/* Netto waardestijging voor eigenaar */}
        <div style={{
          borderRadius: "10px",
          backgroundColor: winstPositief ? "#f0fdf4" : "#fff5f5",
          border: `1px solid ${winstPositief ? "#bbf7d0" : "#fecaca"}`,
          padding: "1.25rem",
          marginBottom: "1.25rem",
        }}>
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
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: winstPositief ? "#15803d" : "#b91c1c", lineHeight: 1.1 }}>
                {eur(nettoMin)}
              </p>
              <p style={{ fontSize: "0.8125rem", color: winstPositief ? "#16a34a" : "#dc2626" }}>tot {eur(nettoMax)}</p>
            </div>
          </div>

          {/* Huidige waarde — bewerkbaar */}
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

        {/* WOZ als context (niet als basis) */}
        {data.wozWaarde && (
          <div style={{
            borderRadius: "8px",
            backgroundColor: "#fafafa",
            border: "1px solid #e0e0e0",
            padding: "0.875rem",
            marginBottom: "1.25rem",
            display: "flex", alignItems: "flex-start", gap: "0.625rem",
          }}>
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
                WOZ van agrarische grond ligt structureel 20–40% onder marktwaarde door de pacht-gebaseerde taxatiemethode.
                De berekening gebruikt daarom de agrarische marktprijs, niet de WOZ.
              </p>
            </div>
          </div>
        )}

        {/* Context chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
          {data.bodemtype && data.bodemtype !== "onbekend" && (
            <Tag type="gray" size="sm">Bodem: {data.bodemtype}</Tag>
          )}
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
