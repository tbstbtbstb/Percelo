"use client";

import { useState, useEffect, useRef } from "react";
import { TextInput, Loading } from "@carbon/react";
import { Location } from "@carbon/icons-react";
import { lookupLocatie, parseCentroide } from "@/lib/pdok";
import type { Perceel } from "@/types";
import type { PDOKSuggestie } from "@/lib/pdok";

interface Props {
  onPerceelGeselecteerd: (perceel: Perceel) => void;
  isLoading: boolean;
  externalValue?: string;
}

export function AddressSearch({ onPerceelGeselecteerd, isLoading, externalValue }: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (externalValue !== undefined) {
      setQuery(externalValue);
    }
  }, [externalValue]);
  const [suggesties, setSuggesties] = useState<PDOKSuggestie[]>([]);
  const [loadingSuggesties, setLoadingSuggesties] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (query.length < 3) {
      setSuggesties([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggesties(true);
      try {
        const res = await fetch(`/api/address-suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggesties(data);
        setOpen(data.length > 0);
      } finally {
        setLoadingSuggesties(false);
      }
    }, 300);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function selecteerSuggestie(sug: PDOKSuggestie) {
    skipNextFetchRef.current = true;
    setQuery(sug.weergavenaam);
    setOpen(false);

    const locatie = await lookupLocatie(sug.id);
    if (!locatie) return;

    const coords = parseCentroide(locatie.centroide_ll);
    if (!coords) return;

    const perceel: Perceel = {
      adres: locatie.weergavenaam ?? sug.weergavenaam,
      postcode: locatie.postcode,
      gemeente: locatie.gemeentenaam,
      provincie: locatie.provincienaam,
      waterschap: locatie.waterschapsnaam,
      lat: coords.lat,
      lon: coords.lon,
      bagId: locatie.id,
      adresseerbaarobjectId: locatie.adresseerbaarobject_id,
      gekoppeldPerceel: locatie.gekoppeld_perceel,
      // Bij perceel-type resultaten geeft de locatieserver de oppervlakte direct mee
      perceelOppervlakte: locatie.kadastrale_grootte ?? undefined,
    };

    onPerceelGeselecteerd(perceel);
  }

  return (
    <div ref={containerRef} style={{ position: "relative", "--cds-layer-01": "#ffffff", "--cds-layer": "#ffffff" } as React.CSSProperties}>
      <TextInput
        id="address-search"
        labelText=""
        hideLabel
        placeholder="Voer een adres of perceelnummer in..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isLoading}
        size="lg"
      />
      {loadingSuggesties && (
        <div style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)" }}>
          <Loading small withOverlay={false} />
        </div>
      )}

      {open && suggesties.length > 0 && (
        <ul
          style={{
            position: "absolute",
            zIndex: 9999,
            top: "100%",
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: "none",
            backgroundColor: "var(--cds-layer-01, #f4f4f4)",
            border: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {suggesties.map((sug) => (
            <li key={sug.id}>
              <button
                onClick={() => selecteerSuggestie(sug)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "var(--cds-text-primary, #161616)",
                  borderBottom: "1px solid var(--cds-border-subtle-00, #e0e0e0)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cds-layer-hover-01, #e8e8e8)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Location size={16} style={{ flexShrink: 0, color: "var(--cds-text-secondary, #525252)" }} />
                {sug.weergavenaam}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
