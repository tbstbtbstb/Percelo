import { Suspense } from "react";
import { Tile } from "@carbon/react";
import { Compare } from "@carbon/icons-react";
import { VergelijkerInhoud } from "./VergelijkerInhoud";

export default function VergelijkerPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      {/* Hero */}
      <div style={{ borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)", backgroundColor: "var(--cds-layer-01, #f4f4f4)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "2rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginBottom: "0.5rem" }}>
            <Compare size={14} />
            <span>Gemeentevergelijker</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.25rem, 4vw, 1.5rem)", fontWeight: 600, color: "var(--cds-text-primary, #161616)" }}>
            Welke gemeente staat het meest open voor woningbouw?
          </h1>
          <p style={{ color: "var(--cds-text-secondary, #525252)", marginTop: "0.375rem", fontSize: "0.875rem", maxWidth: "42rem" }}>
            Vergelijk gemeenten op openheid, doorlooptijd en legeskosten. Klik op een rij voor details.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "2rem 1rem" }}>
        <Tile style={{ padding: "1.5rem" }}>
          <Suspense fallback={<p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)" }}>Laden...</p>}>
            <VergelijkerInhoud />
          </Suspense>
        </Tile>

        <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary, #525252)", marginTop: "1rem", lineHeight: 1.5 }}>
          Scores zijn indicatief op basis van beschikbare marktdata, gepubliceerde legesverordeningen en provinciale omgevingsvisies (2024–2025).
          Gemeentelijk beleid verandert — raadpleeg altijd de actuele omgevingsvisie en een RO-adviseur voor een locatiespecifieke beoordeling.
          Vergund 2024: bekende verleende omgevingsplanwijzigingen voor wonen; werkelijk aantal kan hoger liggen.
        </p>
      </div>
    </div>
  );
}
