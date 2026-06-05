"use client";

import { useState, useEffect } from "react";
import { Copy, Checkmark, SendAlt, Building, UserMultiple, Sprout, ChevronDown, ChevronUp } from "@carbon/icons-react";
import type { OpdrachtBrief } from "@/types";
import type { CarbonIconType } from "@carbon/icons-react";

type OntvangerType = OpdrachtBrief["ontvangerType"];

const ONTVANGER_CONFIG: Record<OntvangerType, {
  label: string;
  kleur: string;
  stip: string;
  Icon: CarbonIconType;
}> = {
  gemeente:   { label: "Gemeente",         kleur: "#525252", stip: "#697077", Icon: Building },
  adviseur:   { label: "Adviseur",         kleur: "#0e6027", stip: "#24a148", Icon: Sprout },
  bureau:     { label: "Onderzoeksbureau", kleur: "#0043ce", stip: "#0f62fe", Icon: UserMultiple },
  waterschap: { label: "Waterschap",       kleur: "#005d5d", stip: "#009d9a", Icon: Building },
};

const GROEP_VOLGORDE: OntvangerType[] = ["gemeente", "adviseur", "bureau", "waterschap"];

function kortNaam(naam: string) {
  return naam.split("(")[0].split("/")[0].trim();
}

function KopieerKnop({ tekst, compact = false }: { tekst: string; compact?: boolean }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  async function kopieer() {
    await navigator.clipboard.writeText(tekst);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }
  return (
    <button
      onClick={kopieer}
      title="Kopieer brief"
      style={{
        display: "flex", alignItems: "center", gap: "0.375rem",
        padding: compact ? "0.375rem 0.75rem" : "0.5rem 1rem",
        fontSize: "0.8125rem", cursor: "pointer",
        border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
        backgroundColor: gekopieerd ? "#defbe6" : "#ffffff",
        color: gekopieerd ? "#0e6027" : "var(--cds-text-primary, #161616)",
        whiteSpace: "nowrap", transition: "background-color 0.15s",
        fontWeight: 500,
      }}
    >
      {gekopieerd
        ? <><Checkmark size={14} /> Gekopieerd</>
        : <><Copy size={14} /> Kopieer brief</>
      }
    </button>
  );
}

// ── Desktop: mailclient layout ────────────────────────────────────────────────

