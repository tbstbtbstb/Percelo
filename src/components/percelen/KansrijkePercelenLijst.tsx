"use client";

import { useState, useEffect, useMemo } from "react";
import { Tag, Select, SelectItem, NumberInput } from "@carbon/react";
import { ArrowUp, ArrowDown, ArrowsVertical, Locked } from "@carbon/icons-react";
import type { KansrijkPerceel } from "@/types";
import { MOCK_PERCELEN } from "@/lib/percelenMockData";
import { EigenaarKaart } from "./EigenaarKaart";

const VRIJE_RIJEN = 5;
const PRO_RIJEN = 20;

const IS_AGRARISCH_RE = /agrarisch|landbouw|akkerbouw|tuinbouw|glastuinbouw|veeteelt|weidegrond|polder|buitengebied/i;

type SortKey = keyof Pick<KansrijkPerceel,
  "gemeente" | "oppervlakteM2" | "slagingskans" | "geschatteAankoopprijs" |
  "bouwgrondWaardeMax" | "margeMax" | "roiPct"
>;

function eur(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function ScoreBadge({ score }: { score: number }) {
  const kleur = score >= 70 ? "#24a148" : score >= 50 ? "#b28600" : "#da1e28";
  const bg    = score >= 70 ? "#defbe6" : score >= 50 ? "#fdf6dd" : "#fff1f1";
  return (
    <span style={{
      display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "2px",
      fontSize: "0.8125rem", fontWeight: 700, color: kleur, backgroundColor: bg,
    }}>
      {score}
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: "asc" | "desc" }) {
  if (col !== sortKey) return <ArrowsVertical size={12} style={{ opacity: 0.4, verticalAlign: "middle", marginLeft: "0.25rem" }} />;
  return sortDir === "asc"
    ? <ArrowUp size={12} style={{ verticalAlign: "middle", marginLeft: "0.25rem" }} />
    : <ArrowDown size={12} style={{ verticalAlign: "middle", marginLeft: "0.25rem" }} />;
}

export function KansrijkePercelenLijst() {
  // TODO: freemium gate — zet terug op false + URL-param logica bij launch
  const [isPro] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("slagingskans");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterProvincie, setFilterProvincie] = useState("");
  const [filterMinSlagingskans, setFilterMinSlagingskans] = useState(0);
  const [filterMinMarge, setFilterMinMarge] = useState(0);
  const [openEigenaarId, setOpenEigenaarId] = useState<string | null>(null);

  const provincies = useMemo(
    () => [...new Set(MOCK_PERCELEN.map((p) => p.provincie))].sort(),
    []
  );

  const gesorteerd = useMemo(() => {
    const gefilterd = MOCK_PERCELEN.filter((p) =>
      IS_AGRARISCH_RE.test(p.bestemming) &&
      (!filterProvincie || p.provincie === filterProvincie) &&
      p.slagingskans >= filterMinSlagingskans &&
      p.margeMin >= filterMinMarge * 1000
    );
    return [...gefilterd].sort((a, b) => {
      const va = a[sortKey] as number | string;
      const vb = b[sortKey] as number | string;
      const mul = sortDir === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
  }, [sortKey, sortDir, filterProvincie, filterMinSlagingskans, filterMinMarge]);

  const zichtbaarMax = isPro ? PRO_RIJEN : VRIJE_RIJEN;
  const zichtbaar = gesorteerd.slice(0, zichtbaarMax);
  const vergrendeld = gesorteerd.slice(zichtbaarMax);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const thStyle: React.CSSProperties = {
    padding: "0.625rem 0.75rem", fontSize: "0.75rem", fontWeight: 600,
    color: "var(--cds-text-secondary, #525252)", textAlign: "left",
    borderBottom: "2px solid var(--cds-border-subtle-00, #e0e0e0)",
    whiteSpace: "nowrap", userSelect: "none", cursor: "pointer",
    backgroundColor: "var(--cds-layer-01, #f4f4f4)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.625rem 0.75rem", fontSize: "0.8125rem",
    borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
    whiteSpace: "nowrap", verticalAlign: "middle",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Filters */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end",
        padding: "1rem 1.25rem", backgroundColor: "var(--cds-layer-01, #f4f4f4)",
        borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
      }}>
        <div style={{ minWidth: "10rem" }}>
          <Select
            id="filter-provincie"
            labelText="Provincie"
            size="sm"
            value={filterProvincie}
            onChange={(e) => setFilterProvincie(e.target.value)}
          >
            <SelectItem value="" text="Alle provincies" />
            {provincies.map((p) => <SelectItem key={p} value={p} text={p} />)}
          </Select>
        </div>
        <div style={{ minWidth: "9rem" }}>
          <NumberInput
            id="filter-slagingskans"
            label="Min. slagingskans (%)"
            size="sm"
            min={0} max={100} step={5}
            value={filterMinSlagingskans}
            onChange={(_e, { value }) => setFilterMinSlagingskans(Number(value) || 0)}
            hideSteppers={false}
          />
        </div>
        <div style={{ minWidth: "9rem" }}>
          <NumberInput
            id="filter-marge"
            label="Min. marge (×€1.000)"
            size="sm"
            min={0} step={50}
            value={filterMinMarge}
            onChange={(_e, { value }) => setFilterMinMarge(Number(value) || 0)}
            hideSteppers={false}
          />
        </div>
        <div style={{ fontSize: "0.8125rem", color: "#525252", paddingBottom: "0.5rem" }}>
          {gesorteerd.length} percelen gevonden
        </div>
      </div>

      {/* Tabel */}
      <div className="percelo-table-wrapper">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "56rem" }}>
          <thead>
            <tr>
              {(
                [
                  ["gemeente",             "Gemeente"],
                  ["oppervlakteM2",        "Oppervlakte"],
                  ["slagingskans",         "Slagingskans"],
                  ["geschatteAankoopprijs","Aankooprijs"],
                  ["bouwgrondWaardeMax",   "Waarde na wijziging"],
                  ["margeMax",             "Verwachte marge"],
                  ["roiPct",               "ROI%"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th key={key} style={thStyle} onClick={() => toggleSort(key)}>
                  {label}
                  <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th style={{ ...thStyle, cursor: "default" }}>Eigenaar</th>
              <th style={{ ...thStyle, cursor: "default" }}></th>
            </tr>
          </thead>
          <tbody>
            {zichtbaar.map((p) => (
              <>
                <tr
                  key={p.id}
                  style={{ backgroundColor: openEigenaarId === p.id ? "#edf5ff" : "#ffffff" }}
                  onMouseEnter={(e) => { if (openEigenaarId !== p.id) (e.currentTarget as HTMLElement).style.backgroundColor = "#f4f4f4"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = openEigenaarId === p.id ? "#edf5ff" : "#ffffff"; }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.gemeente}</div>
                    {p.straatAdres && (
                      <div style={{ fontSize: "0.8125rem", color: "#161616" }}>{p.straatAdres}</div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "#525252" }}>{p.perceelId}</div>
                    <div style={{ marginTop: "0.2rem" }}>
                      <Tag type="gray" size="sm" style={{ fontSize: "0.7rem" }}>{p.provincie}</Tag>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {p.oppervlakteM2 >= 10000
                      ? `${(p.oppervlakteM2 / 10000).toFixed(1)} ha`
                      : `${p.oppervlakteM2.toLocaleString("nl-NL")} m²`}
                  </td>
                  <td style={tdStyle}><ScoreBadge score={p.slagingskans} /></td>
                  <td style={tdStyle}>{eur(p.geschatteAankoopprijs)}</td>
                  <td style={tdStyle}>
                    <span style={{ color: "#525252" }}>{eur(p.bouwgrondWaardeMin)}–</span>
                    <span style={{ fontWeight: 600 }}>{eur(p.bouwgrondWaardeMax)}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: p.margeMin > 0 ? "#24a148" : "#da1e28" }}>
                      {eur(p.margeMin)}–{eur(p.margeMax)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: Math.round(p.margeMax / p.geschatteAankoopprijs * 100) >= 200 ? "#24a148" : Math.round(p.margeMax / p.geschatteAankoopprijs * 100) >= 100 ? "#b28600" : "#525252" }}>
                      {Math.round(p.margeMax / p.geschatteAankoopprijs * 100)}%
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setOpenEigenaarId(openEigenaarId === p.id ? null : p.id)}
                      style={{
                        fontSize: "0.8125rem", padding: "0.3rem 0.625rem",
                        backgroundColor: openEigenaarId === p.id ? "#0353e9" : "#0f62fe",
                        color: "#ffffff", border: "none", cursor: "pointer",
                      }}
                    >
                      {openEigenaarId === p.id ? "Sluiten" : "Ophalen"}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <a
                      href={`/analyse?lat=${p.lat}&lon=${p.lon}&adres=${encodeURIComponent(p.perceelId + ", " + p.gemeente)}&gemeente=${encodeURIComponent(p.gemeente ?? "")}&provincie=${encodeURIComponent(p.provincie ?? "")}&bestemming=${encodeURIComponent(p.bestemming)}&oppervlakte=${p.oppervlakteM2}`}
                      style={{
                        fontSize: "0.8125rem", padding: "0.3rem 0.625rem",
                        backgroundColor: "transparent", color: "#0f62fe",
                        border: "1px solid #0f62fe", cursor: "pointer",
                        textDecoration: "none", whiteSpace: "nowrap", display: "inline-block",
                      }}
                    >
                      Analyseer →
                    </a>
                  </td>
                </tr>
                {openEigenaarId === p.id && (
                  <tr key={`${p.id}-eigenaar`}>
                    <td colSpan={8} style={{ padding: 0, backgroundColor: "#edf5ff" }}>
                      <EigenaarKaart perceel={p} onSluiten={() => setOpenEigenaarId(null)} />
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* Vergrendelde rijen */}
            {vergrendeld.length > 0 && (
              <>
                {vergrendeld.slice(0, 3).map((p) => (
                  <tr key={`blur-${p.id}`} style={{ opacity: 0.25, pointerEvents: "none", filter: "blur(3px)" }}>
                    <td style={tdStyle}>{p.gemeente}</td>
                    <td style={tdStyle}>{p.oppervlakteM2.toLocaleString("nl-NL")} m²</td>
                    <td style={tdStyle}><ScoreBadge score={p.slagingskans} /></td>
                    <td style={tdStyle}>{eur(p.geschatteAankoopprijs)}</td>
                    <td style={tdStyle}>{eur(p.bouwgrondWaardeMax)}</td>
                    <td style={tdStyle}>{eur(p.margeMax)}</td>
                    <td style={tdStyle}>{p.roiPct}%</td>
                    <td style={tdStyle}>—</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      textAlign: "center", padding: "2rem 1.5rem", gap: "0.75rem",
                      backgroundColor: "#f4f4f4", borderTop: "1px solid #e0e0e0",
                    }}>
                      <Locked size={24} style={{ color: "#525252" }} />
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                          {vergrendeld.length} percelen verborgen
                        </p>
                        <p style={{ fontSize: "0.875rem", color: "#525252", marginTop: "0.25rem" }}>
                          {isPro
                            ? "Volledige lijst beschikbaar in de Business-tier."
                            : `Top ${PRO_RIJEN} beschikbaar in Pro — volledige lijst in Business.`}
                        </p>
                      </div>
                      <button
                        disabled
                        style={{
                          padding: "0.5rem 1.5rem", fontSize: "0.875rem",
                          backgroundColor: "#0f62fe", color: "#ffffff",
                          border: "none", cursor: "not-allowed", opacity: 0.5,
                        }}
                      >
                        Upgraden — binnenkort beschikbaar
                      </button>
                      {!isPro && (
                        <p style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                          Testen? Voeg <code style={{ backgroundColor: "#e8e8e8", padding: "0 0.25rem" }}>?pro=1</code> toe aan de URL.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
