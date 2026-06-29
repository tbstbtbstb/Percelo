"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { Button, InlineLoading } from "@carbon/react";
import { Location, Download, Compare, Locked } from "@carbon/icons-react";
import { AdviesKaart } from "@/components/analysis/AdviesKaart";
import { AddressSearch } from "@/components/analysis/AddressSearch";
import { ScoreDisplay } from "@/components/analysis/ScoreDisplay";
import { ActiePlan } from "@/components/analysis/ActiePlan";
import { EmailTemplates } from "@/components/analysis/EmailTemplates";
import { OpdrachtBrieven } from "@/components/analysis/OpdrachtBrieven";
import { WaardestijgingCalculator } from "@/components/analysis/WaardestijgingCalculator";
import { PerceelKaart } from "@/components/analysis/PerceelKaart";
import type { Perceel, AnalyseResultaat } from "@/types";

const KadastraleKaartPicker = dynamic(
  () => import("@/components/analysis/KadastraleKaartPicker"),
  { ssr: false, loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "0.875rem", color: "#525252" }}>
      Kaart laden…
    </div>
  )}
);

type TabId = "resultaten" | "actieplan" | "waardestijging" | "correspondentie";

const TABS: { id: TabId; label: string }[] = [
  { id: "resultaten",      label: "Analyseresultaten" },
  { id: "actieplan",       label: "Actieplan & voortgang" },
  { id: "waardestijging",  label: "Waardestijging" },
  { id: "correspondentie", label: "Correspondentie" },
];

