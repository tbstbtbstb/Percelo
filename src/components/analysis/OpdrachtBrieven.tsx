"use client";

import { useState } from "react";
import { Tile, Tag } from "@carbon/react";
import { Copy, Checkmark, Catalog, Building, UserMultiple, Sprout } from "@carbon/icons-react";
import type { OpdrachtBrief } from "@/types";
import type { CarbonIconType } from "@carbon/icons-react";

type OntvangerType = OpdrachtBrief["ontvangerType"];

const ONTVANGER_CONFIG: Record<OntvangerType, {
  label: string;
  tagType: "warm-gray" | "green" | "blue" | "teal";
  kleur: string;
  achtergrond: string;
  icon: CarbonIconType;
}> = {
  gemeente:   { label: "Gemeente",         tagType: "warm-gray", kleur: "#525252", achtergrond: "#f4f4f4", icon: Building },
  adviseur:   { label: "Adviseur",         tagType: "green",  kleur: "#044317", achtergrond: "#defbe6", icon: Sprout },
  bureau:     { label: "Onderzoeksbureau", tagType: "blue",   kleur: "#002d9c", achtergrond: "#edf5ff", icon: UserMultiple },
  waterschap: { label: "Waterschap",       tagType: "teal",   kleur: "#004144", achtergrond: "#d9fbfb", icon: Building },
};

const GROEP_VOLGORDE: OntvangerType[] = ["gemeente", "adviseur", "bureau", "waterschap"];

function kortNaam(naam: string) {
  return naam.split("(")[0].split("/")[0].trim();
}

export function OpdrachtBrieven({ brieven }: { brieven: OpdrachtBrief[] }) {
  const [geselecteerd, setGeselecteerd] = useState(0);
  const [gekopieerd, setGekopieerd] = useState(false);

  if (!brieven.length) return null;

  const brief = brieven[geselecteerd];
  const config = ONTVANGER_CONFIG[brief.ontvangerType];
  const Icon = config.icon;

  const groepen = GROEP_VOLGORDE.flatMap((type) => {
    const items = brieven.map((b, i) => ({ b, i })).filter(({ b }) => b.ontvangerType === type);
    return items.length ? [{ type, items }] : [];
  });

  async function kopieer() {
    await navigator.clipboard.writeText(`Onderwerp: ${brief.onderwerp}\n\n${brief.inhoud}`);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  function selecteer(i: number) {
    setGeselecteerd(i);
    setGekopieerd(false);
  }

  return (
    <Tile style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>
          <Catalog size={16} />
          Brieven & verzoeken — klaar voor verzending
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem" }}>
          {brieven.length} brieven voor alle verplichte stappen — vul uw naam en contactgegevens in op de aangegeven plekken
        </p>
      </div>

      <div style={{ display: "flex", minHeight: "480px", maxHeight: "640px", borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
        {/* Navigation panel */}
        <div style={{ width: "13rem", flexShrink: 0, borderRight: "1px solid var(--cds-border-subtle-00, #e0e0e0)", overflowY: "auto", backgroundColor: "var(--cds-layer-02, #e0e0e0)" }}>
          {groepen.map(({ type, items }) => {
            const cfg = ONTVANGER_CONFIG[type];
            const Icn = cfg.icon;
            return (
              <div key={type}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.375rem 0.75rem", fontSize: "0.6875rem", fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  backgroundColor: cfg.achtergrond, color: cfg.kleur,
                  borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                }}>
                  <Icn size={12} />
                  {cfg.label}
                </div>
                {items.map(({ b, i }) => (
                  <button
                    key={i}
                    onClick={() => selecteer(i)}
                    style={{
                      width: "100%", textAlign: "left", padding: "0.625rem 0.75rem",
                      fontSize: "0.75rem", lineHeight: 1.4,
                      borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                      background: i === geselecteerd ? "var(--cds-layer-selected-01, #c6c6c6)" : "none",
                      border: "none",
                      borderLeft: i === geselecteerd ? `3px solid var(--cds-interactive, #0f62fe)` : "3px solid transparent",
                      fontWeight: i === geselecteerd ? 600 : 400,
                      color: i === geselecteerd ? "var(--cds-text-primary, #161616)" : "var(--cds-text-secondary, #525252)",
                      cursor: "pointer",
                    }}
                  >
                    {kortNaam(b.onderzoekNaam)}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Brief content */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            backgroundColor: "var(--cds-layer-01, #f4f4f4)",
            borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
            padding: "0.75rem 1rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem",
          }}>
            <div style={{ minWidth: 0 }}>
              <Tag type={config.tagType} size="sm" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Icon size={12} /> {config.label}
              </Tag>
              <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                <strong style={{ color: "var(--cds-text-primary, #161616)" }}>Onderwerp:</strong>{" "}
                {brief.onderwerp}
              </p>
            </div>
            <button
              onClick={kopieer}
              style={{
                display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0,
                padding: "0.375rem 0.75rem", fontSize: "0.75rem",
                border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
                backgroundColor: "var(--cds-layer-01, #f4f4f4)",
                color: "var(--cds-text-primary, #161616)", cursor: "pointer",
              }}
            >
              {gekopieerd ? <><Checkmark size={14} /> Gekopieerd</> : <><Copy size={14} /> Kopieer</>}
            </button>
          </div>

          <pre style={{ padding: "1rem", fontSize: "0.75rem", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--cds-text-primary, #161616)" }}>
            {brief.inhoud}
          </pre>
        </div>
      </div>
    </Tile>
  );
}
