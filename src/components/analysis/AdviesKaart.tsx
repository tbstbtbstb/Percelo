"use client";

import { Flag, Warning, Help, Information, CircleDash, Checkmark, Close, Undo } from "@carbon/icons-react";
import type { AdviesKaartData, AdviesLabel } from "@/types";
import { Uitleg } from "@/components/ui/Uitleg";

const ADVIES_CONFIG: Record<AdviesLabel, {
  label: string;
  kleur: string;
  bg: string;
  border: string;
  Icon: typeof Flag;
}> = {
  "go":      { label: "Kansrijk",     kleur: "#0e6027", bg: "#defbe6", border: "#24a148", Icon: Flag },
  "twijfel": { label: "Twijfelgeval", kleur: "#7d4300", bg: "#fff8e1", border: "#f1c21b", Icon: Help },
  "no-go":   { label: "Ongunstig",    kleur: "#750e13", bg: "#fff1f1", border: "#da1e28", Icon: Warning },
};

const PRECEDENT_CONFIG = {
  vergund:     { label: "Vergund",     kleur: "#24a148", bg: "#defbe6", Icon: Checkmark },
  afgewezen:   { label: "Afgewezen",   kleur: "#da1e28", bg: "#fff1f1", Icon: Close },
  ingetrokken: { label: "Ingetrokken", kleur: "#8d8d8d", bg: "#f4f4f4", Icon: Undo },
};

const IMPACT_CONFIG = {
  hoog:      { kleur: "#da1e28", label: "Hoog" },
  gemiddeld: { kleur: "#b28600", label: "Gemiddeld" },
  laag:      { kleur: "#525252", label: "Laag" },
};

