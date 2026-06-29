"use client";

import { useState } from "react";
import { Tag, TextInput } from "@carbon/react";
import { Growth, Information, Edit } from "@carbon/icons-react";
import type { WaardestijgingData } from "@/types";

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function Balk({ label, bedragMin, bedragMax, kleur, max }: {
  label: string; bedragMin: number; bedragMax: number; kleur: string; max: number;
}) {
  const breedte = Math.min(100, (bedragMax / max) * 100);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
        <span style={{ fontSize: "0.8125rem", color: "#525252" }}>{label}</span>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#161616" }}>{eur(bedragMin)} – {eur(bedragMax)}</span>
      </div>
      <div style={{ height: "8px", backgroundColor: "#f4f4f4", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${breedte}%`, backgroundColor: kleur, borderRadius: "999px", transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
    </div>
  );
}

export function WaardestijgingCalculator({ data }: { data: WaardestijgingData }) {
  const kavelM2 = data.perceelM2 ?? 2500;
  const agrarischWaardeFallback = Math.round((kavelM2 / 10000) * data.agrarischPrijsPerHa);
  const autoWaarde = data.wozWaarde ?? agrarischWaardeFallback;

  const [overschrijfWaarde, setOverschrijfWaarde] = useState<number | null>(null);
  const [bewerkModus, setBewerkModus] = useState(false);
  const [inputWaarde, setInputWaarde] = useState("");

  const huidigeWaarde = overschrijfWaarde ?? autoWaarde;
  const huidigeWaardeLabel = overschrijfWaarde != null
    ? "Huidige waarde (handmatig)"
    : data.wozWaarde
    ? `Marktwaarde WOZ ${data.wozPeildatum ?? ""}`
    : "Huidige waarde (agrarisch)";
  const bouwgrondMin = kavelM2 * data.bouwgrondPrijsPerM2Min;
  const bouwgrondMax = kavelM2 * data.bouwgrondPrijsPerM2Max;
  const nettoMin = bouwgrondMin - data.conversiekostenMax - huidigeWaarde;
  const nettoMax = bouwgrondMax - data.conversiekostenMin - huidigeWaarde;
  const maxAankoopMin = bouwgrondMin - data.conversiekostenMax;
  const maxAankoopMax = bouwgrondMax - data.conversiekostenMin;
  const grafiekMax = Math.max(bouwgrondMax, huidigeWaarde) * 1.1;
  const winstPositief = nettoMax > 0;

  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
      <div style={{ height: "4px", backgroundColor: "#24a148" }} />
      <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <Growth size={16} />
        <h3 style={{ fontWeight: 700, fontSize: "0.875rem", letterSpacing: "-0.01em" }}>Waardestijgingsberekening</h3>
      </div>
      <p style={{ fontSize: "0.75rem", color: "#8d8d8d", marginBottom: "1.25rem" }}>
        Indicatieve berekening op basis van regionale marktdata — {data.regio}
      </p>

      {/* Context chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1.25rem" }}>
        {data.bodemtype && data.bodemtype !== "onbekend" && (
          <Tag type="gray" size="sm">Bodem: {data.bodemtype}</Tag>
        )}
        {data.afstandTotKernKm !== undefined && data.afstandTotKernNaam && data.afstandTotKernNaam !== "onbekend" && (
          <Tag type="gray" size="sm">{data.afstandTotKernKm} km van {data.afstandTotKernNaam}</Tag>
        )}
        {data.perceelM2 && (
          <Tag type="gray" size="sm">
            Perceel: {data.perceelM2 >= 10000 ? `${(data.perceelM2 / 10000).toFixed(1)} ha` : `${data.perceelM2.toLocaleString("nl-NL")} m²`}
          </Tag>
        )}
        {data.aanpassingsPct !== undefined && data.aanpassingsPct !== 0 && (
          <Tag type={data.aanpassingsPct > 0 ? "green" : "red"} size="sm">
            {data.aanpassingsPct > 0 ? "+" : ""}{data.aanpassingsPct}% t.o.v. regionaal gemiddelde
          </Tag>
        )}
      </div>

      {/* Huidige waarde — bewerkbaar */}
      <div style={{ marginBottom: "1.25rem" }}>
        {bewerkModus ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <TextInput
                id="huidige-waarde-input"
                labelText="Huidige marktwaarde (€)"
                placeholder={String(autoWaarde)}
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
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8125rem", backgroundColor: "#0f62fe", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0, height: "2rem", borderRadius: "4px" }}
            >
              Opslaan
            </button>
            <button
              onClick={() => setBewerkModus(false)}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8125rem", backgroundColor: "transparent", color: "#525252", border: "1px solid #c6c6c6", cursor: "pointer", flexShrink: 0, height: "2rem" }}
            >
              Annuleren
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <div>
              <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)" }}>{huidigeWaardeLabel}</span>
              <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.125rem" }}>
                Vooringevuld met WOZ — pas aan als u de werkelijke waarde kent.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{eur(huidigeWaarde)}</span>
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
        {!bewerkModus && (
          <div style={{ height: "8px", backgroundColor: "#f4f4f4", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (huidigeWaarde / grafiekMax) * 100)}%`, backgroundColor: "#8d8d8d", borderRadius: "999px", transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
          </div>
        )}
      </div>

      {/* Overige balken */}
      <div style={{ marginBottom: "1.25rem" }}>
        <Balk label="Conversiekosten (procedures + onderzoeken)" bedragMin={data.conversiekostenMin} bedragMax={data.conversiekostenMax} kleur="#f1c21b" max={grafiekMax} />
        <Balk label={`Waarde na conversie (bouwgrond, ${data.regio})`} bedragMin={bouwgrondMin} bedragMax={bouwgrondMax} kleur="#24a148" max={grafiekMax} />
      </div>

      {/* Resultaat */}
      <div style={{
        borderRadius: "10px",
        backgroundColor: winstPositief ? "#f0fdf4" : "#fff5f5",
        border: `1px solid ${winstPositief ? "#bbf7d0" : "#fecaca"}`,
        padding: "1.25rem",
        marginBottom: "1rem",
      }}>
        <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: winstPositief ? "#15803d" : "#b91c1c", marginBottom: "0.375rem" }}>
          {winstPositief ? "Potentiële netto waardestijging" : "Netto resultaat"}
        </p>
        <p style={{ fontSize: "2rem", fontWeight: 800, color: winstPositief ? "#15803d" : "#b91c1c", lineHeight: 1.1, marginBottom: "0.25rem" }}>
          {eur(nettoMin)}
        </p>
        <p style={{ fontSize: "0.8125rem", color: winstPositief ? "#16a34a" : "#dc2626", marginBottom: "1rem" }}>
          tot {eur(nettoMax)}
        </p>
        <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "1rem" }}>
          Bouwgrondwaarde − conversiekosten − {data.wozWaarde ? `WOZ-waarde ${data.wozPeildatum}` : "huidige agrarische waarde"}
        </p>
        <div style={{ borderTop: `1px solid ${winstPositief ? "#bbf7d0" : "#fecaca"}`, paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#161616" }}>Maximale aankoopprijs</p>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Wat u maximaal kunt betalen als u de grond nog moet kopen</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#161616" }}>{eur(maxAankoopMin)}</p>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>tot {eur(maxAankoopMax)}</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "#8d8d8d" }}>
        <Information size={14} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
        <p>
          {data.wozWaarde
            ? <>WOZ-waarde {data.wozPeildatum}: {eur(data.wozWaarde)} (bron: Kadaster WOZ-waardeloket). </>
            : <>Agrarische grondprijs: {eur(data.agrarischPrijsPerHa)}/ha ({data.provincie}) — geen WOZ-waarde beschikbaar. </>
          }
          Bouwgrondprijs na correcties: {eur(data.bouwgrondPrijsPerM2Min)}–{eur(data.bouwgrondPrijsPerM2Max)}/m² ({data.regio}). Bron: {data.databron}. Berekening is indicatief en vervangt geen taxatierapport.
        </p>
      </div>
      </div>
    </div>
  );
}