function DesktopLayout({ brieven }: { brieven: OpdrachtBrief[] }) {
  const [geselecteerd, setGeselecteerd] = useState(0);

  const brief = brieven[geselecteerd];
  const cfg = ONTVANGER_CONFIG[brief.ontvangerType];
  const BriefIcon = cfg.Icon;

  const groepen = GROEP_VOLGORDE.flatMap((type) => {
    const items = brieven.map((b, i) => ({ b, i })).filter(({ b }) => b.ontvangerType === type);
    return items.length ? [{ type, items }] : [];
  });

  return (
    <div style={{ display: "flex", height: "560px", borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>

      {/* Inbox-sidebar */}
      <div style={{
        width: "14rem", flexShrink: 0,
        borderRight: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
        overflowY: "auto",
        backgroundColor: "#fafafa",
      }}>
        {groepen.map(({ type, items }, gi) => {
          const gcfg = ONTVANGER_CONFIG[type];
          return (
            <div key={type} style={{ paddingTop: gi > 0 ? "0.5rem" : 0 }}>
              {/* Subtiele groepslabel */}
              <p style={{
                padding: "0.5rem 0.875rem 0.25rem",
                fontSize: "0.625rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: "#a8a8a8",
              }}>
                {gcfg.label}
              </p>

              {items.map(({ b, i }) => {
                const actief = i === geselecteerd;
                return (
                  <button
                    key={i}
                    onClick={() => setGeselecteerd(i)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "0.625rem 0.875rem",
                      background: actief ? "#edf5ff" : "transparent",
                      border: "none",
                      borderLeft: `3px solid ${actief ? "#0f62fe" : "transparent"}`,
                      cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: "0.625rem",
                    }}
                  >
                    {/* Gekleurde stip */}
                    <div style={{
                      width: "0.5rem", height: "0.5rem", borderRadius: "50%",
                      backgroundColor: gcfg.stip, flexShrink: 0, marginTop: "0.3rem",
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: "0.8125rem", fontWeight: actief ? 600 : 400,
                        color: actief ? "#161616" : "#525252",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        lineHeight: 1.3,
                      }}>
                        {kortNaam(b.onderzoekNaam)}
                      </p>
                      <p style={{
                        fontSize: "0.6875rem", color: "#8d8d8d",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginTop: "0.125rem", lineHeight: 1.3,
                      }}>
                        {b.onderwerp}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Mail content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", backgroundColor: "#ffffff", overflow: "hidden" }}>

        {/* Mail header — sticky */}
        <div style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
          backgroundColor: "#ffffff",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {/* Ontvanger type badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.625rem" }}>
                <BriefIcon size={14} style={{ color: cfg.kleur, flexShrink: 0 }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: cfg.kleur }}>
                  {cfg.label}
                </span>
              </div>

              {/* Mail metadata */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Onderwerp</span>
                  <span style={{ color: "#161616", fontWeight: 500 }}>{brief.onderwerp}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Aan</span>
                  <span style={{ color: "#525252" }}>{cfg.label}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Van</span>
                  <span style={{ color: "#525252", fontStyle: "italic" }}>[Uw naam en contactgegevens invullen]</span>
                </div>
              </div>
            </div>

            <KopieerKnop tekst={`Onderwerp: ${brief.onderwerp}\n\n${brief.inhoud}`} />
          </div>
        </div>

        {/* Mail body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <pre style={{
            fontSize: "0.875rem", lineHeight: 1.75,
            whiteSpace: "pre-wrap", fontFamily: "inherit",
            color: "#161616", margin: 0,
          }}>
            {brief.inhoud}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ── Mobiel: accordion ─────────────────────────────────────────────────────────

function MobielLayout({ brieven }: { brieven: OpdrachtBrief[] }) {
  const [open, setOpen] = useState<number>(0);

  return (
    <div style={{ borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
      {brieven.map((b, i) => {
        const cfg = ONTVANGER_CONFIG[b.ontvangerType];
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "0.75rem",
                padding: "0.875rem 1rem",
                background: isOpen ? "#edf5ff" : "#ffffff",
                border: "none",
                borderLeft: `3px solid ${isOpen ? "#0f62fe" : "transparent"}`,
                cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
                <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: cfg.stip, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: isOpen ? 600 : 400, color: isOpen ? "#161616" : "#525252", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {kortNaam(b.onderzoekNaam)}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#8d8d8d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "0.125rem" }}>
                    {b.onderwerp}
                  </p>
                </div>
              </div>
              {isOpen
                ? <ChevronUp size={16} style={{ flexShrink: 0, color: "#0f62fe" }} />
                : <ChevronDown size={16} style={{ flexShrink: 0, color: "#8d8d8d" }} />
              }
            </button>

            {isOpen && (
              <div style={{ backgroundColor: "#ffffff" }}>
                {/* Mail metadata */}
                <div style={{
                  padding: "0.875rem 1rem",
                  borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                  borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                  backgroundColor: "#fafafa",
                  display: "flex", flexDirection: "column", gap: "0.25rem",
                }}>
                  <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Onderwerp</span>
                    <span style={{ color: "#161616", fontWeight: 500 }}>{b.onderwerp}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Aan</span>
                    <span style={{ color: "#525252" }}>{cfg.label}</span>
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <KopieerKnop tekst={`Onderwerp: ${b.onderwerp}\n\n${b.inhoud}`} compact />
                  </div>
                </div>
                <pre style={{
                  padding: "1.25rem 1rem",
                  fontSize: "0.875rem", lineHeight: 1.75,
                  whiteSpace: "pre-wrap", fontFamily: "inherit",
                  color: "#161616", margin: 0, overflowX: "auto",
                }}>
                  {b.inhoud}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function OpdrachtBrieven({ brieven }: { brieven: OpdrachtBrief[] }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!brieven.length) return null;

  return (
    <div style={{ border: "1px solid var(--cds-border-subtle-00, #e0e0e0)", overflow: "hidden", backgroundColor: "#ffffff" }}>
      {/* Header */}
      <div style={{
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
        backgroundColor: "#ffffff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <SendAlt size={16} style={{ color: "#525252" }} />
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>
            Brieven & verzoeken
          </span>
          <span style={{
            fontSize: "0.6875rem", fontWeight: 600,
            padding: "0.125rem 0.5rem",
            backgroundColor: "#e0e0e0", color: "#525252",
          }}>
            {brieven.length}
          </span>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
          Vul uw naam en contactgegevens in op de aangegeven plekken
        </p>
      </div>

      {isMobile
        ? <MobielLayout brieven={brieven} />
        : <DesktopLayout brieven={brieven} />
      }
    </div>
  );
}
