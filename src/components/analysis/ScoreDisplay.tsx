"use client";

import { useState } from "react";
import { Tag, ProgressBar, Tile } from "@carbon/react";
import { CheckmarkFilled, MisuseOutline, WarningAltFilled } from "@carbon/icons-react";
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
  hardBlockers?: HardBlocker[];
}

export function ScoreDisplay({ score, scoreKlasse, factoren, precedentPlannen = [], gemeente, hardBlockers = [] }: Props) {
  const cfg = SCORE_CONFIG[scoreKlasse];
  const [modalOpen, setModalOpen] = useState(false);
  const [openBronnen, setOpenBronnen] = useState<string | null>(null);
  const [weergave, setWeergave] = useState<"lijst" | "radar">("lijst");

  const [geselecteerdIndex, setGeselecteerdIndex] = useState(0);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Hard blocker banner */}
      {hardBlockers.length > 0 && (
        <div style={{
          backgroundColor: "#fff1f1",
          border: "1px solid #da1e28",
          borderLeft: "4px solid #da1e28",
          borderRadius: "2px",
          padding: "0.875rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}>
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
      )}

      {/* Hoofdscore */}
      <Tile style={{ backgroundColor: cfg.achtergrond, padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.25rem", fontWeight: 400 }}>
              <Uitleg term="Slagingskans" uitleg="Hoe groot de kans is dat uw aanvraag voor bestemmingswijziging wordt goedgekeurd, berekend op basis van locatiedata, gemeentelijk beleid en historische vergelijkingen.">
                Slagingskans
              </Uitleg>
            </p>
            <p style={{ fontSize: "3rem", fontWeight: 700, color: cfg.kleur, lineHeight: 1, fontFamily: "var(--cds-code-01-font-family, monospace)" }}>
              {score}<span style={{ fontSize: "1.25rem" }}>/100</span>
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.375rem" }}>
            <Tag type={cfg.tagType} size="lg" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
              {cfg.label}
            </Tag>
            {hardBlockers.length > 0 && (
              <span style={{ fontSize: "0.6875rem", color: "#da1e28", fontWeight: 600 }}>
                geblokkeerd op max {Math.max(...hardBlockers.map(b => b.maxTotaal))}/100
              </span>
            )}
          </div>
        </div>
        <div style={{ "--cds-interactive": cfg.kleur } as React.CSSProperties}>
          <ProgressBar value={score} max={100} label="" hideLabel size="small" status="active" />
        </div>
      </Tile>

      {/* Scorefactoren */}
      <Tile style={{ padding: "1.25rem" }}>
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
              const bronnenOpen = openBronnen === factor.naam;
              return (
                <div style={{ marginTop: "1rem", padding: "0.875rem 1rem", backgroundColor: "#f4f4f4", borderLeft: `3px solid ${factorKleur(factor.score)}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                      <span style={{ marginTop: "0.1rem", flexShrink: 0 }}>
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
                    {factor.toelichting}
                  </p>
                  {factor.naam === "Historische precedenten" && precedentPlannen.length > 0 && (
                    <button
                      onClick={() => setModalOpen(true)}
                      style={{ fontSize: "0.75rem", color: "var(--cds-link-primary, #0f62fe)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "0.375rem", textDecoration: "underline" }}
                    >
                      Bekijk {precedentPlannen.length} vastgestelde plan{precedentPlannen.length !== 1 ? "nen" : ""} →
                    </button>
                  )}
                  {heeftBronnen && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <button
                        onClick={() => setOpenBronnen(bronnenOpen ? null : factor.naam)}
                        style={{ fontSize: "0.6875rem", color: "var(--cds-link-primary, #0f62fe)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}
                      >
                        Bronnen ({factor.bronnen!.length}) {bronnenOpen ? "▲" : "▾"}
                      </button>
                      {bronnenOpen && (
                        <div style={{ marginTop: "0.375rem", paddingLeft: "0.625rem", borderLeft: "2px solid #e0e0e0", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                          {factor.bronnen!.map((bron, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem" }}>
                              <span style={{ fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#525252", backgroundColor: "#e8e8e8", padding: "0.1rem 0.3rem", borderRadius: "2px", flexShrink: 0, marginTop: "0.15rem", lineHeight: 1.4 }}>
                                {BRON_TYPE_LABEL[bron.type] ?? bron.type}
                              </span>
                              <div style={{ flex: 1 }}>
                                {bron.url ? (
                                  <a href={bron.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.6875rem", color: "var(--cds-link-primary, #0f62fe)", textDecoration: "underline", lineHeight: 1.4 }}>
                                    {bron.label}
                                  </a>
                                ) : (
                                  <span style={{ fontSize: "0.6875rem", color: "#525252", lineHeight: 1.4 }}>{bron.label}</span>
                                )}
                                {bron.citaat && (
                                  <p style={{ fontSize: "0.625rem", color: "#8d8d8d", margin: "0.15rem 0 0", lineHeight: 1.35, fontStyle: "italic" }}>
                                    &ldquo;{bron.citaat}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Lijstweergave */}
        {weergave === "lijst" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {factoren.map((factor) => {
              const heeftBronnen = (factor.bronnen?.length ?? 0) > 0;
              const bronnenOpen = openBronnen === factor.naam;

              return (
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

                      {heeftBronnen && (
                        <div style={{ marginTop: "0.375rem" }}>
                          <button
                            onClick={() => setOpenBronnen(bronnenOpen ? null : factor.naam)}
                            style={{
                              fontSize: "0.6875rem",
                              color: "var(--cds-link-primary, #0f62fe)",
                              background: "none", border: "none", cursor: "pointer",
                              padding: 0,
                              display: "flex", alignItems: "center", gap: "0.25rem",
                            }}
                          >
                            Bronnen ({factor.bronnen!.length}) {bronnenOpen ? "▲" : "▾"}
                          </button>

                          {bronnenOpen && (
                            <div style={{
                              marginTop: "0.375rem",
                              paddingLeft: "0.625rem",
                              borderLeft: "2px solid var(--cds-border-subtle-00, #e0e0e0)",
                              display: "flex", flexDirection: "column", gap: "0.375rem",
                            }}>
                              {factor.bronnen!.map((bron, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.375rem" }}>
                                  <span style={{
                                    fontSize: "0.5625rem", fontWeight: 700,
                                    textTransform: "uppercase", letterSpacing: "0.04em",
                                    color: "#525252", backgroundColor: "#e8e8e8",
                                    padding: "0.1rem 0.3rem", borderRadius: "2px",
                                    flexShrink: 0, marginTop: "0.15rem", lineHeight: 1.4,
                                  }}>
                                    {BRON_TYPE_LABEL[bron.type] ?? bron.type}
                                  </span>
                                  <div style={{ flex: 1 }}>
                                    {bron.url ? (
                                      <a
                                        href={bron.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: "0.6875rem", color: "var(--cds-link-primary, #0f62fe)", textDecoration: "underline", lineHeight: 1.4 }}
                                      >
                                        {bron.label}
                                      </a>
                                    ) : (
                                      <span style={{ fontSize: "0.6875rem", color: "#525252", lineHeight: 1.4 }}>{bron.label}</span>
                                    )}
                                    {bron.citaat && (
                                      <p style={{ fontSize: "0.625rem", color: "#8d8d8d", margin: "0.15rem 0 0", lineHeight: 1.35, fontStyle: "italic" }}>
                                        &ldquo;{bron.citaat}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
