"use client";

import { Tile, Tag } from "@carbon/react";
import { Growth, Information } from "@carbon/icons-react";
import type { WaardestijgingData } from "@/types";

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function Balk({ label, bedragMin, bedragMax, kleur, max }: {
  label: string; bedragMin: number; bedragMax: number; kleur: string; max: number;
}) {
  const breedte = Math.min(100, (bedragMax / max) * 100);
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
        <span style={{ color: "var(--cds-text-secondary, #525252)" }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{eur(bedragMin)} – {eur(bedragMax)}</span>
      </div>
      <div style={{ height: "0.5rem", backgroundColor: "var(--cds-layer-02, #e0e0e0)", borderRadius: 0, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${breedte}%`, backgroundColor: kleur, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

export function WaardestijgingCalculator({ data }: { data: WaardestijgingData }) {
  const kavelM2 = data.perceelM2 ?? 2500;
  const agrarischWaarde = Math.round((kavelM2 / 10000) * data.agrarischPrijsPerHa);
  const bouwgrondMin = kavelM2 * data.bouwgrondPrijsPerM2Min;
  const bouwgrondMax = kavelM2 * data.bouwgrondPrijsPerM2Max;
  const nettoMin = bouwgrondMin - data.conversiekostenMax - agrarischWaarde;
  const nettoMax = bouwgrondMax - data.conversiekostenMin - agrarischWaarde;
  const maxAankoopMin = bouwgrondMin - data.conversiekostenMax;
  const maxAankoopMax = bouwgrondMax - data.conversiekostenMin;
  const grafiekMax = bouwgrondMax * 1.1;
  const winstPositief = nettoMax > 0;

  return (
    <Tile style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <Growth size={16} />
        <h3 style={{ fontWeight: 600, fontSize: "0.875rem" }}>Waardestijgingsberekening</h3>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
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

      {/* Balken */}
      <div style={{ marginBottom: "1.25rem" }}>
        <Balk label="Huidige waarde (agrarisch)" bedragMin={agrarischWaarde} bedragMax={agrarischWaarde} kleur="#8d8d8d" max={grafiekMax} />
        <Balk label="Conversiekosten (procedures + onderzoeken)" bedragMin={data.conversiekostenMin} bedragMax={data.conversiekostenMax} kleur="#f1c21b" max={grafiekMax} />
        <Balk label={`Waarde na conversie (bouwgrond, ${data.regio})`} bedragMin={bouwgrondMin} bedragMax={bouwgrondMax} kleur="#24a148" max={grafiekMax} />
      </div>

      {/* Resultaat */}
      <div style={{
        padding: "1rem",
        marginBottom: "0.75rem",
        backgroundColor: winstPositief ? "#defbe6" : "#fff1f1",
        borderLeft: `4px solid ${winstPositief ? "#24a148" : "#da1e28"}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {winstPositief ? "Potentiële netto waardestijging" : "Netto resultaat (negatief scenario)"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
              Bouwgrondwaarde − conversiekosten − huidige agrarische waarde
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "1.25rem", fontWeight: 700, color: winstPositief ? "#24a148" : "#da1e28" }}>{eur(nettoMin)}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>tot {eur(nettoMax)}</p>
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>Maximale aankoopprijs</p>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>Wat u maximaal kunt betalen als u de grond nog moet kopen</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "1.125rem", fontWeight: 700 }}>{eur(maxAankoopMin)}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>tot {eur(maxAankoopMax)}</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
        <Information size={14} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
        <p>
          Agrarische grondprijs: {eur(data.agrarischPrijsPerHa)}/ha ({data.provincie}). Bouwgrondprijs na correcties: {eur(data.bouwgrondPrijsPerM2Min)}–{eur(data.bouwgrondPrijsPerM2Max)}/m². Bron: {data.databron}. Berekening is indicatief en vervangt geen taxatierapport.
        </p>
      </div>
    </Tile>
  );
}
