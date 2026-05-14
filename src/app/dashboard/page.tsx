import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, TrendingUp, Clock } from "lucide-react";

const MOCK_ANALYSES = [
  {
    id: "a1b2c3d4",
    adres: "Koekoekslaan 12, Almere",
    gemeente: "Almere",
    scoreKlasse: "hoog" as const,
    score: 72,
    datum: "2026-05-10",
  },
  {
    id: "e5f6g7h8",
    adres: "Langeweg 45, Breda",
    gemeente: "Breda",
    scoreKlasse: "gemiddeld" as const,
    score: 54,
    datum: "2026-05-08",
  },
  {
    id: "i9j0k1l2",
    adres: "Molenkade 3, Gouda",
    gemeente: "Gouda",
    scoreKlasse: "laag" as const,
    score: 31,
    datum: "2026-05-05",
  },
];

const KLEUR: Record<string, string> = {
  "ultra-hoog": "bg-emerald-100 text-emerald-700",
  hoog: "bg-green-100 text-green-700",
  gemiddeld: "bg-yellow-100 text-yellow-700",
  laag: "bg-orange-100 text-orange-700",
  "ultra-laag": "bg-red-100 text-red-700",
};

const LABEL: Record<string, string> = {
  "ultra-hoog": "Ultra Hoog",
  hoog: "Hoog",
  gemiddeld: "Gemiddeld",
  laag: "Laag",
  "ultra-laag": "Ultra Laag",
};

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mijn Percelen</h1>
          <p className="text-muted-foreground text-sm mt-1">Overzicht van uw analyses</p>
        </div>
        <Link href="/analyse">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe analyse
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Analyses deze maand</p>
            <p className="text-2xl font-bold mt-1">3</p>
            <p className="text-xs text-muted-foreground">van 30 (Pro)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Gemiddelde score</p>
            <p className="text-2xl font-bold mt-1">52</p>
            <p className="text-xs text-muted-foreground text-yellow-600">Gemiddeld</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Hoge kans percelen</p>
            <p className="text-2xl font-bold mt-1">1</p>
            <p className="text-xs text-muted-foreground text-green-600">Actie aanbevolen</p>
          </CardContent>
        </Card>
      </div>

      {/* Lijst */}
      <div className="space-y-3">
        {MOCK_ANALYSES.map((analyse) => (
          <Card key={analyse.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{analyse.adres}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(analyse.datum).toLocaleDateString("nl-NL")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-lg">{analyse.score}</p>
                    <p className="text-xs text-muted-foreground">score</p>
                  </div>
                  <Badge className={`${KLEUR[analyse.scoreKlasse]} border-0 text-xs`}>
                    {LABEL[analyse.scoreKlasse]}
                  </Badge>
                  <Link href="/analyse">
                    <Button variant="ghost" size="sm" className="text-xs h-8">
                      Bekijk
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upgrade teaser */}
      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardContent className="py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">Portefeuillebeheer & Monitoring</p>
              <p className="text-xs text-muted-foreground">
                Ontvang alerts bij bestemmingsplanwijzigingen in uw interessegebied — beschikbaar in Business
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <Button size="sm" variant="outline" className="shrink-0 text-xs">
              Upgrade
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
