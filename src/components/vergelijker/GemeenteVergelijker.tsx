"use client";

import { useState, useMemo } from "react";
import { Tag } from "@carbon/react";
import { ArrowUp, ArrowDown, Filter, Search, Location, ChevronDown, ChevronUp, MapBoundary } from "@carbon/icons-react";
import { GEMEENTEN, PROVINCIES } from "@/lib/gemeentedata";
import type { GemeenteProfiel } from "@/lib/gemeentedata";

interface Props {
  perceelLat?: number;
  perceelLon?: number;
  perceelGemeente?: string;
}

function eur(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ScoreBalk({ score, kleur }: { score: number; kleur: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ flex: 1, height: "6px", backgroundColor: "var(--cds-layer-02, #e0e0e0)", borderRadius: "3px", overflow: "hidden", minWidth: "3rem" }}>
        <div style={{ height: "100%", width: `${score}%`, backgroundColor: kleur, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: kleur, flexShrink: 0, minWidth: "2rem", textAlign: "right" }}>
        {score}
      </span>
    </div>
  );
}

function openheidsKleur(score: number): string {
  if (score >= 75) return "#24a148";
  if (score >= 60) return "#b28600";
  return "#da1e28";
}

function openheidsTag(score: number): { type: "green" | "warm-gray" | "red"; label: string } {
  if (score >= 75) return { type: "green", label: "Gunstig" };
  if (score >= 60) return { type: "warm-gray", label: "Gemiddeld" };
  return { type: "red", label: "Lastig" };
}

function doorlooptijdLabel(min: number, max: number): string {
  if (min < 12 && max <= 18) return `${min}–${max} mnd`;
  if (max <= 24) return `${min}–${max} mnd`;
  const minJ = (min / 12).toFixed(0);
  const maxJ = (max / 12).toFixed(max % 12 === 0 ? 0 : 1);
  return `${minJ}–${maxJ} jr`;
}

function doorlooptijdKleur(min: number): string {
  if (min <= 10) return "#24a148";
  if (min <= 18) return "#b28600";
  return "#da1e28";
}

type SortKey = "openheidsScore" | "woningdrukScore" | "provinciaalBeleidScore" | "legesTotaalMin" | "doorlooptijdMaandenMin" | "verleendIn2024";

