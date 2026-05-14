"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock, ChevronDown, ChevronUp, Info,
  ClipboardCheck, FlaskConical, FileText, Receipt, CheckCircle2, Flag,
} from "lucide-react";
import type { OnderzoekItem, KostenPost, KostenRaming } from "@/types";
import type { LucideIcon } from "lucide-react";

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(bedrag);
}

function eurRange(min: number, max: number) {
  if (min === max || min === 0) return eur(max || min);
  return `${eur(min)} – ${eur(max)}`;
}

interface Fase {
  nummer: number;
  titel: string;
  beschrijving: string;
  doorlooptijd: string;
  starter: string;
  onderzoekenCategorie: Array<"procedure" | "onderzoek" | "document" | "leges">;
  kostenCategorie: Array<"onderzoek" | "leges" | "adviseur" | "anterieur" | "overig">;
  icon: LucideIcon;
  accentKleur: string;
}

const FASES: Fase[] = [
  {
    nummer: 1,
    titel: "Principeverzoek indienen bij de gemeente",
    beschrijving:
      "Start altijd met een principeverzoek — dit is een informeel verzoek waarbij u vraagt of de gemeente in beginsel bereid is mee te werken. Vrijwel alle gemeenten verlangen dit als eerste stap. Het voorkomt dat u duizenden euro's uitgeeft aan onderzoeken terwijl de gemeente het initiatief bij voorbaat afwijst.",
    doorlooptijd: "4–12 weken",
    starter:
      "U kunt direct beginnen. Gebruik de brief 'Principeverzoek' uit de sjablonen hieronder. Stuur deze naar de afdeling Ruimtelijke Ordening van de gemeente.",
    onderzoekenCategorie: ["procedure"],
    kostenCategorie: [],
    icon: Flag,
    accentKleur: "text-blue-600",
  },
  {
    nummer: 2,
    titel: "Verplichte technische onderzoeken laten uitvoeren",
    beschrijving:
      "Na een positief principebesluit schakelt u gecertificeerde onderzoeksbureaus in. Voer alle onderzoeken zo parallel mogelijk uit — dit bespaart 2–3 maanden doorlooptijd. De rapporten vormen de technische onderbouwing van uw aanvraag en zijn verplicht bij indiening.",
    doorlooptijd: "4–12 weken (parallel uitvoeren)",
    starter:
      "Wacht op positief principebesluit van de gemeente. Vraag daarna gelijktijdig offertes op bij meerdere gecertificeerde bureaus. U vindt kant-en-klare opdrachtbrieven in de sjablonen hieronder.",
    onderzoekenCategorie: ["onderzoek"],
    kostenCategorie: ["onderzoek"],
    icon: FlaskConical,
    accentKleur: "text-purple-600",
  },
  {
    nummer: 3,
    titel: "Ruimtelijke onderbouwing & verplichte overeenkomsten",
    beschrijving:
      "Parallel aan de onderzoeken stelt uw RO-adviseur de ruimtelijke onderbouwing op — het juridische kernstuk van uw aanvraag. Tegelijkertijd sluit u de anterieure overeenkomst (kostenverhaal) en planschadeovereenkomst met de gemeente. Zonder deze documenten start de gemeente de formele procedure niet.",
    doorlooptijd: "4–16 weken (na beschikbaarheid onderzoeken)",
    starter:
      "Schakel een RO-adviseur in zodra de onderzoeken worden opgestart. De overeenkomsten bespreekt u in het vooroverleg met de gemeente. Gebruik de opdrachtbrief 'Ruimtelijke onderbouwing' en de brieven voor de anterieure overeenkomst en planschadeovereenkomst.",
    onderzoekenCategorie: ["document"],
    kostenCategorie: ["adviseur", "anterieur", "overig"],
    icon: FileText,
    accentKleur: "text-amber-600",
  },
  {
    nummer: 4,
    titel: "Formele aanvraag indienen via het Omgevingsloket",
    beschrijving:
      "Als alle onderzoeksrapporten beschikbaar zijn, de ruimtelijke onderbouwing gereed is en alle overeenkomsten zijn ondertekend, dient u de formele aanvraag omgevingsplanwijziging in via het Omgevingsloket (omgevingsloket.nl). Bij indiening betaalt u de gemeentelijke leges — let op: deze zijn niet restitueerbaar als de aanvraag wordt afgewezen.",
    doorlooptijd: "Indiening + 26 weken wettelijke beslistermijn",
    starter:
      "Alle onderzoeksrapporten gereed, ruimtelijke onderbouwing opgesteld, anterieure overeenkomst en planschadeovereenkomst ondertekend. Indiening via omgevingsloket.nl.",
    onderzoekenCategorie: ["leges"],
    kostenCategorie: ["leges"],
    icon: Receipt,
    accentKleur: "text-slate-600",
  },
  {
    nummer: 5,
    titel: "Terinzagelegging, zienswijzen & vaststelling",
    beschrijving:
      "De gemeente legt het ontwerpbesluit 6 weken ter inzage. Omwonenden en andere belanghebbenden kunnen zienswijzen indienen. Daarna besluit het college van B&W of de gemeenteraad over vaststelling. Tegen het vastgestelde besluit is beroep bij de Afdeling bestuursrechtspraak van de Raad van State mogelijk.",
    doorlooptijd: "6–26 weken (na indiening)",
    starter:
      "Geen actie van u vereist, tenzij zienswijzen worden ingediend die een inhoudelijke reactie vergen. Uw RO-adviseur kan u hierbij ondersteunen.",
    onderzoekenCategorie: [],
    kostenCategorie: [],
    icon: CheckCircle2,
    accentKleur: "text-green-600",
  },
];

