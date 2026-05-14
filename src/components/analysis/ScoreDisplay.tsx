"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreKlasse, ScoreFactor, PrecedentPlan } from "@/types";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { PrecedentenModal } from "./PrecedentenModal";

const SCORE_CONFIG: Record<ScoreKlasse, { label: string; kleur: string; bg: string; ring: string }> = {
  "ultra-hoog": { label: "Ultra Hoog", kleur: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-500" },
  hoog: { label: "Hoog", kleur: "text-green-700", bg: "bg-green-50", ring: "ring-green-400" },
  gemiddeld: { label: "Gemiddeld", kleur: "text-yellow-700", bg: "bg-yellow-50", ring: "ring-yellow-400" },
  laag: { label: "Laag", kleur: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-400" },
  "ultra-laag": { label: "Ultra Laag", kleur: "text-red-700", bg: "bg-red-50", ring: "ring-red-500" },
};

const PROGRESS_KLEUR: Record<ScoreKlasse, string> = {
  "ultra-hoog": "[&>div]:bg-emerald-500",
  hoog: "[&>div]:bg-green-500",
  gemiddeld: "[&>div]:bg-yellow-500",
  laag: "[&>div]:bg-orange-500",
  "ultra-laag": "[&>div]:bg-red-500",
};

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
    <div className="space-y-4">
      {/* Hoofdscore */}
      <div className={`rounded-xl p-6 ${cfg.bg} ring-2 ${cfg.ring}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Slagingskans</p>
            <p className={`text-4xl font-bold mt-1 ${cfg.kleur}`}>{score}/100</p>
          </div>
          <Badge variant="outline" className={`text-lg px-4 py-2 ${cfg.kleur} border-current font-semibold`}>
            {cfg.label}
          </Badge>
        </div>
        <Progress value={score} className={`h-3 ${PROGRESS_KLEUR[scoreKlasse]}`} />
      </div>

      {/* Factoren */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scorefactoren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {factoren.map((factor) => (
            <div key={factor.naam} className="space-y-1.5">
              <div className="flex items-start gap-2">
                {factor.positief ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : factor.score >= 40 ? (
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{factor.naam}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{factor.score}/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{factor.toelichting}</p>
                  {factor.naam === "Historische precedenten" && precedentPlannen.length > 0 && (
                    <button
                      onClick={() => setModalOpen(true)}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      Bekijk {precedentPlannen.length} vastgestelde plan{precedentPlannen.length !== 1 ? "nen" : ""} →
                    </button>
                  )}
                  <Progress
                    value={factor.score}
                    className={`h-1.5 mt-1.5 ${
                      factor.score >= 70
                        ? "[&>div]:bg-green-400"
                        : factor.score >= 40
                        ? "[&>div]:bg-yellow-400"
                        : "[&>div]:bg-red-400"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <PrecedentenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        plannen={precedentPlannen}
        gemeente={gemeente}
      />
    </div>
  );
}