function DetailDrawer({ g }: { g: GemeenteProfiel }) {
  return (
    <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "#f4f4f4", borderTop: "1px solid var(--cds-border-subtle-00, #e0e0e0)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
        {/* Omgevingsvisie */}
        <div style={{ flex: "2 1 18rem", minWidth: 0 }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
            Omgevingsvisie
          </p>
          <p style={{ fontSize: "0.8125rem", lineHeight: 1.6, color: "var(--cds-text-primary, #161616)" }}>
            {g.omgevingsvisieSamenvatting}
          </p>
        </div>

        {/* Beleidsroutes */}
        <div style={{ flex: "1 1 12rem" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
            Beschikbare routes
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
            {g.beleidsroutes.map((r) => (
              <Tag key={r} type="blue" size="sm">{r}</Tag>
            ))}
          </div>
        </div>

        {/* Kerncijfers */}
        <div style={{ flex: "1 1 10rem" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
            Kerncijfers
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.8125rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ color: "var(--cds-text-secondary, #525252)" }}>Vergund 2024</span>
              <span style={{ fontWeight: 600 }}>{g.verleendIn2024} aanvragen</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ color: "var(--cds-text-secondary, #525252)" }}>Doorlooptijd</span>
              <span style={{ fontWeight: 600 }}>{doorlooptijdLabel(g.doorlooptijdMaandenMin, g.doorlooptijdMaandenMax)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ color: "var(--cds-text-secondary, #525252)" }}>Leges indicatief</span>
              <span style={{ fontWeight: 600 }}>{eur(g.legesTotaalMin)}–{eur(g.legesTotaalMax)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GemeenteVergelijker({ perceelLat, perceelLon, perceelGemeente }: Props) {
  const [provincie, setProvincie] = useState<string>("alle");
  const [zoekterm, setZoekterm] = useState("");
  const [nabijActief, setNabijActief] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("openheidsScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [openRij, setOpenRij] = useState<string | null>(null);

  const heeftPerceel = perceelLat !== undefined && perceelLon !== undefined;

  const gefilterd = useMemo(() => {
    let lijst = GEMEENTEN;

    if (provincie !== "alle") lijst = lijst.filter((g) => g.provincie === provincie);
    if (zoekterm.trim()) lijst = lijst.filter((g) => g.naam.toLowerCase().includes(zoekterm.toLowerCase().trim()));
    if (nabijActief && heeftPerceel) {
      lijst = lijst.filter((g) => haversineKm(perceelLat!, perceelLon!, g.lat, g.lon) <= 30);
    }

    return [...lijst].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortAsc ? diff : -diff;
    });
  }, [provincie, zoekterm, nabijActief, heeftPerceel, perceelLat, perceelLon, sortKey, sortAsc]);

  function sorteer(key: SortKey, defaultAsc = false) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(defaultAsc); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortAsc
      ? <ArrowUp size={12} style={{ marginLeft: "0.25rem" }} />
      : <ArrowDown size={12} style={{ marginLeft: "0.25rem" }} />;
  }

  const kolomStijl = (k: SortKey): React.CSSProperties => ({
    padding: "0.625rem 1rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: sortKey === k ? "var(--cds-interactive, #0f62fe)" : "var(--cds-text-secondary, #525252)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "2px solid var(--cds-border-subtle-00, #e0e0e0)",
    backgroundColor: "var(--cds-layer-02, #e0e0e0)",
    textAlign: "left",
    verticalAlign: "bottom",
  });

  const kolomInner = (label: string, k: SortKey) => (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {label}<SortIcon k={k} />
    </span>
  );

  return (
    <div>
      {/* Zoekbalk + filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "1.25rem" }}>

        {/* Zoekbalk */}
        <div style={{ position: "relative", maxWidth: "22rem" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--cds-text-secondary, #525252)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Zoek gemeente..."
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            style={{
              width: "100%", paddingLeft: "2.25rem", paddingRight: "0.75rem",
              height: "2.25rem", fontSize: "0.875rem",
              border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
              backgroundColor: "#ffffff",
              color: "var(--cds-text-primary, #161616)",
              outline: "none",
            }}
          />
        </div>

        {/* Provincie + nabij-filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Filter size={16} style={{ color: "var(--cds-text-secondary, #525252)", flexShrink: 0 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            <button
              onClick={() => setProvincie("alle")}
              style={{
                padding: "0.25rem 0.75rem", fontSize: "0.8125rem", cursor: "pointer",
                border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
                backgroundColor: provincie === "alle" ? "var(--cds-interactive, #0f62fe)" : "transparent",
                color: provincie === "alle" ? "#fff" : "var(--cds-text-primary, #161616)",
              }}
            >
              Alle provincies
            </button>
            {PROVINCIES.map((p) => (
              <button
                key={p}
                onClick={() => setProvincie(p)}
                style={{
                  padding: "0.25rem 0.75rem", fontSize: "0.8125rem", cursor: "pointer",
                  border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
                  backgroundColor: provincie === p ? "var(--cds-interactive, #0f62fe)" : "transparent",
                  color: provincie === p ? "#fff" : "var(--cds-text-primary, #161616)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Nabij perceel filter — alleen tonen als perceel beschikbaar is */}
        {heeftPerceel && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <MapBoundary size={16} style={{ color: "var(--cds-text-secondary, #525252)", flexShrink: 0 }} />
            <button
              onClick={() => setNabijActief((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                padding: "0.25rem 0.875rem", fontSize: "0.8125rem", cursor: "pointer",
                border: "1px solid var(--cds-border-strong-01, #8d8d8d)",
                backgroundColor: nabijActief ? "#defbe6" : "transparent",
                color: nabijActief ? "#044317" : "var(--cds-text-primary, #161616)",
              }}
            >
              <Location size={14} />
              Gemeenten binnen 30 km van uw perceel
              {perceelGemeente && <span style={{ opacity: 0.7 }}>({perceelGemeente})</span>}
            </button>
          </div>
        )}
      </div>

      {/* Resultaatteller */}
      <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.625rem" }}>
        {gefilterd.length} gemeente{gefilterd.length !== 1 ? "n" : ""} — klik op een rij voor details
      </p>

      {/* Tabel */}
      <div className="percelo-table-wrapper">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...kolomStijl("openheidsScore"), cursor: "default", width: "2rem" }}>#</th>
              <th style={{ ...kolomStijl("openheidsScore"), cursor: "default", minWidth: "10rem" }}>Gemeente</th>
              <th style={kolomStijl("openheidsScore")} onClick={() => sorteer("openheidsScore")}>
                {kolomInner("Openheid", "openheidsScore")}
              </th>
              <th style={kolomStijl("woningdrukScore")} onClick={() => sorteer("woningdrukScore")}>
                {kolomInner("Woningdruk", "woningdrukScore")}
              </th>
              <th style={kolomStijl("provinciaalBeleidScore")} onClick={() => sorteer("provinciaalBeleidScore")}>
                {kolomInner("Prov. beleid", "provinciaalBeleidScore")}
              </th>
              <th style={kolomStijl("doorlooptijdMaandenMin")} onClick={() => sorteer("doorlooptijdMaandenMin", true)}>
                {kolomInner("Doorlooptijd", "doorlooptijdMaandenMin")}
              </th>
              <th style={kolomStijl("verleendIn2024")} onClick={() => sorteer("verleendIn2024")}>
                {kolomInner("Vergund 2024", "verleendIn2024")}
              </th>
              <th style={{ ...kolomStijl("legesTotaalMin"), cursor: "default" }}>
                Leges indicatief
              </th>
              <th style={{ ...kolomStijl("openheidsScore"), cursor: "default", width: "2rem" }} />
            </tr>
          </thead>
          <tbody>
            {gefilterd.map((g, i) => {
              const tag = openheidsTag(g.openheidsScore);
              const kleur = openheidsKleur(g.openheidsScore);
              const isOpen = openRij === g.naam;
              const isNabij = heeftPerceel && haversineKm(perceelLat!, perceelLon!, g.lat, g.lon) <= 30;

              return (
                <>
                  <tr
                    key={g.naam}
                    onClick={() => setOpenRij(isOpen ? null : g.naam)}
                    style={{
                      borderBottom: isOpen ? "none" : "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                      backgroundColor: isOpen ? "#edf5ff" : i % 2 === 0 ? "#ffffff" : "var(--cds-layer-01, #f4f4f4)",
                      cursor: "pointer",
                      borderLeft: isOpen ? "3px solid #0f62fe" : "3px solid transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", width: "2rem" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", minWidth: "10rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{g.naam}</p>
                        {isNabij && nabijActief && (
                          <Tag type="teal" size="sm" style={{ flexShrink: 0 }}>Nabij</Tag>
                        )}
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>{g.provincie}</p>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", minWidth: "10rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        <Tag type={tag.type} size="sm">{tag.label}</Tag>
                        <ScoreBalk score={g.openheidsScore} kleur={kleur} />
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", minWidth: "9rem" }}>
                      <ScoreBalk score={g.woningdrukScore} kleur="#0f62fe" />
                    </td>
                    <td style={{ padding: "0.75rem 1rem", minWidth: "9rem" }}>
                      <ScoreBalk score={g.provinciaalBeleidScore} kleur="#8a3ffc" />
                    </td>
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", fontSize: "0.875rem" }}>
                      <span style={{ fontWeight: 600, color: doorlooptijdKleur(g.doorlooptijdMaandenMin) }}>
                        {doorlooptijdLabel(g.doorlooptijdMaandenMin, g.doorlooptijdMaandenMax)}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <span style={{
                          fontSize: "0.875rem", fontWeight: 700,
                          color: g.verleendIn2024 >= 7 ? "#24a148" : g.verleendIn2024 >= 4 ? "#b28600" : "#525252",
                        }}>
                          {g.verleendIn2024}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>vergund</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", fontSize: "0.875rem" }}>
                      {eur(g.legesTotaalMin)} – {eur(g.legesTotaalMax)}
                    </td>
                    <td style={{ padding: "0.75rem 0.875rem", textAlign: "center", color: "var(--cds-interactive, #0f62fe)" }}>
                      {isOpen
                        ? <ChevronUp size={16} />
                        : <ChevronDown size={16} />
                      }
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`${g.naam}-detail`} style={{ borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)", borderLeft: "3px solid #0f62fe" }}>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <DetailDrawer g={g} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}

            {gefilterd.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--cds-text-secondary, #525252)", fontSize: "0.875rem" }}>
                  Geen gemeenten gevonden voor deze filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "1.5rem", fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)" }}>
        <span><strong style={{ color: "#0f62fe" }}>Woningdruk:</strong> hoe groot de behoefte aan woningen, hoe groter de motivatie voor medewerking</span>
        <span><strong style={{ color: "#8a3ffc" }}>Prov. beleid:</strong> hoe soepeler het provinciale ruimtelijk beleid, hoe minder beperkingen</span>
        <span><strong>Openheid:</strong> gewogen score (60% woningdruk + 40% provinciaal beleid)</span>
        <span><strong>Doorlooptijd:</strong> indicatieve verwerkingstijd van aanvraag tot besluit</span>
        <span><strong>Vergund 2024:</strong> bekende verleende omgevingsplanwijzigingen voor wonen in 2024</span>
      </div>
    </div>
  );
}
