"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { X, MapPin } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b">
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Vastgestelde bestemmingswijzigingen binnen 5km
            </div>
            {gemeente && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Regio {gemeente} · afgelopen 8 jaar · {plannen.length} plan{plannen.length !== 1 ? "nen" : ""}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {plannen.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Geen vastgestelde wijzigingsplannen gevonden in de regio.
            </p>
          ) : (
            <>
              {wonenPlannen.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">
                    Woningbouw-precedenten ({wonenPlannen.length})
                  </p>
                  <div className="space-y-1.5">
                    {wonenPlannen.map((p, i) => <PlanRij key={i} plan={p} />)}
                  </div>
                </div>
              )}
              {overigePlannen.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Overige wijzigingen ({overigePlannen.length})
                  </p>
                  <div className="space-y-1.5">
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
    <div className="rounded-md border px-3 py-2 text-xs bg-muted/30">
      <p className="font-medium text-foreground leading-snug" title={plan.naam}>
        {plan.naam}
      </p>
      <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 bg-blue-50 text-blue-700">
          {typeLabel}
        </Badge>
        {datum && <span>{datum}</span>}
      </div>
    </div>
  );
}
