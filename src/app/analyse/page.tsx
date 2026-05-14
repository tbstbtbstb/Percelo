"use client";

import { useState } from "react";
import { Button, Tile, InlineLoading, InlineNotification } from "@carbon/react";
import { Location, Document, Download } from "@carbon/icons-react";
import { AddressSearch } from "@/components/analysis/AddressSearch";
import { ScoreDisplay } from "@/components/analysis/ScoreDisplay";
import { ActiePlan } from "@/components/analysis/ActiePlan";
import { EmailTemplates } from "@/components/analysis/EmailTemplates";
import { OpdrachtBrieven } from "@/components/analysis/OpdrachtBrieven";
import { WaardestijgingCalculator } from "@/components/analysis/WaardestijgingCalculator";
import { PerceelKaart } from "@/components/analysis/PerceelKaart";
import type { Perceel, AnalyseResultaat } from "@/types";

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
      // silently fail
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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--cds-background, #f4f4f4)" }}>
      {/* Hero */}
      <div style={{ borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)", backgroundColor: "var(--cds-layer-01, #ffffff)" }}>
        <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "2rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
            <Location size={14} />
            <span>Bestemmingswijziging Analyse</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)" }}>
            Analyseer de slagingskans van uw bestemmingswijziging
          </h1>
          <p style={{ color: "var(--cds-text-secondary, #525252)", marginTop: "0.375rem", fontSize: "0.875rem" }}>
            AI-gestuurde analyse op basis van ruimtelijke data, gemeentelijk beleid en juridische precedenten
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Invoer */}
        <Tile style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem", color: "var(--cds-text-primary, #161616)" }}>
                Adres of perceelnummer
              </p>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <PerceelKaart lat={perceel.lat} lon={perceel.lon} adres={perceel.adres} />
                <div style={{
                  padding: "0.75rem",
                  backgroundColor: "#edf5ff",
                  borderLeft: "4px solid #0f62fe",
                  display: "flex", alignItems: "flex-start", gap: "0.5rem",
                }}>
                  <Location size={16} style={{ color: "#0f62fe", flexShrink: 0, marginTop: "0.125rem" }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#001d6c" }}>{perceel.adres}</p>
                    <p style={{ fontSize: "0.75rem", color: "#0043ce", marginTop: "0.125rem" }}>
                      {[perceel.gemeente, perceel.provincie].filter(Boolean).join(" · ")}
                      {perceel.lat && ` · ${perceel.lat.toFixed(4)}°N, ${perceel.lon.toFixed(4)}°E`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={startAnalyse}
              disabled={!perceel || isLoading}
              size="lg"
              style={{ width: "100%", maxWidth: "100%", justifyContent: "center" }}
            >
              {isLoading ? (
                <InlineLoading description="Analyse wordt uitgevoerd..." status="active" />
              ) : (
                <><Document size={16} style={{ marginRight: "0.5rem" }} /> Start analyse</>
              )}
            </Button>
          </div>
        </Tile>

        {/* Foutmelding */}
        {fout && (
          <InlineNotification
            kind="error"
            title="Analyse mislukt"
            subtitle={fout}
            hideCloseButton
            lowContrast
          />
        )}

        {/* Laad-indicator */}
        {isLoading && (
          <Tile style={{ padding: "3rem 1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center" }}>
              <InlineLoading description="" status="active" style={{ fontSize: "2rem" }} />
              <div>
                <p style={{ fontWeight: 600 }}>Analyse wordt uitgevoerd</p>
                <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.25rem" }}>
                  Ruimtelijke data ophalen, bestemmingsplan controleren en AI-rapport genereren...
                </p>
              </div>
            </div>
          </Tile>
        )}

        {/* Resultaten */}
        {resultaat && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header + PDF button */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary, #161616)" }}>Analyseresultaten</h2>
                <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "0.125rem" }}>
                  ID: {resultaat.analyseId.slice(0, 8)} · {new Date(resultaat.gegenereedOp).toLocaleString("nl-NL")}
                </p>
              </div>
              <Button
                kind="secondary"
                size="sm"
                onClick={downloadPDF}
                disabled={pdfLoading}
                style={{ flexShrink: 0 }}
              >
                {pdfLoading
                  ? <InlineLoading description="PDF..." status="active" />
                  : <><Download size={16} style={{ marginRight: "0.375rem" }} /> Download PDF</>
                }
              </Button>
            </div>

            {resultaat.reedsBouwgrond ? (
              <div style={{
                padding: "1.5rem",
                backgroundColor: "#defbe6",
                borderLeft: "4px solid #24a148",
                display: "flex", alignItems: "flex-start", gap: "0.75rem",
              }}>
                <Location size={20} style={{ color: "#24a148", flexShrink: 0, marginTop: "0.125rem" }} />
                <div>
                  <p style={{ fontWeight: 600, color: "#044317" }}>
                    Dit perceel heeft al een bouw- of woonbestemming
                  </p>
                  {resultaat.huidigeBestemming && resultaat.huidigeBestemming !== "onbekend" && (
                    <p style={{ fontSize: "0.875rem", color: "#044317", marginTop: "0.25rem" }}>
                      Huidige bestemming: <strong>{resultaat.huidigeBestemming}</strong>
                    </p>
                  )}
                  <p style={{ fontSize: "0.875rem", color: "#0e6027", marginTop: "0.5rem", lineHeight: 1.5 }}>
                    Een bestemmingswijziging is voor dit perceel niet nodig — de grond is al juridisch geschikt voor woningbouw of ander gebruik.
                    U kunt direct een omgevingsvergunning aanvragen bij de gemeente.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <ScoreDisplay
                  score={resultaat.totaalScore}
                  scoreKlasse={resultaat.scoreKlasse}
                  factoren={resultaat.factoren}
                  precedentPlannen={resultaat.precedentPlannen}
                  gemeente={resultaat.perceel.gemeente}
                />

                <Tile style={{ padding: "1.25rem" }}>
                  <h3 style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Document size={16} />
                    AI Analyse Rapport
                  </h3>
                  <div style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                    {resultaat.rapport}
                  </div>
                </Tile>

                <hr style={{ border: "none", borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }} />

                <ActiePlan
                  onderzoeken={resultaat.onderzoeken}
                  kostenRaming={resultaat.kostenRaming}
                />

                <hr style={{ border: "none", borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }} />

                <WaardestijgingCalculator data={resultaat.waardestijging} />
                <OpdrachtBrieven brieven={resultaat.opdrachtbrieven} />
                <EmailTemplates templates={resultaat.emailTemplates} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
