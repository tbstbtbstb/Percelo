"use client";

import { useState } from "react";
import { Flag, Warning, Help, Information, CircleDash, Checkmark, Close, Undo, ChevronDown, ChevronUp } from "@carbon/icons-react";
import type { AdviesKaartData, AdviesLabel } from "@/types";
import { Uitleg } from "@/components/ui/Uitleg";

const ADVIES_CONFIG: Record<AdviesLabel, {
  label: string;
  kleur: string;
  bg: string;
  accentKleur: string;
  Icon: typeof Flag;
}> = {
  "go":      { label: "Kansrijk",     kleur: "#0e6027", bg: "#f0fdf4", accentKleur: "#24a148", Icon: Flag },
  "twijfel": { label: "Twijfelgeval", kleur: "#7d4300", bg: "#fffbeb", accentKleur: "#f1c21b", Icon: Help },
  "no-go":   { label: "Ongunstig",    kleur: "#750e13", bg: "#fff5f5", accentKleur: "#da1e28", Icon: Warning },
};

const PRECEDENT_CONFIG = {
  vergund:     { label: "Vergund",     kleur: "#15803d", bg: "#f0fdf4", borderKleur: "#bbf7d0", Icon: Checkmark },
  afgewezen:   { label: "Afgewezen",   kleur: "#b91c1c", bg: "#fff5f5", borderKleur: "#fecaca", Icon: Close },
  ingetrokken: { label: "Ingetrokken", kleur: "#525252", bg: "#f4f4f4", borderKleur: "#e0e0e0", Icon: Undo },
};

const IMPACT_CONFIG = {
  hoog:      { kleur: "#da1e28", label: "Hoog" },
  gemiddeld: { kleur: "#b28600", label: "Gemiddeld" },
  laag:      { kleur: "#525252", label: "Laag" },
};

const ADVIES_UITLEG: Record<AdviesLabel, string> = {
  "go":
    "Een kansrijke score betekent dat de locatie en het gemeentelijk beleid in uw voordeel wijzen. Dat is een goed startpunt, maar het is geen garantie. U moet nog steeds een formeel verzoek indienen, onderzoeken laten uitvoeren en de procedure doorlopen. Met een goede voorbereiding is de kans op een positief besluit reëel.",
  "twijfel":
    "Een twijfelgeval betekent dat er zowel kansen als risico's zijn. Er zijn factoren die in uw voordeel werken, maar ook obstakels die de procedure kunnen bemoeilijken of vertragen. Met de juiste aanpak — zoals extra onderzoek of politiek draagvlak opbouwen — kan de kans op goedkeuring worden vergroot. Zonder die aanpak is de uitkomst onzeker.",
  "no-go":
    "Een ongunstige score betekent dat de locatie of het beleid meerdere rode vlaggen heeft. Dat wil niet zeggen dat een bestemmingswijziging onmogelijk is, maar de drempel is hoog. Het verdient aanbeveling om eerst de meest kritieke blokkades in kaart te brengen en te beoordelen of verdere investering zinvol is.",
};

const CARD: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
  overflow: "hidden",
};

