import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import Link from "next/link";

const TIERS = [
  {
    naam: "Starter",
    prijs: 49,
    doelgroep: "Particulieren",
    analyses: 5,
    features: [
      { label: "5 analyses per maand", ok: true },
      { label: "Basis scorerapport", ok: true },
      { label: "Actieplan", ok: true },
      { label: "Kaartweergave", ok: false },
      { label: "E-mail templates", ok: false },
      { label: "CSV/PDF export", ok: false },
      { label: "API-toegang", ok: false },
    ],
    aanbevolen: false,
    cta: "Gratis proberen",
  },
  {
    naam: "Pro",
    prijs: 199,
    doelgroep: "Ondernemers & Investeerders",
    analyses: 30,
    features: [
      { label: "30 analyses per maand", ok: true },
      { label: "Volledig scorerapport", ok: true },
      { label: "Actieplan", ok: true },
      { label: "Kaartweergave", ok: true },
      { label: "E-mail templates", ok: true },
      { label: "CSV/PDF export", ok: true },
      { label: "API-toegang", ok: false },
    ],
    aanbevolen: true,
    cta: "Start Pro",
  },
  {
    naam: "Business",
    prijs: 599,
    doelgroep: "Vastgoedontwikkelaars",
    analyses: null,
    features: [
      { label: "Onbeperkte analyses", ok: true },
      { label: "Volledig scorerapport", ok: true },
      { label: "Actieplan", ok: true },
      { label: "Kaartweergave + white-label", ok: true },
      { label: "E-mail templates", ok: true },
      { label: "CSV/PDF export", ok: true },
      { label: "API-toegang + bulkupload", ok: true },
    ],
    aanbevolen: false,
    cta: "Neem contact op",
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold">Eenvoudige, transparante prijzen</h1>
        <p className="text-muted-foreground mt-2">
          Maandelijks opzegbaar. Geen verborgen kosten.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <Card
            key={tier.naam}
            className={`relative flex flex-col ${tier.aanbevolen ? "ring-2 ring-primary shadow-lg" : ""}`}
          >
            {tier.aanbevolen && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge>Meest gekozen</Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <div>
                <p className="font-bold text-lg">{tier.naam}</p>
                <p className="text-xs text-muted-foreground">{tier.doelgroep}</p>
              </div>
              <div className="mt-3">
                <span className="text-4xl font-bold">€{tier.prijs}</span>
                <span className="text-muted-foreground text-sm">/maand</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {tier.analyses ? `${tier.analyses} analyses per maand` : "Onbeperkte analyses"}
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm">
                    {f.ok ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={f.ok ? "" : "text-muted-foreground/60"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/analyse" className="block mt-6">
                <Button
                  className="w-full"
                  variant={tier.aanbevolen ? "default" : "outline"}
                >
                  {tier.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enterprise */}
      <Card className="mt-8 bg-slate-900 text-white border-0">
        <CardContent className="py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Enterprise</p>
            <p className="text-slate-400 text-sm mt-1">
              Voor conceptontwikkelaars en fondsen · Custom integraties · Accountmanager · SLA
            </p>
          </div>
          <Button variant="secondary" className="shrink-0">
            Neem contact op
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
