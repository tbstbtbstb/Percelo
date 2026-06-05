"use client";

import { useState, useEffect } from "react";
import { Copy, Checkmark, Email, Building, Time, Warning, Information } from "@carbon/icons-react";
import type { EmailTemplate } from "@/types";
import type { CarbonIconType } from "@carbon/icons-react";

type TemplateType = EmailTemplate["type"];

const TEMPLATE_CONFIG: Record<TemplateType, {
  label: string;
  kleur: string;
  stip: string;
  Icon: CarbonIconType;
  ontvangerLabel: string;
}> = {
  "principeverzoek":              { label: "Principeverzoek",    kleur: "#0043ce", stip: "#0f62fe", Icon: Building,     ontvangerLabel: "Gemeente" },
  "informatievraag-provincie":    { label: "Provincie",          kleur: "#005d5d", stip: "#009d9a", Icon: Information,  ontvangerLabel: "Provincie" },
  "vooroverleg-omgevingsdienst":  { label: "Omgevingsdienst",   kleur: "#525252", stip: "#697077", Icon: Email,        ontvangerLabel: "Omgevingsdienst" },
  "herinnering-principeverzoek":  { label: "Herinnering",        kleur: "#7d4300", stip: "#f1c21b", Icon: Time,         ontvangerLabel: "Gemeente" },
  "afwijzing-aanvechten":         { label: "Bezwaarschrift",     kleur: "#750e13", stip: "#da1e28", Icon: Warning,      ontvangerLabel: "Gemeente" },
};

const GROEP_VOLGORDE: TemplateType[] = [
  "principeverzoek",
  "informatievraag-provincie",
  "vooroverleg-omgevingsdienst",
  "herinnering-principeverzoek",
  "afwijzing-aanvechten",
];

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
      title="Kopieer e-mail"
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
        : <><Copy size={14} /> Kopieer e-mail</>
      }
    </button>
  );
}

// ── Desktop: mailclient layout ────────────────────────────────────────────────

function DesktopLayout({ templates }: { templates: EmailTemplate[] }) {
  const [geselecteerd, setGeselecteerd] = useState(0);

  const t = templates[geselecteerd];
  const cfg = TEMPLATE_CONFIG[t.type];
  const TemplateIcon = cfg.Icon;

  const geordend = GROEP_VOLGORDE
    .map((type) => templates.map((tmpl, i) => ({ tmpl, i })).find(({ tmpl }) => tmpl.type === type))
    .filter((x): x is { tmpl: EmailTemplate; i: number } => x !== undefined);

  return (
    <div style={{ display: "flex", height: "620px", borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>

      {/* Sidebar */}
      <div style={{
        width: "13rem", flexShrink: 0,
        borderRight: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
        overflowY: "auto",
        backgroundColor: "#fafafa",
        paddingTop: "0.375rem",
      }}>
        {geordend.map(({ tmpl, i }) => {
          const gcfg = TEMPLATE_CONFIG[tmpl.type];
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
                  {gcfg.label}
                </p>
                <p style={{
                  fontSize: "0.6875rem", color: "#8d8d8d",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginTop: "0.125rem", lineHeight: 1.3,
                }}>
                  {gcfg.ontvangerLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mail content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", backgroundColor: "#ffffff", overflow: "hidden" }}>

        {/* Mail header */}
        <div style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
          backgroundColor: "#ffffff",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.625rem" }}>
                <TemplateIcon size={14} style={{ color: cfg.kleur, flexShrink: 0 }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: cfg.kleur }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Onderwerp</span>
                  <span style={{ color: "#161616", fontWeight: 500 }}>{t.onderwerp}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Aan</span>
                  <span style={{ color: "#525252" }}>{t.ontvanger}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Van</span>
                  <span style={{ color: "#525252", fontStyle: "italic" }}>[Uw naam en contactgegevens invullen]</span>
                </div>
              </div>
            </div>
            <KopieerKnop tekst={`Onderwerp: ${t.onderwerp}\n\n${t.inhoud}`} />
          </div>
        </div>

        {/* Mail body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <pre style={{
            fontSize: "0.875rem", lineHeight: 1.75,
            whiteSpace: "pre-wrap", fontFamily: "inherit",
            color: "#161616", margin: 0,
          }}>
            {t.inhoud}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ── Mobiel: accordion ─────────────────────────────────────────────────────────

function MobielLayout({ templates }: { templates: EmailTemplate[] }) {
  const [open, setOpen] = useState<number>(0);

  const geordend = GROEP_VOLGORDE
    .map((type) => templates.map((tmpl, i) => ({ tmpl, i })).find(({ tmpl }) => tmpl.type === type))
    .filter((x): x is { tmpl: EmailTemplate; i: number } => x !== undefined);

  return (
    <div style={{ borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
      {geordend.map(({ tmpl, i }) => {
        const cfg = TEMPLATE_CONFIG[tmpl.type];
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
                    {cfg.label}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#8d8d8d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "0.125rem" }}>
                    {tmpl.ontvanger}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: "1rem", color: isOpen ? "#0f62fe" : "#8d8d8d", flexShrink: 0, lineHeight: 1 }}>
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen && (
              <div style={{ backgroundColor: "#ffffff" }}>
                <div style={{
                  padding: "0.875rem 1rem",
                  borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                  borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                  backgroundColor: "#fafafa",
                  display: "flex", flexDirection: "column", gap: "0.25rem",
                }}>
                  <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Onderwerp</span>
                    <span style={{ color: "#161616", fontWeight: 500 }}>{tmpl.onderwerp}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#8d8d8d", flexShrink: 0, width: "5rem" }}>Aan</span>
                    <span style={{ color: "#525252" }}>{tmpl.ontvanger}</span>
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <KopieerKnop tekst={`Onderwerp: ${tmpl.onderwerp}\n\n${tmpl.inhoud}`} compact />
                  </div>
                </div>
                <pre style={{
                  padding: "1.25rem 1rem",
                  fontSize: "0.875rem", lineHeight: 1.75,
                  whiteSpace: "pre-wrap", fontFamily: "inherit",
                  color: "#161616", margin: 0, overflowX: "auto",
                }}>
                  {tmpl.inhoud}
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

export function EmailTemplates({ templates }: { templates: EmailTemplate[] }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!templates.length) return null;

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
          <Email size={16} style={{ color: "#525252" }} />
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>
            Concept e-mails
          </span>
          <span style={{
            fontSize: "0.6875rem", fontWeight: 600,
            padding: "0.125rem 0.5rem",
            backgroundColor: "#e0e0e0", color: "#525252",
          }}>
            {templates.length}
          </span>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
          Vul uw naam en contactgegevens in op de aangegeven plekken
        </p>
      </div>

      {isMobile
        ? <MobielLayout templates={templates} />
        : <DesktopLayout templates={templates} />
      }
    </div>
  );
}
