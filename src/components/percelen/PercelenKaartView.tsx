"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Select, SelectItem } from "@carbon/react";
import { ArrowRight, ChevronLeft, ChevronRight, Filter } from "@carbon/icons-react";
import type { KansrijkPerceel } from "@/types";
import PERCELEN_DATA from "@/lib/percelenData.json";
import { EigenaarKaart } from "./EigenaarKaart";

const ALLE_PERCELEN = PERCELEN_DATA as KansrijkPerceel[];

const KaartMetPins = dynamic(() => import("./KaartMetPins"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1a1a2e", color: "#ffffff", fontSize: "0.875rem" }}>
      Kaart laden…
    </div>
  ),
});

const IS_TRANSFORMABEL_RE = /^agrarisch|^natuur|^recreatie|^landelijk/i;
const DRAWER_WIDTH = 440;
const DRAWER_MARGIN = 20; // 1.25rem — ruimte tussen kaartrand en panel

function eur(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function ScoreBadge({ score }: { score: number }) {
  const kleur = score >= 70 ? "#24a148" : score >= 50 ? "#b28600" : "#da1e28";
  const bg = score >= 70 ? "#defbe6" : score >= 50 ? "#fdf6dd" : "#fff1f1";
  return (
    <span style={{
      display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "2px",
      fontSize: "0.75rem", fontWeight: 700, color: kleur, backgroundColor: bg,
      flexShrink: 0,
    }}>
      {score}%
    </span>
  );
}

export function PercelenKaartView() {
  const [geselecteerdId, setGeselecteerdId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterProvincie, setFilterProvincie] = useState("");
  const [filterMinSlagingskans, setFilterMinSlagingskans] = useState(0);
  const [filterMinMarge, setFilterMinMarge] = useState(0);
  const [openEigenaarId, setOpenEigenaarId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const drawerInnerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [tabStyle, setTabStyle] = useState<{ top: number; height: number } | null>(null);

  const provincies = useMemo(
    () => [...new Set(ALLE_PERCELEN.map((p) => p.provincie))].sort(),
    []
  );

  const gefilterd = useMemo(() =>
    ALLE_PERCELEN
      .filter((p) =>
        IS_TRANSFORMABEL_RE.test(p.bestemming) &&
        !p.reedsBouwgrond &&
        (!filterProvincie || p.provincie === filterProvincie) &&
        p.slagingskans >= filterMinSlagingskans &&
        p.margeMin >= filterMinMarge * 1000
      )
      .sort((a, b) => b.slagingskans - a.slagingskans),
    [filterProvincie, filterMinSlagingskans, filterMinMarge]
  );

  const handleSelectPin = useCallback((id: string) => {
    setGeselecteerdId(id);
    setDrawerOpen(true);
    setTimeout(() => {
      const card = cardRefs.current.get(id);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }, []);

  useEffect(() => {
    if (!geselecteerdId) { setTabStyle(null); return; }
    const card = cardRefs.current.get(geselecteerdId);
    const drawer = drawerInnerRef.current;
    if (!card || !drawer) { setTabStyle(null); return; }
    const cardRect = card.getBoundingClientRect();
    const drawerRect = drawer.getBoundingClientRect();
    setTabStyle({ top: cardRect.top - drawerRect.top, height: cardRect.height });
  }, [geselecteerdId, gefilterd]);

  function handleSelectCard(p: KansrijkPerceel) {
    setGeselecteerdId(p.id);
    setOpenEigenaarId(null);
  }

  return (
    <div className="percelo-kaart-view">

      {/* Linkse drawer */}
      <div
        className={`percelo-kaart-drawer${drawerOpen ? "" : " percelo-kaart-drawer--gesloten"}`}
      >
        <div ref={drawerInnerRef} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>

          {/* Uitsteek-tab voor geselecteerde kaart */}
          {tabStyle && (
            <div style={{
              position: "absolute",
              top: tabStyle.top,
              right: -14,
              width: 14,
              height: tabStyle.height,
              backgroundColor: "#edf5ff",
              borderRadius: "0 6px 6px 0",
              boxShadow: "6px 0 18px rgba(15,98,254,0.2), 2px 0 4px rgba(0,0,0,0.06)",
              pointerEvents: "none",
              zIndex: 1,
              transition: "top 0.15s ease, height 0.15s ease",
            }} />
          )}

          {/* Drawer header */}
          <div style={{
            padding: "0.875rem 1rem",
            borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
            backgroundColor: "var(--cds-layer-01, #f4f4f4)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#161616" }}>
                  Kansrijke percelen
                </div>
                <div style={{ fontSize: "0.75rem", color: "#525252", marginTop: "0.125rem" }}>
                  {gefilterd.length} gevonden · demo
                </div>
              </div>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.3rem",
                  background: filterOpen ? "#e8e8e8" : "none",
                  border: "1px solid #e0e0e0", borderRadius: "4px",
                  cursor: "pointer", padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem", color: "#525252", flexShrink: 0,
                }}
              >
                <Filter size={14} />
                Filter
              </button>
            </div>

            {filterOpen && (
              <div style={{ marginTop: "0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <Select
                  id="filter-provincie-kaart"
                  labelText="Provincie"
                  size="lg"
                  value={filterProvincie}
                  onChange={(e) => setFilterProvincie(e.target.value)}
                >
                  <SelectItem value="" text="Alle provincies" />
                  {provincies.map((p) => <SelectItem key={p} value={p} text={p} />)}
                </Select>
                <div>
                  <label htmlFor="filter-slagingskans-kaart" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#525252", marginBottom: "0.25rem" }}>
                    Min. slagingskans (%)
                  </label>
                  <input
                    id="filter-slagingskans-kaart"
                    type="number"
                    min={0} max={100}
                    value={filterMinSlagingskans}
                    onChange={(e) => setFilterMinSlagingskans(Number(e.target.value) || 0)}
                    style={{
                      width: "100%", height: "3rem", padding: "0 0.75rem",
                      fontSize: "0.875rem", color: "#161616",
                      backgroundColor: "#ffffff", borderRadius: "4px",
                      outline: "1px solid #e0e0e0", border: "none",
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="filter-marge-kaart" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#525252", marginBottom: "0.25rem" }}>
                    Min. marge (×€1.000)
                  </label>
                  <input
                    id="filter-marge-kaart"
                    type="number"
                    min={0}
                    value={filterMinMarge}
                    onChange={(e) => setFilterMinMarge(Number(e.target.value) || 0)}
                    style={{
                      width: "100%", height: "3rem", padding: "0 0.75rem",
                      fontSize: "0.875rem", color: "#161616",
                      backgroundColor: "#ffffff", borderRadius: "4px",
                      outline: "1px solid #e0e0e0", border: "none",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Perceel-kaartjes (scrollbaar) */}
          <div ref={listRef} style={{ flex: 1, overflowY: "auto" }}>
            {gefilterd.map((p) => (
              <div key={p.id}>
                <div
                  ref={(el) => { if (el) cardRefs.current.set(p.id, el); }}
                  onClick={() => handleSelectCard(p)}
                  style={{
                    padding: "0.875rem 1rem",
                    borderBottom: "1px solid #e0e0e0",
                    backgroundColor: geselecteerdId === p.id ? "#edf5ff" : "#ffffff",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (geselecteerdId !== p.id)
                      (e.currentTarget as HTMLElement).style.backgroundColor = "#f4f4f4";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      geselecteerdId === p.id ? "#edf5ff" : "#ffffff";
                  }}
                >
                  {/* Regel 1: gemeente + badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616", lineHeight: 1.3 }}>
                      {p.gemeente}
                    </div>
                    <ScoreBadge score={p.slagingskans} />
                  </div>

                  {/* Regel 2: provincie + oppervlakte */}
                  <div style={{ fontSize: "0.75rem", color: "#525252", marginBottom: "0.125rem" }}>
                    {p.provincie} · {p.oppervlakteM2 >= 10000
                      ? `${(p.oppervlakteM2 / 10000).toFixed(1)} ha`
                      : `${p.oppervlakteM2.toLocaleString("nl-NL")} m²`}
                  </div>

                  {/* Regel 3: perceelnummer */}
                  <div style={{ fontSize: "0.6875rem", color: "#8d8d8d", marginBottom: "0.625rem" }}>
                    {p.perceelId}
                  </div>

                  {/* Financiële samenvatting */}
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", marginBottom: "0.625rem" }}>
                    <div>
                      <div style={{ color: "#525252" }}>Aankoop</div>
                      <div style={{ fontWeight: 600, color: "#161616" }}>{eur(p.geschatteAankoopprijs)}</div>
                    </div>
                    <div>
                      <div style={{ color: "#525252" }}>Max. marge</div>
                      <div style={{ fontWeight: 600, color: "#24a148" }}>{eur(p.margeMax)}</div>
                    </div>
                    <div>
                      <div style={{ color: "#525252" }}>ROI</div>
                      {(() => { const roi = Math.round(p.margeMax / p.geschatteAankoopprijs * 100); return <div style={{ fontWeight: 600, color: roi >= 200 ? "#24a148" : "#b28600" }}>{roi}%</div>; })()}
                    </div>
                  </div>

                  {/* Actieknoppen */}
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenEigenaarId(openEigenaarId === p.id ? null : p.id);
                      }}
                      style={{
                        padding: "0.3rem 1rem", fontSize: "0.75rem",
                        backgroundColor: "#f4f4f4", color: "#161616",
                        border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer",
                      }}
                    >
                      Eigenaar
                    </button>
                    <a
                      href={`/analyse?lat=${p.lat}&lon=${p.lon}&adres=${encodeURIComponent(p.perceelId + ", " + p.gemeente)}&gemeente=${encodeURIComponent(p.gemeente)}&provincie=${encodeURIComponent(p.provincie)}&bestemming=${encodeURIComponent(p.bestemming)}&oppervlakte=${p.oppervlakteM2}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Analyseer"
                      style={{
                        width: "2rem", height: "2rem", flexShrink: 0,
                        backgroundColor: "#0f62fe", color: "#ffffff",
                        border: "none", borderRadius: "4px", cursor: "pointer",
                        textDecoration: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </div>

                {openEigenaarId === p.id && (
                  <div style={{ borderBottom: "1px solid #e0e0e0" }}>
                    <EigenaarKaart perceel={p} onSluiten={() => setOpenEigenaarId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle-knop */}
      <button
        onClick={() => setDrawerOpen((o) => !o)}
        className="percelo-kaart-toggle"
        style={{ left: drawerOpen ? `${DRAWER_WIDTH + DRAWER_MARGIN}px` : `${DRAWER_MARGIN}px` } as React.CSSProperties}
        aria-label={drawerOpen ? "Lijst verbergen" : "Lijst tonen"}
      >
        {drawerOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Kaart — altijd fullscreen, panel zweeft eroverheen */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
        <KaartMetPins
          percelen={gefilterd}
          geselecteerdId={geselecteerdId}
          onSelect={handleSelectPin}
        />
      </div>
    </div>
  );
}
