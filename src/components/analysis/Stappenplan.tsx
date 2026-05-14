"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Stap } from "@/types";
import { Clock, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

const RISICO_CONFIG = {
  laag: { label: "Laag risico", kleur: "bg-green-100 text-green-700" },
  gemiddeld: { label: "Gemiddeld risico", kleur: "bg-yellow-100 text-yellow-700" },
  hoog: { label: "Hoog risico", kleur: "bg-red-100 text-red-700" },
};

export function Stappenplan({ stappen }: { stappen: Stap[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actieplan & Vervolgstappen</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0">
          {stappen.map((stap, i) => (
            <li key={stap.nummer} className="flex gap-4 pb-6 last:pb-0">
              {/* Verticale lijn */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {stap.nummer}
                </div>
                {i < stappen.length - 1 && (
                  <div className="mt-1 w-0.5 flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1 pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm">{stap.titel}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${RISICO_CONFIG[stap.risico].kleur} border-0`}>
                      {RISICO_CONFIG[stap.risico].label}
                    </Badge>
                    {stap.vereist && (
                      <Badge variant="secondary" className="text-xs">Verplicht</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">{stap.beschrijving}</p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{stap.doorlooptijd}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
