"use client";

import { useState } from "react";
import { Button, InlineLoading } from "@carbon/react";
import { Email, Copy, Launch, UserIdentification, Warning } from "@carbon/icons-react";
import { MOCK_EIGENAREN } from "@/lib/percelenMockData";
import type { KansrijkPerceel } from "@/types";

interface Props {
  perceel: KansrijkPerceel;
  onSluiten: () => void;
}

type Fase = "gdpr" | "laden" | "data";

export function EigenaarKaart({ perceel, onSluiten }: Props) {
  const [fase, setFase] = useState<Fase>("gdpr");
  const [emailGegenereerd, setEmailGegenereerd] = useState<string | null>(null);
  const [emailLaden, setEmailLaden] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  const eigenaar = MOCK_EIGENAREN[perceel.id];

  async function bevestigGdpr() {
    setFase("laden");
    await new Promise((r) => setTimeout(r, 1200));
    setFase("data");
  }

  async function genereerEmail() {
    if (!eigenaar) return;
    setEmailLaden(true);
    try {
      const res = await fetch("/api/eigenaar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perceel, eigenaar }),
      });
      if (res.ok) {
        const { email } = await res.json();
        setEmailGegenereerd(email);
      }
    } finally {
      setEmailLaden(false);
    }
  }

  function kopieerAdres() {
    if (!eigenaar) return;
    navigator.clipboard.writeText(eigenaar.correspondentieadres);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  return (
    <div style={{
      margin: "0.5rem 0 1rem",
      border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
      backgroundColor: "var(--cds-layer-01, #f4f4f4)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1rem", borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
        backgroundColor: "#ffffff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <UserIdentification size={16} style={{ color: "#525252" }} />
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Eigenaarsinformatie — {perceel.perceelId}</span>
        </div>
        <button onClick={onSluiten} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#525252" }}>
          Sluiten ✕
        </button>
      </div>

      <div style={{ padding: "1.25rem" }}>

        {fase === "gdpr" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "36rem" }}>
            <div style={{
              display: "flex", gap: "0.75rem", padding: "0.875rem 1rem",
              backgroundColor: "#fff8f1", borderLeft: "4px solid #ff832b",
            }}>
              <Warning size={20} style={{ color: "#ff832b", flexShrink: 0, marginTop: "0.125rem" }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#3e1a00", marginBottom: "0.375rem" }}>
                  AVG-bevestiging vereist
                </p>
                <p style={{ fontSize: "0.8125rem", color: "#3e1a00", lineHeight: 1.5 }}>
                  Eigenaarsinformatie uit het Kadaster is openbaar maar niet vrij te gebruiken voor ongerichte marketing.
                  Kadasterdata mag uitsluitend worden gebruikt met een juridische grondslag conform AVG artikel 6.
                  Raadpleeg uw juridisch adviseur over de toepasselijke grondslag voor uw situatie.
                </p>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#161616", lineHeight: 1.6 }}>
              Door op "Bevestigen" te klikken verklaar ik dat:
            </p>
            <ul style={{ fontSize: "0.875rem", color: "#161616", lineHeight: 1.8, paddingLeft: "1.25rem", margin: 0 }}>
              <li>Ik deze gegevens gebruik conform de AVG</li>
              <li>Ik deze gegevens uitsluitend gebruik voor zakelijke prospectie</li>
              <li>Ik beschik over een rechtsgeldige grondslag voor verwerking</li>
              <li>Ik begrijp dat Percelo deze opvraging logt voor fair-use monitoring</li>
            </ul>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Button size="sm" onClick={bevestigGdpr}>
                Ik bevestig — eigenaar ophalen
              </Button>
              <Button size="sm" kind="ghost" onClick={onSluiten}>
                Annuleren
              </Button>
            </div>
          </div>
        )}

        {fase === "laden" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 0" }}>
            <InlineLoading status="active" description="Kadaster raadplegen..." />
          </div>
        )}

        {fase === "data" && eigenaar && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Eigenaargegevens */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <p style={{ fontSize: "0.75rem", color: "#525252", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                {eigenaar.type}
              </p>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "#161616" }}>{eigenaar.naam}</p>
              <p style={{ fontSize: "0.875rem", color: "#525252" }}>{eigenaar.correspondentieadres}</p>
              {eigenaar.kvkNummer && (
                <p style={{ fontSize: "0.8125rem", color: "#525252" }}>KvK-nummer: {eigenaar.kvkNummer}</p>
              )}
            </div>

            {/* Contactacties */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#161616" }}>Contactacties</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Button
                  size="sm"
                  kind="secondary"
                  renderIcon={Email}
                  onClick={genereerEmail}
                  disabled={emailLaden}
                >
                  {emailLaden ? <InlineLoading description="Genereren..." status="active" /> : "Concept-e-mail schrijven"}
                </Button>
                <Button
                  size="sm"
                  kind="tertiary"
                  renderIcon={Copy}
                  onClick={kopieerAdres}
                >
                  {gekopieerd ? "Gekopieerd!" : "Adres kopiëren"}
                </Button>
                {eigenaar.kvkNummer && (
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={Launch}
                    href={`https://www.kvk.nl/zoeken/?q=${eigenaar.kvkNummer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    KvK-register
                  </Button>
                )}
              </div>
            </div>

            {/* Gegenereerde e-mail */}
            {emailGegenereerd && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#161616" }}>Concept-e-mail (bewerkbaar)</p>
                <textarea
                  value={emailGegenereerd}
                  onChange={(e) => setEmailGegenereerd(e.target.value)}
                  style={{
                    width: "100%", minHeight: "12rem", padding: "0.75rem",
                    fontSize: "0.8125rem", lineHeight: 1.6, fontFamily: "inherit",
                    border: "1px solid #c6c6c6", backgroundColor: "#ffffff",
                    resize: "vertical", boxSizing: "border-box",
                  }}
                />
                <Button
                  size="sm"
                  kind="ghost"
                  renderIcon={Copy}
                  onClick={() => { navigator.clipboard.writeText(emailGegenereerd); }}
                >
                  E-mail kopiëren
                </Button>
              </div>
            )}

            <p style={{ fontSize: "0.7rem", color: "#8d8d8d", lineHeight: 1.5 }}>
              ⚠ Dit zijn demonstratiegegevens. Echte Kadaster-koppeling vereist een contract met het Kadaster (KIK/Digitaal Loket) — beschikbaar in de Business-tier.
            </p>
          </div>
        )}

        {fase === "data" && !eigenaar && (
          <p style={{ fontSize: "0.875rem", color: "#525252" }}>
            Geen eigenaarsinformatie beschikbaar voor dit perceel in de demomodus.
          </p>
        )}
      </div>
    </div>
  );
}