function KritiekeFactorBlok({ data }: { data: AdviesKaartData["kritiekeFactor"] }) {
  const prec = data.precedent ? PRECEDENT_CONFIG[data.precedent.uitkomst] : null;
  const PrecIcon = prec?.Icon;

  return (
    <div style={CARD}>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0f62fe" }}>
          <Uitleg term="Kritieke factor" uitleg="De meest bepalende reden waarom uw aanvraag kansrijk of riskant is — de factor die het zwaarst weegt in het oordeel van de gemeente.">
            Kritieke factor
          </Uitleg>
        </span>
        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#161616", lineHeight: 1.4 }}>
          {data.titel}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "#525252", lineHeight: 1.6 }}>
          {data.uitleg}
        </p>

        {prec && PrecIcon && data.precedent && (
          <div style={{
            marginTop: "0.25rem", padding: "0.75rem",
            backgroundColor: prec.bg,
            border: `1px solid ${prec.borderKleur}`,
            borderRadius: "8px",
            display: "flex", alignItems: "flex-start", gap: "0.5rem",
          }}>
            <div style={{
              width: "1.25rem", height: "1.25rem", borderRadius: "50%", flexShrink: 0,
              backgroundColor: prec.kleur,
              display: "flex", alignItems: "center", justifyContent: "center", marginTop: "0.1rem",
            }}>
              <PrecIcon size={10} style={{ color: "#ffffff" }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: prec.kleur, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
                  <Uitleg term="Precedent" uitleg="Een eerder vergelijkbaar verzoek in uw regio dat al vergund of afgewezen is. Gemeenten en rechters kijken hier naar bij nieuwe aanvragen.">Precedent</Uitleg> · {prec.label}
                </span>
                {data.precedent.referentie && (
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616" }}>
                    {data.precedent.referentie}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "#161616", marginTop: "0.25rem", lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "break-word" }}>
                {data.precedent.omschrijving}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerborgenRisicoBlok({ data }: { data: AdviesKaartData["verborgenRisico"] }) {
  return (
    <div style={CARD}>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#da1e28" }}>
          <Uitleg term="Verborgen risico" uitleg="Een risico dat niet zichtbaar is in de score, maar uw traject wel kan dwarsbomen — zoals lokale politiek, bezwaren van buren of milieuregels.">
            Verborgen risico
          </Uitleg>
        </span>
        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#161616", lineHeight: 1.4 }}>
          {data.titel}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "#525252", lineHeight: 1.6 }}>
          {data.uitleg}
        </p>

        {data.mitigatie && (
          <div style={{
            marginTop: "0.25rem", padding: "0.75rem",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            display: "flex", alignItems: "flex-start", gap: "0.5rem",
          }}>
            <Flag size={14} style={{ color: "#b28600", flexShrink: 0, marginTop: "0.2rem" }} />
            <div>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#7d4300", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Actie nu
              </span>
              <p style={{ fontSize: "0.8125rem", color: "#161616", marginTop: "0.125rem", lineHeight: 1.5 }}>
                {data.mitigatie}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GemeenteStrategieBlok({ data }: { data: AdviesKaartData["gemeenteStrategie"] }) {
  return (
    <div style={CARD}>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8a3ffc" }}>
          <Uitleg term="Gemeente-strategie" uitleg="Concrete tips over hoe u het beste met uw gemeente kunt communiceren om de kans op een positief besluit te vergroten.">
            Gemeente-strategie
          </Uitleg>
        </span>
        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#161616", lineHeight: 1.4 }}>
          {data.titel}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "#525252", lineHeight: 1.6 }}>
          {data.uitleg}
        </p>
      </div>
    </div>
  );
}

export function AdviesHeader({ data }: { data: AdviesKaartData }) {
  const cfg = ADVIES_CONFIG[data.advies];
  const AdviesIcon = cfg.Icon;
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      ...CARD,
      backgroundColor: cfg.bg,
      boxShadow: `0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px ${cfg.accentKleur}30`,
    }}>
      <div style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{
          width: "2.5rem", height: "2.5rem", borderRadius: "50%", flexShrink: 0,
          backgroundColor: cfg.accentKleur,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AdviesIcon size={18} style={{ color: "#ffffff" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: cfg.kleur }}>
              Advies
            </span>
            <span style={{
              fontSize: "0.75rem", fontWeight: 700, padding: "0.125rem 0.625rem",
              backgroundColor: cfg.accentKleur, color: "#ffffff", borderRadius: "4px",
            }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: cfg.kleur, lineHeight: 1.5 }}>
            {data.kernzin}
          </p>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.25rem",
              background: "none", border: "none", padding: "0.25rem 0", cursor: "pointer",
              fontSize: "0.75rem", color: cfg.kleur, fontFamily: "inherit", opacity: 0.8,
            }}
          >
            {open ? "Minder uitleg" : "Wat betekent dit?"}
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {open && (
            <p style={{ fontSize: "0.875rem", color: cfg.kleur, lineHeight: 1.5, marginTop: "0.375rem", opacity: 0.85 }}>
              {ADVIES_UITLEG[data.advies]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdviesDetails({ data }: { data: AdviesKaartData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#161616", margin: "0.75rem 0 0" }}>
        Wat dit voor jou betekent
      </h3>
      <KritiekeFactorBlok data={data.kritiekeFactor} />
      <GemeenteStrategieBlok data={data.gemeenteStrategie} />
      <VerborgenRisicoBlok data={data.verborgenRisico} />

      {data.dataGaps.length > 0 && (
        <div style={{ ...CARD }}>
          <div style={{ height: "4px", backgroundColor: "#8d8d8d" }} />
          <div style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <Information size={15} style={{ color: "#525252", flexShrink: 0 }} />
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#525252" }}>
                Ontbrekende informatie die de uitkomst kan beïnvloeden
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.dataGaps.map((gap, i) => {
                const impact = IMPACT_CONFIG[gap.impact];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                    <CircleDash size={14} style={{ color: impact.kleur, flexShrink: 0, marginTop: "0.2rem" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "0.8125rem", color: "#161616" }}>{gap.omschrijving}</span>
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.6875rem", fontWeight: 600, color: impact.kleur }}>
                        {impact.label} impact
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