export default function AnalysePage() {
  const { isSignedIn } = useUser();
  const [perceel, setPerceel] = useState<Perceel | null>(null);
  const [resultaat, setResultaat] = useState<AnalyseResultaat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [actieveTab, setActieveTab] = useState<TabId>("resultaten");
  const [mapFlyTo, setMapFlyTo] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);
  // TODO: freemium gate — zet terug op useState(false) + localStorage logica bij launch
  const [isPro] = useState(true);
  const [analysesGebruikt] = useState(0);
  const [emailsLaden, setEmailsLaden] = useState(false);
  const [emailFout, setEmailFout] = useState<string | null>(null);

  useEffect(() => {
    if (actieveTab !== "correspondentie" || !resultaat || resultaat.emailTemplates.length > 0 || emailsLaden) return;
    setEmailsLaden(true);
    setEmailFout(null);
    fetch("/api/email-genereer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perceel: resultaat.perceel,
        totaalScore: resultaat.totaalScore,
        scoreKlasse: resultaat.scoreKlasse,
        factoren: resultaat.factoren,
        onderzoeken: resultaat.onderzoeken,
        precedentPlannen: resultaat.precedentPlannen,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "E-mails laden mislukt");
        }
        return res.json();
      })
      .then(({ emailTemplates }) => {
        setResultaat((prev) => prev ? { ...prev, emailTemplates } : prev);
      })
      .catch((e) => {
        setEmailFout(e instanceof Error ? e.message : "E-mails laden mislukt, probeer opnieuw");
      })
      .finally(() => setEmailsLaden(false));
  }, [actieveTab, resultaat?.analyseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Pre-fill vanuit kansrijke-percelen pagina
    const lat = params.get("lat");
    const lon = params.get("lon");
    const adres = params.get("adres");
    if (lat && lon && adres) {
      const oppervlakte = params.get("oppervlakte");
      const p: Perceel = {
        adres,
        gemeente: params.get("gemeente") ?? undefined,
        provincie: params.get("provincie") ?? undefined,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        bestemmingHint: params.get("bestemming") ?? undefined,
        perceelOppervlakte: oppervlakte ? parseInt(oppervlakte, 10) : undefined,
      };
      setPerceel(p);
      startAnalyse(p);
      return;
    }

    const id = params.get("id");
    if (!id) return;
    const opgeslagen = localStorage.getItem(`analyse_${id}`);
    if (opgeslagen) {
      const data: AnalyseResultaat = JSON.parse(opgeslagen);
      setResultaat(data);
      setPerceel(data.perceel);
    }
  }, []);

  async function slaAnalyseOp(data: AnalyseResultaat) {
    if (!isSignedIn) return;
    try {
      await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyseId: data.analyseId,
          adres: data.perceel.adres,
          gemeente: data.perceel.gemeente ?? "",
          totaalScore: data.totaalScore,
          scoreKlasse: data.scoreKlasse,
          gegenereedOp: data.gegenereedOp,
          reedsBouwgrond: data.reedsBouwgrond ?? false,
        }),
      });
    } catch {
      // stilletjes negeren
    }
  }

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

  async function startAnalyse(perceelOverride?: Perceel) {
    const p = perceelOverride ?? perceel;
    if (!p) return;
    setIsLoading(true);
    setFout(null);
    setResultaat(null);
    setActieveTab("resultaten");

    const MAX_POGINGEN = 2;
    let lastError: string | null = null;

    for (let poging = 1; poging <= MAX_POGINGEN; poging++) {
      try {
        const res = await fetch("/api/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perceel: p }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.error ?? "Analyse mislukt";
          // Niet opnieuw proberen bij rate-limit of client-fouten
          if (res.status === 429 || res.status < 500) {
            setFout(msg);
            setIsLoading(false);
            return;
          }
          throw new Error(msg);
        }

        const data: AnalyseResultaat = await res.json();
        setResultaat(data);
        localStorage.setItem(`analyse_${data.analyseId}`, JSON.stringify(data));
        slaAnalyseOp(data);
        setIsLoading(false);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Er is een onbekende fout opgetreden";
        if (poging < MAX_POGINGEN) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    setFout(lastError ?? "Analyse mislukt, probeer opnieuw");
    setIsLoading(false);
  }

  const GRATIS_LIMIET = 5;
  const resultatenVergrendeld = !isPro && analysesGebruikt >= GRATIS_LIMIET;
  const tabVergrendeld = (id: TabId) =>
    !isPro && (id !== "resultaten" || resultatenVergrendeld);

  function UpgradeWall({ tabLabel }: { tabLabel: string }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "3rem 1.5rem", gap: "1.25rem" }}>
        <div style={{ width: "3rem", height: "3rem", borderRadius: "50%", backgroundColor: "#f4f4f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Locked size={20} style={{ color: "#525252" }} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: "1rem", color: "#161616" }}>{tabLabel} is onderdeel van Percelo Pro</p>
          <p style={{ fontSize: "0.875rem", color: "#525252", marginTop: "0.375rem", maxWidth: "22rem", lineHeight: 1.5 }}>
            Ontgrendel het actieplan, de waardestijgingscalculator en alle correspondentie voor uw perceel.
          </p>
        </div>
        <Button size="md" disabled style={{ opacity: 0.5 }}>
          Ontgrendelen — binnenkort beschikbaar
        </Button>
        <p style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
          Testen? Voeg <code style={{ backgroundColor: "#f4f4f4", padding: "0.1rem 0.3rem", borderRadius: "2px" }}>?pro=1</code> toe aan de URL.
        </p>
      </div>
    );
  }

  // ── Kaartmodus: geen resultaat — kaart als fullscreen achtergrond ──
  if (!resultaat) {
    return (
      <>
        {/* Kaart vult het scherm onder de navbar (48px) */}
        <div style={{ position: "fixed", top: "3rem", left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          <KadastraleKaartPicker
            beginLat={perceel?.lat}
            beginLon={perceel?.lon}
            flyTo={mapFlyTo}
            onPerceelGeselecteerd={(p) => {
              setPerceel(p);
              setFout(null);
            }}
          />
        </div>

        {/* Floating invoerpanel — zweeft over de kaart, reageert niet op kaartinteracties */}
        <div style={{
          position: "fixed",
          top: "calc(3rem + 1.25rem)",
          left: "1.25rem",
          width: "min(440px, calc(100% - 2.5rem))",
          zIndex: 100,
          backgroundColor: "#F4F4F4",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "1.25rem",
        }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#161616", margin: 0 }}>
            Bestemmingswijziging analyseren
          </p>

          <AddressSearch
            onPerceelGeselecteerd={(p) => {
              setPerceel(p);
              setFout(null);
              setMapFlyTo({ lat: p.lat, lon: p.lon, zoom: 17 });
            }}
            isLoading={isLoading}
            externalValue={perceel?.adres}
          />

          {fout && (
            <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "#fff1f1", borderLeft: "3px solid #da1e28", fontSize: "0.8125rem", color: "#a2191f" }}>
              {fout}
            </div>
          )}

          <Button
            onClick={() => startAnalyse()}
            disabled={!perceel || isLoading}
            size="md"
            style={{ width: "100%", maxWidth: "100%", justifyContent: "center" }}
          >
            {isLoading
              ? <InlineLoading description="Analyse wordt uitgevoerd..." status="active" />
              : "Start analyse →"
            }
          </Button>
        </div>
      </>
    );
  }

  // ── Resultatenweergave: normale paginalayout, kaart verborgen ──
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>

      {/* Compacte header met perceel + acties */}
      <div style={{ borderBottom: "1px solid #e0e0e0", backgroundColor: "#f4f4f4" }}>
        <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0.875rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            <button
              onClick={() => { setResultaat(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#0f62fe", fontSize: "0.8125rem", fontWeight: 600, padding: 0, flexShrink: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              ← Nieuwe analyse
            </button>
            {perceel && (
              <span style={{ fontSize: "0.8125rem", color: "#525252", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {perceel.adres}{perceel.gemeente ? ` · ${perceel.gemeente}` : ""}
              </span>
            )}
          </div>
          <Button kind="secondary" size="sm" onClick={downloadPDF} disabled={pdfLoading} style={{ flexShrink: 0 }}>
            {pdfLoading
              ? <InlineLoading description="PDF..." status="active" />
              : <><Download size={16} style={{ marginRight: "0.375rem" }} />Download PDF</>
            }
          </Button>
        </div>
      </div>

      {/* Perceel kaartweergave */}
      {perceel && (
        <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "1.5rem 1rem 0" }}>
          <PerceelKaart lat={perceel.lat} lon={perceel.lon} adres={perceel.adres} />
        </div>
      )}

      {/* Analyse-ID */}
      <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0.75rem 1rem 0" }}>
        <p style={{ fontSize: "0.75rem", color: "#525252" }}>
          Analyse ID: {resultaat.analyseId.slice(0, 8)} · {new Date(resultaat.gegenereedOp).toLocaleString("nl-NL")}
        </p>
      </div>

      {resultaat.reedsBouwgrond ? (
        <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
          <div style={{ padding: "1.5rem", backgroundColor: "#defbe6", borderLeft: "4px solid #24a148", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <Location size={20} style={{ color: "#24a148", flexShrink: 0, marginTop: "0.125rem" }} />
            <div>
              <p style={{ fontWeight: 600, color: "#044317" }}>Dit perceel heeft al een bouw- of woonbestemming</p>
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
        </div>
      ) : (
        <>
          {/* Sticky tabbar */}
          <div style={{ position: "sticky", top: "0", zIndex: 50, backgroundColor: "#ffffff", borderBottom: "1px solid #e0e0e0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1rem", display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
              {TABS.map((tab) => {
                const actief = actieveTab === tab.id;
                const vergrendeld = tabVergrendeld(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActieveTab(tab.id)}
                    style={{
                      flexShrink: 0, padding: "0.875rem 1.25rem", fontSize: "0.875rem",
                      fontWeight: actief ? 600 : 400,
                      color: actief ? "#161616" : vergrendeld ? "#8d8d8d" : "#525252",
                      background: "transparent", border: "none",
                      borderBottom: actief ? "2px solid #0f62fe" : "2px solid transparent",
                      cursor: "pointer", whiteSpace: "nowrap",
                      display: "flex", alignItems: "center", gap: "0.375rem",
                    }}
                  >
                    {tab.label}
                    {vergrendeld && <Locked size={14} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab inhoud */}
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "2rem 1rem 3rem" }}>
            {actieveTab === "resultaten" && (
              tabVergrendeld("resultaten") ? <UpgradeWall tabLabel="Analyseresultaten" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <ScoreDisplay score={resultaat.totaalScore} scoreKlasse={resultaat.scoreKlasse} factoren={resultaat.factoren} precedentPlannen={resultaat.precedentPlannen} gemeente={resultaat.perceel.gemeente} hardBlockers={resultaat.hardBlockers} />
                  {resultaat.adviesKaart && <AdviesKaart data={resultaat.adviesKaart} />}
                </div>
              )
            )}
            {actieveTab === "actieplan" && (
              tabVergrendeld("actieplan") ? <UpgradeWall tabLabel="Actieplan & voortgang" /> : (
                <ActiePlan onderzoeken={resultaat.onderzoeken} kostenRaming={resultaat.kostenRaming} />
              )
            )}
            {actieveTab === "waardestijging" && (
              tabVergrendeld("waardestijging") ? <UpgradeWall tabLabel="Waardestijging" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <WaardestijgingCalculator data={resultaat.waardestijging} />
                  <div style={{ padding: "1rem 1.25rem", backgroundColor: "#edf5ff", borderLeft: "4px solid #0f62fe", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#001d6c" }}>Vergelijk buurgemeenten</p>
                      <p style={{ fontSize: "0.8125rem", color: "#0043ce", marginTop: "0.125rem" }}>Bekijk welke gemeente in de buurt het meest open staat voor woningbouw.</p>
                    </div>
                    <a href={`/vergelijker?lat=${resultaat.perceel.lat}&lon=${resultaat.perceel.lon}&gemeente=${encodeURIComponent(resultaat.perceel.gemeente ?? "")}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", fontSize: "0.875rem", fontWeight: 500, backgroundColor: "#0f62fe", color: "#ffffff", textDecoration: "none", flexShrink: 0 }}>
                      <Compare size={16} /> Naar gemeentevergelijker
                    </a>
                  </div>
                </div>
              )
            )}
            {actieveTab === "correspondentie" && (
              tabVergrendeld("correspondentie") ? <UpgradeWall tabLabel="Correspondentie" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <OpdrachtBrieven brieven={resultaat.opdrachtbrieven} />
                  {emailsLaden && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.25rem", backgroundColor: "#f4f4f4", fontSize: "0.875rem", color: "#525252" }}>
                      <InlineLoading status="active" />
                      E-mails worden gegenereerd…
                    </div>
                  )}
                  {emailFout && !emailsLaden && (
                    <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fff1f1", borderLeft: "3px solid #da1e28", fontSize: "0.875rem", color: "#a2191f", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <span>{emailFout}</span>
                      <button
                        onClick={() => { setEmailFout(null); setResultaat((prev) => prev ? { ...prev, emailTemplates: [] } : prev); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#0f62fe", fontSize: "0.8125rem", fontWeight: 600, padding: 0, flexShrink: 0 }}
                      >
                        Opnieuw proberen
                      </button>
                    </div>
                  )}
                  {resultaat.emailTemplates.length > 0 && (
                    <EmailTemplates templates={resultaat.emailTemplates} />
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
