import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, FileText, Mail, TrendingUp, Shield, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: TrendingUp,
    titel: "Kansscoring",
    beschrijving: "5-staps AI-score op basis van bestemmingsplan, woningtekort, Natura2000 en provinciale omgevingsvisie",
  },
  {
    icon: FileText,
    titel: "AI Rapport",
    beschrijving: "Uitgebreide juridische onderbouwing per factor, specifiek voor uw perceel en gemeente",
  },
  {
    icon: Zap,
    titel: "Actieplan",
    beschrijving: "Stap-voor-stap procedure met doorlooptijden, risico's en verplichte stappen",
  },
  {
    icon: Mail,
    titel: "Kant-en-klare e-mails",
    beschrijving: "Principeverzoek, informatievraag provincie en vooroverleg omgevingsdienst — direct verzendbaar",
  },
  {
    icon: MapPin,
    titel: "Kaartweergave",
    beschrijving: "Interactieve kaart van heel Nederland met perceelinformatie op klikbaar detailniveau",
  },
  {
    icon: Shield,
    titel: "Juridisch correct",
    beschrijving: "Gebaseerd op actuele Omgevingswet, NOVI en gemeentelijke woonvisies",
  },
];

const TIERS = [
  { naam: "Starter", prijs: 49, analyses: "5 analyses/mnd", kleur: "bg-slate-50 border-slate-200", aanbevolen: false },
  { naam: "Pro", prijs: 199, analyses: "30 analyses/mnd", kleur: "bg-primary/5 border-primary", aanbevolen: true },
  { naam: "Business", prijs: 599, analyses: "Onbeperkt", kleur: "bg-slate-50 border-slate-200", aanbevolen: false },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <Badge className="mb-4 bg-primary/20 text-primary-foreground border-primary/30 hover:bg-primary/20">
            Nieuw — Omgevingswet 2024 geïntegreerd
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Weet binnen minuten of uw<br />
            <span className="text-primary">bestemmingswijziging kans van slagen heeft</span>
          </h1>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            AI-gestuurde analyse van ruimtelijke data, gemeentelijk beleid en juridische precedenten.
            Voor particulieren, investeerders en vastgoedontwikkelaars.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/analyse">
              <Button size="lg" className="h-12 px-8 text-base">
                Start gratis analyse
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent">
                Bekijk prijzen
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">Eerste analyse gratis · Geen creditcard vereist</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold">Alles wat u nodig heeft voor uw aanvraag</h2>
          <p className="text-muted-foreground mt-2">Van eerste scan tot verzendklare brieven</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.titel} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{f.titel}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{f.beschrijving}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-slate-50 border-y">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Transparante prijzen</h2>
          <p className="text-muted-foreground mb-8 text-sm">Maandelijks opzegbaar, altijd</p>
          <div className="grid md:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <Card key={tier.naam} className={`relative ${tier.kleur} ${tier.aanbevolen ? "ring-2 ring-primary" : ""}`}>
                {tier.aanbevolen && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs">Meest gekozen</Badge>
                  </div>
                )}
                <CardContent className="pt-6 text-center">
                  <p className="font-semibold">{tier.naam}</p>
                  <p className="text-3xl font-bold mt-2">
                    €{tier.prijs}
                    <span className="text-sm font-normal text-muted-foreground">/mnd</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{tier.analyses}</p>
                  <Link href="/pricing" className="block mt-4">
                    <Button variant={tier.aanbevolen ? "default" : "outline"} className="w-full text-sm h-9">
                      Aan de slag
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold">Klaar om te beginnen?</h2>
        <p className="text-muted-foreground mt-2 text-sm">Analyseer vandaag nog uw perceel — eerste analyse is gratis</p>
        <Link href="/analyse" className="inline-block mt-6">
          <Button size="lg" className="h-12 px-8">
            Start nu uw analyse
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