const RISICO_CONFIG = {
  laag:     { label: "Laag risico",  kleur: "bg-green-100 text-green-700" },
  gemiddeld:{ label: "Let op",       kleur: "bg-yellow-100 text-yellow-700" },
  hoog:     { label: "Hoog risico",  kleur: "bg-orange-100 text-orange-700" },
  kritiek:  { label: "Kritiek",      kleur: "bg-red-100 text-red-700" },
} as const;

interface Props {
  onderzoeken: OnderzoekItem[];
  kostenRaming: KostenRaming;
}

export function ActiePlan({ onderzoeken, kostenRaming }: Props) {
  const [openFase, setOpenFase] = useState<number | null>(1);

  function getOnderzoeken(fase: Fase): OnderzoekItem[] {
    return onderzoeken.filter((o) => {
      const cat = (o.categorie ?? "onderzoek") as Fase["onderzoekenCategorie"][number];
      return fase.onderzoekenCategorie.includes(cat);
    });
  }

  function getKosten(fase: Fase): KostenPost[] {
    return kostenRaming.posten.filter((p) => fase.kostenCategorie.includes(p.categorie));
  }

  function faseTotaal(fase: Fase) {
    const kosten = getKosten(fase);
    if (!kosten.length) return null;
    return {
      min: kosten.reduce((s, k) => s + k.bedragMin, 0),
      max: kosten.reduce((s, k) => s + k.bedragMax, 0),
    };
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Actieplan</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Van principeverzoek tot vaststelling — per stap de verplichte onderzoeken, kosten en wat u nodig heeft om te beginnen
        </p>
      </div>

      <ol className="space-y-0">
        {FASES.map((fase, i) => {
          const faseOnderzoeken = getOnderzoeken(fase);
          const faseKosten = getKosten(fase);
          const totaal = faseTotaal(fase);
          const isOpen = openFase === fase.nummer;
          const Icon = fase.icon;

          // Split mandatory vs recommended
          const verplicht = faseOnderzoeken.filter((o) => o.verplicht);
          const aanbevolen = faseOnderzoeken.filter((o) => !o.verplicht);

          return (
            <li key={fase.nummer} className="flex gap-3 pb-3 last:pb-0">
              {/* Timeline */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {fase.nummer}
                </div>
                {i < FASES.length - 1 && (
                  <div className="mt-1 w-0.5 flex-1 bg-border min-h-[1.25rem]" />
                )}
              </div>

              {/* Card */}
              <div className="flex-1 min-w-0 pb-1">
                <Card className="overflow-hidden">
                  {/* Header — clickable */}
                  <button
                    className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
                    onClick={() => setOpenFase(isOpen ? null : fase.nummer)}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${fase.accentKleur}`} />
                          <span className="font-semibold text-sm leading-snug">{fase.titel}</span>
                          {totaal && (
                            <Badge variant="outline" className="text-[10px] border-0 bg-slate-100 text-slate-700 shrink-0 font-medium">
                              {eurRange(totaal.min, totaal.max)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {fase.doorlooptijd}
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      }
                    </div>
                  </button>

                  {/* Expandable body */}
                  {isOpen && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t">

                      {/* 1. Wat moet je doen */}
                      <div className="pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                          Wat moet je doen?
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{fase.beschrijving}</p>
                      </div>

                      {/* 2. Verplichte stappen / onderzoeken */}
                      {(verplicht.length > 0 || aanbevolen.length > 0) && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Verplichte stappen & onderzoeken
                          </p>
                          <div className="space-y-1.5">
                            {verplicht.map((o) => (
                              <OnderzoekRij key={o.naam} item={o} />
                            ))}
                            {aanbevolen.length > 0 && (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
                                  Mogelijk ook vereist
                                </p>
                                {aanbevolen.map((o) => (
                                  <OnderzoekRij key={o.naam} item={o} dimmed />
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3. Kosten */}
                      {faseKosten.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Kosten in deze fase
                          </p>
                          <div className="rounded-md border overflow-hidden">
                            {faseKosten.map((post) => (
                              <div
                                key={post.naam}
                                className="flex items-start justify-between gap-4 px-3 py-2.5 border-b last:border-0 bg-white"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium">{post.naam}</p>
                                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{post.beschrijving}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-semibold tabular-nums">{eur(post.bedragMin)}</p>
                                  <p className="text-[10px] text-muted-foreground tabular-nums">tot {eur(post.bedragMax)}</p>
                                </div>
                              </div>
                            ))}
                            {totaal && faseKosten.length > 1 && (
                              <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                                <span className="text-xs font-semibold">Subtotaal fase {fase.nummer}</span>
                                <span className="text-xs font-semibold tabular-nums">
                                  {eurRange(totaal.min, totaal.max)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. Wie / wat heb je nodig */}
                      <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-blue-900 flex items-center gap-1.5 mb-0.5">
                          <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                          Wat heb je nodig om te beginnen?
                        </p>
                        <p className="text-[11px] text-blue-800 leading-relaxed">{fase.starter}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Totaalkosten samenvatting */}
      <div className="rounded-xl bg-slate-50 border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Totaal geschatte kosten</p>
            <p className="text-xs text-muted-foreground">Indicatief — exclusief grondkosten en bouwkosten</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums">{eur(kostenRaming.totaalMin)}</p>
            <p className="text-sm text-muted-foreground tabular-nums">tot {eur(kostenRaming.totaalMax)}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Bedragen zijn indicatief op basis van marktprijzen 2024–2025. Leges en anterieure bijdragen variëren sterk per gemeente.
            Laat een RO-adviseur een projectspecifieke begroting opstellen.
          </p>
        </div>
      </div>
    </div>
  );
}

function OnderzoekRij({ item, dimmed = false }: { item: OnderzoekItem; dimmed?: boolean }) {
  const risico = RISICO_CONFIG[item.risico];
  const kostenNul = item.kostenMin === 0 && item.kostenMax === 0;
  return (
    <div className={`rounded-md border p-3 text-xs ${dimmed ? "bg-muted/20" : "bg-white"}`}>
      <div className="flex items-start gap-2 flex-wrap">
        <span className="font-medium text-foreground">{item.naam}</span>
        <Badge variant="outline" className={`text-[10px] border-0 shrink-0 ${risico.kleur}`}>
          {risico.label}
        </Badge>
        {item.verplicht && (
          <Badge variant="outline" className="text-[10px] border-0 bg-blue-50 text-blue-700 shrink-0">
            Verplicht
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground mt-1 leading-relaxed">{item.toelichting}</p>
      <div className="flex items-center gap-4 mt-1.5 text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {item.doorlooptijd}
        </span>
        {!kostenNul && (
          <span className="font-medium text-foreground">
            {item.kostenMin === item.kostenMax
              ? eur(item.kostenMin)
              : `${eur(item.kostenMin)} – ${eur(item.kostenMax)}`}
          </span>
        )}
      </div>
    </div>
  );
}
