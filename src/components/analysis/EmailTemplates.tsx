"use client";

import { useState } from "react";
import { Tile } from "@carbon/react";
import { Copy, Checkmark, Email } from "@carbon/icons-react";
import type { EmailTemplate } from "@/types";

const TYPE_LABELS: Record<EmailTemplate["type"], string> = {
  principeverzoek: "Principeverzoek",
  "informatievraag-provincie": "Provincie",
  "vooroverleg-omgevingsdienst": "Vooroverleg",
};

export function EmailTemplates({ templates }: { templates: EmailTemplate[] }) {
  const [actief, setActief] = useState(0);
  const [gekopieerd, setGekopieerd] = useState(false);

  if (!templates.length) return null;

  const template = templates[actief];

  async function kopieer() {
    await navigator.clipboard.writeText(`Onderwerp: ${template.onderwerp}\n\n${template.inhoud}`);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  return (
    <Tile style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>
          <Email size={16} />
          Concept E-mails
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem" }}>
          Professionele brieven klaar voor verzending — pas aan naar eigen situatie
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
        {templates.map((t, i) => (
          <button
            key={t.type}
            onClick={() => { setActief(i); setGekopieerd(false); }}
            style={{
              flex: 1, padding: "0.625rem 0.75rem", fontSize: "0.8125rem",
              border: "none", borderBottom: i === actief ? "2px solid var(--cds-interactive, #0f62fe)" : "2px solid transparent",
              background: i === actief ? "var(--cds-layer-selected-01, #e0e0e0)" : "var(--cds-layer-02, #e0e0e0)",
              fontWeight: i === actief ? 600 : 400,
              color: i === actief ? "var(--cds-text-primary, #161616)" : "var(--cds-text-secondary, #525252)",
              cursor: "pointer",
            }}
          >
            {TYPE_LABELS[t.type]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "1rem 1.25rem" }}>
        <div style={{ padding: "0.75rem", backgroundColor: "var(--cds-layer-02, #e0e0e0)", marginBottom: "0.75rem", fontSize: "0.75rem" }}>
          <p style={{ color: "var(--cds-text-secondary, #525252)" }}>
            <strong style={{ color: "var(--cds-text-primary, #161616)" }}>Aan:</strong> {template.ontvanger}
          </p>
          <p style={{ color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem" }}>
            <strong style={{ color: "var(--cds-text-primary, #161616)" }}>Onderwerp:</strong> {template.onderwerp}
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <pre style={{
            border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
            backgroundColor: "var(--cds-layer-01, #f4f4f4)",
            padding: "1rem", paddingTop: "2.5rem",
            fontSize: "0.75rem", lineHeight: 1.6,
            whiteSpace: "pre-wrap", fontFamily: "inherit",
            color: "var(--cds-text-primary, #161616)",
            overflowY: "auto", maxHeight: "16rem",
          }}>
            {template.inhoud}
          </pre>
          <button
            onClick={kopieer}
            style={{
              position: "absolute", top: "0.5rem", right: "0.5rem",
              display: "flex", alignItems: "center", gap: "0.25rem",
              padding: "0.25rem 0.625rem", fontSize: "0.75rem",
              border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
              backgroundColor: "var(--cds-layer-01, #f4f4f4)",
              color: "var(--cds-text-primary, #161616)", cursor: "pointer",
            }}
          >
            {gekopieerd ? <><Checkmark size={14} /> Gekopieerd</> : <><Copy size={14} /> Kopieer</>}
          </button>
        </div>
      </div>
    </Tile>
  );
}
