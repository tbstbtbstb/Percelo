"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ClipboardList, Building2, Droplets, Leaf, Landmark } from "lucide-react";
import type { OpdrachtBrief } from "@/types";

type OntvangerType = OpdrachtBrief["ontvangerType"];

const ONTVANGER_CONFIG: Record<
  OntvangerType,
  { label: string; badge: string; header: string; icon: React.ElementType; tekstKleur: string }
> = {
  gemeente:   { label: "Gemeente",         badge: "bg-orange-100 text-orange-700", header: "bg-orange-50 text-orange-800", icon: Landmark,  tekstKleur: "text-orange-600" },
  adviseur:   { label: "Adviseur",         badge: "bg-green-100 text-green-700",   header: "bg-green-50 text-green-800",   icon: Leaf,      tekstKleur: "text-green-600" },
  bureau:     { label: "Onderzoeksbureau", badge: "bg-blue-100 text-blue-700",     header: "bg-blue-50 text-blue-800",     icon: Building2, tekstKleur: "text-blue-600" },
  waterschap: { label: "Waterschap",       badge: "bg-cyan-100 text-cyan-700",     header: "bg-cyan-50 text-cyan-800",     icon: Droplets,  tekstKleur: "text-cyan-600" },
};

const GROEP_VOLGORDE: OntvangerType[] = ["gemeente", "adviseur", "bureau", "waterschap"];

function kortNaam(naam: string) {
  return naam.split("(")[0].split("/")[0].trim();
}

export function OpdrachtBrieven({ brieven }: { brieven: OpdrachtBrief[] }) {
  const [geselecteerd, setGeselecteerd] = useState(0);
  const [gekopieerd, setGekopieerd] = useState(false);

  if (!brieven.length) return null;

  const brief = brieven[geselecteerd];
  const config = ONTVANGER_CONFIG[brief.ontvangerType];
  const Icon = config.icon;

  const groepen = GROEP_VOLGORDE.flatMap((type) => {
    const items = brieven
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.ontvangerType === type);
    return items.length ? [{ type, items }] : [];
  });

  async function kopieer() {
    await navigator.clipboard.writeText(`Onderwerp: ${brief.onderwerp}\n\n${brief.inhoud}`);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  function selecteer(i: number) {
    setGeselecteerd(i);
    setGekopieerd(false);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Brieven & verzoeken — klaar voor verzending
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {brieven.length} brieven voor alle verplichte stappen — vul uw naam en contactgegevens in op de aangegeven plekken
        </p>
      </CardHeader>

      <CardContent className="p-0 border-t">
        <div className="flex" style={{ minHeight: "480px", maxHeight: "640px" }}>

          {/* ── Navigatiepanel ─────────────────────────────────────────── */}
          <div className="w-52 shrink-0 border-r overflow-y-auto bg-muted/20">
            {groepen.map(({ type, items }) => {
              const cfg = ONTVANGER_CONFIG[type];
              const Icn = cfg.icon;
              return (
                <div key={type}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border-b ${cfg.header}`}>
                    <Icn className={`h-3 w-3 ${cfg.tekstKleur}`} />
                    {cfg.label}
                  </div>
                  {items.map(({ b, i }) => (
                    <button
                      key={i}
                      onClick={() => selecteer(i)}
                      className={`w-full text-left px-3 py-2.5 text-xs leading-snug border-b last:border-b-0 transition-colors hover:bg-accent ${
                        i === geselecteerd
                          ? "bg-accent font-semibold text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {kortNaam(b.onderzoekNaam)}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* ── Brief-inhoudspanel ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <Badge variant="outline" className={`border-0 text-xs inline-flex items-center gap-1 ${config.badge}`}>
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
                <p className="text-xs text-muted-foreground leading-snug">
                  <span className="font-medium text-foreground">Onderwerp:</span>{" "}
                  {brief.onderwerp}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs shrink-0"
                onClick={kopieer}
              >
                {gekopieerd ? (
                  <><Check className="h-3 w-3 mr-1" /> Gekopieerd</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Kopieer</>
                )}
              </Button>
            </div>

            <pre className="p-4 text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
              {brief.inhoud}
            </pre>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
