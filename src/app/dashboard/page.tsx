"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button, Tile, Tag, InlineLoading } from "@carbon/react";
import { Add, Location, Time, TrashCan, Growth } from "@carbon/icons-react";
import type { AnalyseSamenvatting } from "@/app/api/analyses/route";

const SCORE_TAG: Record<string, { type: "green" | "teal" | "warm-gray" | "red"; label: string }> = {
  "ultra-hoog": { type: "green",     label: "Ultra Hoog" },
  "hoog":       { type: "teal",      label: "Hoog" },
  "gemiddeld":  { type: "warm-gray", label: "Gemiddeld" },
  "laag":       { type: "warm-gray", label: "Laag" },
  "ultra-laag": { type: "red",       label: "Ultra Laag" },
};

export default function DashboardPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [analyses, setAnalyses] = useState<AnalyseSamenvatting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/analyses")
      .then((r) => r.json())
      .then((data) => setAnalyses(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  async function verwijder(analyseId: string) {
    setAnalyses((prev) => prev.filter((a) => a.analyseId !== analyseId));
    await fetch("/api/analyses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analyseId }),
    });
  }

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }}>
        <Tile style={{ padding: "2rem", textAlign: "center", maxWidth: "24rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Inloggen vereist</p>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
            Log in om uw opgeslagen analyses te bekijken.
          </p>
          <Link href="/login">
            <Button>Inloggen</Button>
          </Link>
        </Tile>
      </div>
    );
  }

  const gemScore = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + a.totaalScore, 0) / analyses.length)
    : null;
  const hoogAantal = analyses.filter((a) => a.scoreKlasse === "hoog" || a.scoreKlasse === "ultra-hoog").length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      {/* Hero */}
      <div style={{ borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)", backgroundColor: "var(--cds-layer-01, #f4f4f4)" }}>
        <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "2rem 1rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Mijn percelen</h1>
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
              Welkom, {user.firstName ?? user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <Link href="/analyse">
            <Button renderIcon={Add} size="md">Nieuwe analyse</Button>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Stats */}
        <div className="percelo-stats-grid">
          {[
            { label: "Opgeslagen analyses", waarde: analyses.length, sub: "totaal" },
            { label: "Gemiddelde score", waarde: gemScore ?? "—", sub: gemScore ? (gemScore >= 65 ? "Hoog" : gemScore >= 45 ? "Gemiddeld" : "Laag") : "nog geen analyses" },
            { label: "Hoge kans percelen", waarde: hoogAantal, sub: hoogAantal > 0 ? "Actie aanbevolen" : "geen" },
          ].map(({ label, waarde, sub }) => (
            <Tile key={label} style={{ padding: "1rem" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>{label}</p>
              <p style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.25rem", lineHeight: 1 }}>{waarde}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>{sub}</p>
            </Tile>
          ))}
        </div>

        {/* Lijst */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <InlineLoading description="Analyses laden..." status="active" />
          </div>
        ) : analyses.length === 0 ? (
          <Tile style={{ padding: "3rem", textAlign: "center" }}>
            <Location size={32} style={{ color: "var(--cds-text-secondary)", margin: "0 auto 1rem" }} />
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Nog geen analyses opgeslagen</p>
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)", marginBottom: "1.5rem" }}>
              Analyseer een perceel om het hier te bewaren.
            </p>
            <Link href="/analyse">
              <Button renderIcon={Add}>Start eerste analyse</Button>
            </Link>
          </Tile>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {analyses.map((a) => {
              const tag = SCORE_TAG[a.scoreKlasse] ?? SCORE_TAG.gemiddeld;
              return (
                <Tile key={a.analyseId} style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", minWidth: 0 }}>
                      <div style={{ width: "2.25rem", height: "2.25rem", flexShrink: 0, backgroundColor: "var(--cds-layer-02, #e0e0e0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Location size={16} style={{ color: "var(--cds-text-secondary)" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.adres}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                          <Time size={12} />
                          {new Date(a.gegenereedOp).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1 }}>{a.totaalScore}</p>
                        <p style={{ fontSize: "0.6875rem", color: "var(--cds-text-secondary)" }}>score</p>
                      </div>
                      <Tag type={tag.type} size="sm">{tag.label}</Tag>
                      <Link href={`/analyse?id=${a.analyseId}`}>
                        <Button kind="ghost" size="sm">Bekijk</Button>
                      </Link>
                      <button
                        onClick={() => verwijder(a.analyseId)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cds-text-secondary)", padding: "0.25rem" }}
                        aria-label="Verwijder"
                      >
                        <TrashCan size={16} />
                      </button>
                    </div>
                  </div>
                </Tile>
              );
            })}
          </div>
        )}

        {/* Upgrade teaser */}
        <Tile style={{ padding: "1.25rem", backgroundColor: "#edf5ff", borderLeft: "4px solid #0f62fe" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Growth size={20} style={{ color: "#0f62fe", flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>Portefeuillebeheer & Monitoring</p>
                <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                  Ontvang alerts bij bestemmingsplanwijzigingen in uw interessegebied — beschikbaar in Business
                </p>
              </div>
            </div>
            <Link href="/pricing">
              <Button kind="secondary" size="sm">Upgrade</Button>
            </Link>
          </div>
        </Tile>
      </div>
    </div>
  );
}
