"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Info } from "lucide-react";
import type { KostenRaming } from "@/types";

const CATEGORIE_LABEL: Record<string, string> = {
  onderzoek: "Onderzoeken",
  leges: "Gemeentelijke leges",
  adviseur: "Adviseur RO",
  anterieur: "Anterieure overeenkomst",
  overig: "Overig",
};

function formatBedrag(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(bedrag);
}

export function KostenCalculator({ raming }: { raming: KostenRaming }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Kostenoverzicht
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Indicatieve totaalkosten vóór bouwvergunning — exclusief grondkosten en bouwkosten
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {raming.posten.map((post) => (
            <div key={post.naam} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {CATEGORIE_LABEL[post.categorie]}
                  </span>
                </div>
                <p className="text-sm font-medium mt-0.5">{post.naam}</p>
                <p className="text-xs text-muted-foreground leading-snug">{post.beschrijving}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">
                  {formatBedrag(post.bedragMin)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  tot {formatBedrag(post.bedragMax)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Totaal */}
        <div className="mt-4 rounded-md bg-slate-50 border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Totaal geschatte kosten</p>
              <p className="text-xs text-muted-foreground">Indicatief, exclusief onvoorzien</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums">
                {formatBedrag(raming.totaalMin)}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                tot {formatBedrag(raming.totaalMax)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Bedragen zijn indicatief op basis van marktprijzen 2024–2025. Gemeentelijke leges en anterieure verplichtingen
            variëren sterk. Laat een RO-adviseur een projectspecifieke begroting maken.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
