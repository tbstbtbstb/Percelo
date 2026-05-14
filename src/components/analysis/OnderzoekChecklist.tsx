"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Clock, AlertTriangle, FileText, Receipt, ClipboardCheck } from "lucide-react";
import type { OnderzoekItem } from "@/types";

const RISICO_CONFIG = {
  laag:     { label: "Laag risico",  kleur: "bg-green-100 text-green-700" },
  gemiddeld:{ label: "Let op",       kleur: "bg-yellow-100 text-yellow-700" },
  hoog:     { label: "Hoog risico",  kleur: "bg-orange-100 text-orange-700" },
  kritiek:  { label: "Kritiek",      kleur: "bg-red-100 text-red-700" },
};

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(bedrag);
}

const CATEGORIE_CONFIG = {
  procedure: {
    label: "Procedures",
    icon: ClipboardCheck,
    beschrijving: "Verplichte stappen die u zelf initieert",
    kleur: "text-blue-600",
    bgKleur: "bg-blue-50 border-blue-100",
  },
  onderzoek: {
    label: "Technische onderzoeken",
    icon: FlaskConical,
    beschrijving: "Onderzoeken die u laat uitvoeren door gecertificeerde bureaus",
    kleur: "text-purple-600",
    bgKleur: "bg-purple-50 border-purple-100",
  },
  document: {
    label: "Verplichte documenten & overeenkomsten",
    icon: FileText,
    beschrijving: "Documenten die moeten zijn opgesteld voordat de gemeente de procedure start",
    kleur: "text-amber-600",
    bgKleur: "bg-amber-50 border-amber-100",
  },
  leges: {
    label: "Gemeentelijke leges",
    icon: Receipt,
    beschrijving: "Verschuldigd bij indiening van de aanvraag — niet restitueerbaar bij afwijzing",
    kleur: "text-slate-600",
    bgKleur: "bg-slate-50 border-slate-200",
  },
} as const;

export function OnderzoekChecklist({ onderzoeken }: { onderzoeken: OnderzoekItem[] }) {
  const verplicht = onderzoeken.filter((o) => o.verplicht);
  const aanbevolen = onderzoeken.filter((o) => !o.verplicht);

  const groepen = (["procedure", "onderzoek", "document", "leges"] as const).map((cat) => ({
    cat,
    items: verplicht.filter((o) => (o.categorie ?? "onderzoek") === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Verplichte stappen & onderzoeken
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Alles wat u moet regelen voordat de gemeente uw aanvraag in behandeling neemt
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

        {groepen.map(({ cat, items }) => {
          const config = CATEGORIE_CONFIG[cat];
          const Icon = config.icon;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-3.5 w-3.5 ${config.kleur}`} />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {config.label}
                </p>
              </div>
              <div className="space-y-2">
                {items.map((o) => (
                  <OnderzoekRij key={o.naam} item={o} accentKleur={config.bgKleur} />
                ))}
              </div>
            </div>
          );
        })}

        {aanbevolen.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Mogelijk ook vereist
            </p>
            <div className="space-y-2">
              {aanbevolen.map((o) => (
                <OnderzoekRij key={o.naam} item={o} accentKleur="bg-slate-50 border-slate-100" />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-md bg-slate-50 border p-3 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 inline mr-1.5 text-amber-500" />
          Start met het principeverzoek — laat pas daarna de dure onderzoeken uitvoeren. Voer de technische onderzoeken parallel uit om 2–3 maanden doorlooptijd te besparen.
        </div>
      </CardContent>
    </Card>
  );
}

function OnderzoekRij({
  item,
  accentKleur,
}: {
  item: OnderzoekItem;
  accentKleur: string;
}) {
  const risico = RISICO_CONFIG[item.risico];
  const kostenNul = item.kostenMin === 0 && item.kostenMax === 0;

  return (
    <div className={`flex gap-3 p-3 rounded-md border ${accentKleur}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-medium">{item.naam}</span>
          <Badge variant="outline" className={`text-xs border-0 shrink-0 ${risico.kleur}`}>
            {risico.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.toelichting}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.doorlooptijd}
          </span>
          {!kostenNul && (
            <span className="font-medium text-foreground">
              {item.kostenMin === item.kostenMax
                ? eur(item.kostenMin)
                : `${eur(item.kostenMin)} – ${eur(item.kostenMax)}`}
            </span>
          )}
          {item.categorie === "procedure" && item.kostenMax === 0 && (
            <span className="font-medium text-green-700">Gratis of lage kosten</span>
          )}
        </div>
      </div>
    </div>
  );
}
