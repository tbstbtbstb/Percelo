"use client";

import { useState } from "react";
import { AddressSearch } from "@/components/analysis/AddressSearch";
import { ScoreDisplay } from "@/components/analysis/ScoreDisplay";
import { ActiePlan } from "@/components/analysis/ActiePlan";
import { EmailTemplates } from "@/components/analysis/EmailTemplates";
import { OpdrachtBrieven } from "@/components/analysis/OpdrachtBrieven";
import { WaardestijgingCalculator } from "@/components/analysis/WaardestijgingCalculator";
import { PerceelKaart } from "@/components/analysis/PerceelKaart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Perceel, AnalyseResultaat } from "@/types";
import { Loader2, MapPin, AlertCircle, FileText, Download } from "lucide-react";

export default function AnalysePage() {
  const [perceel, setPerceel] = useState<Perceel | null>(null);
  const [resultaat, setResultaat] = useState<AnalyseResultaat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadPDF() {
    if (!resultaat) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultaat),
      });
      if (!res.ok) throw new Error("PDF generatie mislukt");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analyse-${resultaat.analyseId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user sees no PDF
    } finally {
      setPdfLoading(false);
    }
  }

  async function startAnalyse() {
    if (!perceel) return;
    setIsLoading(true);
    setFout(null);
    setResultaat(null);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perceel }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Analyse mislukt");
      }

      const data: AnalyseResultaat = await res.json();
      setResultaat(data);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Er is een onbekende fout opgetreden");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <div className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            <span>Bestemmingswijziging Analyse</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Analyseer de slagingskans van uw bestemmingswijziging
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            AI-gestuurde analyse op basis van ruimtelijke data, gemeentelijk beleid en juridische precedenten
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Invoer */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Adres of perceelnummer</p>
              <AddressSearch
                onPerceelGeselecteerd={(p) => {
                  setPerceel(p);
                  setResultaat(null);
                  setFout(null);
                }}
                isLoading={isLoading}
              />
            </div>

            {perceel && (
              <div className="space-y-2">
                <PerceelKaart lat={perceel.lat} lon={perceel.lon} adres={perceel.adres} />
                <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900">{perceel.adres}</p>
                      <p className="text-blue-700 text-xs mt-0.5">
                        {[perceel.gemeente, perceel.provincie].filter(Boolean).join(" · ")}
                        {perceel.lat && ` · ${perceel.lat.toFixed(4)}°N, ${perceel.lon.toFixed(4)}°E`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={startAnalyse}
              disabled={!perceel || isLoading}
              className="w-full h-11"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyse wordt uitgevoerd...</>
              ) : (
                <><FileText className="h-4 w-4 mr-2" /> Start analyse</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Foutmelding */}
        {fout && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-900 text-sm">Analyse mislukt</p>
              <p className="text-red-700 text-xs mt-0.5">{fout}</p>
            </div>
          </div>
        )}

        {/* Laad-indicator */}
        {isLoading && (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Analyse wordt uitgevoerd</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ruimtelijke data ophalen, bestemmingsplan controleren en AI-rapport genereren...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultaten */}
        {resultaat && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Analyseresultaten</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {resultaat.analyseId.slice(0, 8)} · {new Date(resultaat.gegenereedOp).toLocaleString("nl-NL")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                disabled={pdfLoading}
                className="shrink-0"
              >
                {pdfLoading
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />PDF...</>
                  : <><Download className="h-3.5 w-3.5 mr-1.5" />Download PDF</>
                }
              </Button>
            </div>

            {resultaat.reedsBouwgrond ? (
              <div className="rounded-xl bg-green-50 border border-green-200 p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">
                      Dit perceel heeft al een bouw- of woonbestemming
                    </p>
                    {resultaat.huidigeBestemming && resultaat.huidigeBestemming !== "onbekend" && (
                      <p className="text-green-800 text-sm mt-0.5">
                        Huidige bestemming: <span className="font-medium">{resultaat.huidigeBestemming}</span>
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-green-800 leading-relaxed">
                  Een bestemmingswijziging is voor dit perceel niet nodig — de grond is al juridisch geschikt voor woningbouw of ander gebruik.
                  U kunt direct een omgevingsvergunning aanvragen bij de gemeente.
                </p>
              </div>
            ) : (
              <>
                {/* Score */}
                <ScoreDisplay
                  score={resultaat.totaalScore}
                  scoreKlasse={resultaat.scoreKlasse}
                  factoren={resultaat.factoren}
                  precedentPlannen={resultaat.precedentPlannen}
                  gemeente={resultaat.perceel.gemeente}
                />

                {/* Rapport */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      AI Analyse Rapport
                    </h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                      {resultaat.rapport}
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                {/* Actieplan met geïntegreerde onderzoeken & kosten */}
                <ActiePlan
                  onderzoeken={resultaat.onderzoeken}
                  kostenRaming={resultaat.kostenRaming}
                />

                <Separator />

                <WaardestijgingCalculator data={resultaat.waardestijging} />
                <OpdrachtBrieven brieven={resultaat.opdrachtbrieven} />

                {/* E-mails */}
                <EmailTemplates templates={resultaat.emailTemplates} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
