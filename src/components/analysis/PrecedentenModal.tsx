"use client";

import { useEffect } from "react";
import { Tag } from "@carbon/react";
import { Close, Location } from "@carbon/icons-react";
import type { PrecedentPlan } from "@/types";

const TYPE_LABEL: Record<string, string> = {
  "wijzigingsplan": "Wijzigingsplan",
  "uitwerkingsplan": "Uitwerkingsplan",
  "gemeentelijk plan; uitwerkingsplan artikel 11": "Uitwerkingsplan art. 11",
  "gemeentelijk plan; wijzigingsplan artikel 11": "Wijzigingsplan art. 11",
};

const WONEN_TERMEN = ["wonen", "woon", "woningbouw", "woongebied", "woondoeleinden", "woonwijk", "woningen"];

function isWonen(naam: string) {
  return WONEN_TERMEN.some(t => naam.toLowerCase().includes(t));
}

function formatDatum(datum?: string) {
  if (!datum) return null;
  const d = new Date(datum);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("nl-NL", { year: "numeric", month: "long" });
}

interface Props {
  open: boolean;
  onClose: () => void;
  plannen: PrecedentPlan[];
  gemeente?: string;
}

export function PrecedentenModal({ open, onClose, plannen, gemeente }: Props) {
  const wonenPlannen = plannen.filter(p => isWonen(p.naam));
  const overigePlannen = plannen.filter(p => !isWonen(p.naam));

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: "relative", zIndex: 1,
        backgroundColor: "var(--cds-layer-01, #f4f4f4)",
        width: "100%", maxWidth: "32rem",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", padding: "1.25rem 1.25rem 0.75rem", borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>
              <Location size={16} style={{ color: "var(--cds-text-secondary, #525252)" }} />
              Vastgestelde bestemmingswijzigingen binnen 5km
            </div>
            {gemeente && (
              <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.125rem" }}>
                Regio {gemeente} · afgelopen 8 jaar · {plannen.length} plan{plannen.length !== 1 ? "nen" : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cds-text-secondary, #525252)", flexShrink: 0, padding: "0.125rem", marginTop: "0.125rem" }}
            aria-label="Sluiten"
          >
            <Close size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {plannen.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", textAlign: "center", padding: "2rem 0" }}>
              Geen vastgestelde wijzigingsplannen gevonden in de regio.
            </p>
          ) : (
            <>
              {wonenPlannen.length > 0 && (
                <div>
                  <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#24a148", marginBottom: "0.5rem" }}>
                    Woningbouw-precedenten ({wonenPlannen.length})
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {wonenPlannen.map((p, i) => <PlanRij key={i} plan={p} />)}
                  </div>
                </div>
              )}
              {overigePlannen.length > 0 && (
                <div>
                  <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
                    Overige wijzigingen ({overigePlannen.length})
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {overigePlannen.map((p, i) => <PlanRij key={i} plan={p} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanRij({ plan }: { plan: PrecedentPlan }) {
  const datum = formatDatum(plan.datum);
  const typeLabel = TYPE_LABEL[plan.type] ?? plan.type;

  return (
    <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "var(--cds-layer-02, #e0e0e0)", border: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
      <p style={{ fontWeight: 500, fontSize: "0.8125rem", lineHeight: 1.4, color: "var(--cds-text-primary, #161616)" }}>{plan.naam}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
        <Tag type="blue" size="sm">{typeLabel}</Tag>
        {datum && <span style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>{datum}</span>}
      </div>
    </div>
  );
}
