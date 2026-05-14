"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import type { WaardestijgingData } from "@/types";

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(bedrag);
}

function Balk({
  label,
  bedragMin,
  bedragMax,
  kleur,
  max,
}: {
  label: string;
  bedragMin: number;
  bedragMax: number;
  kleur: string;
  max: number;
}) {
  const breedte = Math.min(100, (bedragMax / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {eur(bedragMin)} – {eur(bedragMax)}
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${kleur}`}
          style={{ width: `${breedte}%` }}
        />
      </div>
    </div>
  );
}

export function WaardestijgingCalculator({ data }: { data: WaardestijgingData }) {
  const kavelM2 = data.perceelM2 ?? 2500;

  const agrarischWaarde = Math.round((kavelM2 / 10000) * data.agrarischPrijsPerHa);
  const bouwgrondMin = kavelM2 * data.bouwgrondPrijsPerM2Min;
  const bouwgrondMax = kavelM2 * data.bouwgrondPrijsPerM2Max;
  const nettoMin = bouwgrondMin - data.conversiekostenMax - agrarischWaarde;
  const nettoMax = bouwgrondMax - data.conversiekostenMin - agrarischWaarde;
  const maxAankoopMin = bouwgrondMin - data.conversiekostenMax;
  const maxAankoopMax = bouwgrondMax - data.conversiekostenMin;

  const grafiekMax = bouwgrondMax * 1.1;
  const winstPositief = nettoMax > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Waardestijgingsberekening
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Indicatieve berekening op basis van regionale marktdata — {data.regio}
        </p>
        {(data.bodemtype || data.afstandTotKernKm !== undefined || data.aanpassingsPct !== undefined) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.bodemtype && data.bodemtype !== "onbekend" && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                Bodem: {data.bodemtype}
              </span>
            )}
            {data.afstandTotKernKm !== undefined && data.afstandTotKernNaam && data.afstandTotKernNaam !== "onbekend" && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {data.afstandTotKernKm} km van {data.afstandTotKernNaam}
              </span>
            )}
            {data.perceelM2 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                Perceel: {data.perceelM2 >= 10000 ? `${(data.perceelM2 / 10000).toFixed(1)} ha` : `${data.perceelM2.toLocaleString("nl-NL")} m²`}
              </span>
            )}
            {data.aanpassingsPct !== undefined && data.aanpassingsPct !== 0 && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${data.aanpassingsPct > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {data.aanpassingsPct > 0 ? "+" : ""}{data.aanpassingsPct}% t.o.v. regionaal gemiddelde
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Balken */}
        <div className="space-y-4">
          <Balk
            label="Huidige waarde (agrarisch)"
            bedragMin={agrarischWaarde}
            bedragMax={agrarischWaarde}
            kleur="bg-slate-400"
            max={grafiekMax}
          />
          <Balk
            label="Conversiekosten (procedures + onderzoeken)"
            bedragMin={data.conversiekostenMin}
            bedragMax={data.conversiekostenMax}
            kleur="bg-amber-400"
            max={grafiekMax}
          />
          <Balk
            label={`Waarde na conversie (bouwgrond, ${data.regio})`}
            bedragMin={bouwgrondMin}
            bedragMax={bouwgrondMax}
            kleur="bg-emerald-500"
            max={grafiekMax}
          />
        </div>

        {/* Resultaat */}
        <div className={`rounded-lg border p-4 space-y-3 ${winstPositief ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">
                {winstPositief ? "Potentiële netto waardestijging" : "Netto resultaat (negatief scenario)"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bouwgrondwaarde − conversiekosten − huidige agrarische waarde
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xl font-bold tabular-nums ${winstPositief ? "text-emerald-700" : "text-red-700"}`}>
                {eur(nettoMin)}
              </p>
              <p className="text-xs text-muted-foreground">tot {eur(nettoMax)}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Maximale aankoopprijs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Wat u maximaal kunt betalen als u de grond nog moet kopen
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold tabular-nums">
                  {eur(maxAankoopMin)}
                </p>
                <p className="text-xs text-muted-foreground">tot {eur(maxAankoopMax)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toelichting */}
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Agrarische grondprijs: {eur(data.agrarischPrijsPerHa)}/ha ({data.provincie}).
            Bouwgrondprijs na correcties: {eur(data.bouwgrondPrijsPerM2Min)}–{eur(data.bouwgrondPrijsPerM2Max)}/m².
            Bron: {data.databron}. Berekening is indicatief en vervangt geen taxatierapport.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