function KritiekeFactorBlok({ data }: { data: AdviesKaartData["kritiekeFactor"] }) {
  const prec = data.precedent ? PRECEDENT_CONFIG[data.precedent.uitkomst] : null;
  const PrecIcon = prec?.Icon;

  return (
    <div style={{
      padding: "1rem 1.25rem",
      backgroundColor: "#ffffff",
      border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
      display: "flex", flexDirection: "column", gap: "0.5rem",
    }}>
      <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0f62fe" }}>
        <Uitleg term="Kritieke factor" uitleg="De meest bepalende reden waarom uw aanvraag kansrijk of riskant is — de factor die het zwaarst weegt in het oordeel van de gemeente.">
          Kritieke factor
        </Uitleg>
      </span>
      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)", lineHeight: 1.4 }}>
        {data.titel}
      </p>
      <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary, #525252)", lineHeight: 1.6 }}>
        {data.uitleg}
      </p>

      {prec && PrecIcon && data.precedent && (
        <div style={{
          marginTop: "0.25rem", padding: "0.625rem 0.75rem",
          backgroundColor: prec.bg,
          border: `1px solid ${prec.kleur}30`,
          display: "flex", alignItems: "flex-start", gap: "0.5rem",
          overflow: "hidden",
        }}>
          <div style={{
            width: "1.25rem", height: "1.25rem", borderRadius: "50%", flexShrink: 0,
            backgroundColor: prec.kleur,
            display: "flex", alignItems: "center", justifyContent: "center", marginTop: "0.1rem",
          }}>
            <PrecIcon size={10} style={{ color: "#ffffff" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: prec.kleur, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
                <Uitleg term="Precedent" uitleg="Een eerder vergelijkbaar verzoek in uw regio dat al vergund of afgewezen is. Gemeenten en rechters kijken hier naar bij nieuwe aanvragen.">Precedent</Uitleg> · {prec.label}
              </span>
              {data.precedent.referentie && (
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)" }}>
                  {data.precedent.referentie}
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-primary, #161616)", marginTop: "0.25rem", lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "break-word" }}>
              {data.precedent.omschrijving}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function VerborgenRisicoBlok({ data }: { data: AdviesKaartData["verborgenRisico"] }) {
  return (
    <div style={{
      padding: "1rem 1.25rem",
      backgroundColor: "#ffffff",
      border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
      display: "flex", flexDirection: "column", gap: "0.5rem",
    }}>
      <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#da1e28" }}>
        <Uitleg term="Verborgen risico" uitleg="Een risico dat niet zichtbaar is in de score, maar uw traject wel kan dwarsbomen — zoals lokale politiek, bezwaren van buren of milieuregels.">
          Verborgen risico
        </Uitleg>
      </span>
      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)", lineHeight: 1.4 }}>
        {data.titel}
      </p>
      <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary, #525252)", lineHeight: 1.6 }}>
        {data.uitleg}
      </p>

      {data.mitigatie && (
        <div style={{
          marginTop: "0.25rem", padding: "0.625rem 0.75rem",
          backgroundColor: "#fff8e1",
          border: "1px solid #f1c21b40",
          display: "flex", alignItems: "flex-start", gap: "0.5rem",
        }}>
          <Flag size={14} style={{ color: "#b28600", flexShrink: 0, marginTop: "0.2rem" }} />
          <div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#7d4300", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Actie nu
            </span>
            <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-primary, #161616)", marginTop: "0.125rem", lineHeight: 1.5 }}>
              {data.mitigatie}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function GemeenteStrategieBlok({ data }: { data: AdviesKaartData["gemeenteStrategie"] }) {
  return (
    <div style={{
      padding: "1rem 1.25rem",
      backgroundColor: "#ffffff",
      border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
      display: "flex", flexDirection: "column", gap: "0.375rem",
    }}>
      <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8a3ffc" }}>
        <Uitleg term="Gemeente-strategie" uitleg="Concrete tips over hoe u het beste met uw gemeente kunt communiceren om de kans op een positief besluit te vergroten.">
          Gemeente-strategie
        </Uitleg>
      </span>
      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)", lineHeight: 1.4 }}>
        {data.titel}
      </p>
      <p style={{ fontSize: "0.8125rem", color: "var(--cds-text-secondary, #525252)", lineHeight: 1.6 }}>
        {data.uitleg}
      </p>
    </div>
  );
}

export function AdviesKaart({ data }: { data: AdviesKaartData }) {
  const cfg = ADVIES_CONFIG[data.advies];
  const AdviesIcon = cfg.Icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Advies header */}
      <div style={{
        padding: "1.25rem 1.5rem",
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        display: "flex", alignItems: "flex-start", gap: "1rem",
      }}>
        <div style={{
          width: "2.5rem", height: "2.5rem", borderRadius: "50%", flexShrink: 0,
          backgroundColor: cfg.border,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AdviesIcon size={18} style={{ color: "#ffffff" }} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: cfg.kleur }}>
              Advies
            </span>
            <span style={{
              fontSize: "0.75rem", fontWeight: 700, padding: "0.125rem 0.625rem",
              backgroundColor: cfg.border, color: "#ffffff",
            }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: cfg.kleur, lineHeight: 1.5 }}>
            {data.kernzin}
          </p>
        </div>
      </div>

      {/* Drie informatieblokken */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <KritiekeFactorBlok data={data.kritiekeFactor} />
        <GemeenteStrategieBlok data={data.gemeenteStrategie} />
        <VerborgenRisicoBlok data={data.verborgenRisico} />
      </div>

      {/* Data gaps */}
      {data.dataGaps.length > 0 && (
        <div style={{
          padding: "1rem 1.25rem",
          backgroundColor: "var(--cds-layer-01, #f4f4f4)",
          border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Information size={15} style={{ color: "#525252", flexShrink: 0 }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cds-text-secondary, #525252)" }}>
              Ontbrekende informatie die de uitkomst kan beïnvloeden
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.dataGaps.map((gap, i) => {
              const impact = IMPACT_CONFIG[gap.impact];
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                  <CircleDash size={14} style={{ color: impact.kleur, flexShrink: 0, marginTop: "0.2rem" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "0.8125rem", color: "var(--cds-text-primary, #161616)" }}>
                      {gap.omschrijving}
                    </span>
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.6875rem", fontWeight: 600, color: impact.kleur }}>
                      {impact.label} impact
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
