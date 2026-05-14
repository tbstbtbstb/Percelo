"use client";

import { useState } from "react";
import { Tag, ProgressBar, Tile } from "@carbon/react";
import { CheckmarkFilled, MisuseOutline, WarningAltFilled } from "@carbon/icons-react";
import type { ScoreKlasse, ScoreFactor, PrecedentPlan } from "@/types";
import { PrecedentenModal } from "./PrecedentenModal";

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

function factorKleur(score: number) {
  if (score >= 70) return "#24a148";
  if (score >= 40) return "#b28600";
  return "#da1e28";
}

interface Props {
  score: number;
  scoreKlasse: ScoreKlasse;
  factoren: ScoreFactor[];
  precedentPlannen?: PrecedentPlan[];
  gemeente?: string;
}

export function ScoreDisplay({ score, scoreKlasse, factoren, precedentPlannen = [], gemeente }: Props) {
  const cfg = SCORE_CONFIG[scoreKlasse];
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Hoofdscore */}
      <Tile style={{ backgroundColor: cfg.achtergrond, padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.25rem", fontWeight: 400 }}>
              Slagingskans
            </p>
            <p style={{ fontSize: "3rem", fontWeight: 700, color: cfg.kleur, lineHeight: 1, fontFamily: "var(--cds-code-01-font-family, monospace)" }}>
              {score}<span style={{ fontSize: "1.25rem" }}>/100</span>
            </p>
          </div>
          <Tag type={cfg.tagType} size="lg" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
            {cfg.label}
          </Tag>
        </div>
        <div style={{ "--cds-interactive": cfg.kleur } as React.CSSProperties}>
          <ProgressBar
            value={score}
            max={100}
            label=""
            hideLabel
            size="small"
            status="active"
          />
        </div>
      </Tile>

      {/* Scorefactoren */}
      <Tile style={{ padding: "1.25rem" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "var(--cds-text-primary, #161616)" }}>
          Scorefactoren
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {factoren.map((factor) => (
            <div key={factor.naam}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <span style={{ marginTop: "0.125rem", flexShrink: 0 }}>
                  {factor.positief
                    ? <CheckmarkFilled size={16} style={{ color: "#24a148" }} />
                    : factor.score >= 40
                    ? <WarningAltFilled size={16} style={{ color: "#b28600" }} />
                    : <MisuseOutline size={16} style={{ color: "#da1e28" }} />
                  }
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{factor.naam}</span>
                    <span style={{ fontSize: "0.75rem", flexShrink: 0, fontWeight: 600, color: factorKleur(factor.score) }}>
                      {factor.score}/100
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                    {factor.toelichting}
                  </p>
                  {factor.naam === "Historische precedenten" && precedentPlannen.length > 0 && (
                    <button
                      onClick={() => setModalOpen(true)}
                      style={{ fontSize: "0.75rem", color: "var(--cds-link-primary, #0f62fe)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "0.25rem", textDecoration: "underline" }}
                    >
                      Bekijk {precedentPlannen.length} vastgestelde plan{precedentPlannen.length !== 1 ? "nen" : ""} →
                    </button>
                  )}
                  <div style={{ marginTop: "0.375rem", height: "3px", backgroundColor: "var(--cds-layer-02, #e0e0e0)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${factor.score}%`, backgroundColor: factorKleur(factor.score), borderRadius: "2px", transition: "width 0.3s ease" }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Tile>

      <PrecedentenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        plannen={precedentPlannen}
        gemeente={gemeente}
      />
    </div>
  );
}
