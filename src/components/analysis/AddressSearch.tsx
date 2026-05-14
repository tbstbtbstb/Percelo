"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { lookupLocatie, parseCentroide } from "@/lib/pdok";
import type { Perceel } from "@/types";
import type { PDOKSuggestie } from "@/lib/pdok";

interface Props {
  onPerceelGeselecteerd: (perceel: Perceel) => void;
  isLoading: boolean;
}

export function AddressSearch({ onPerceelGeselecteerd, isLoading }: Props) {
  const [query, setQuery] = useState("");
  const [suggesties, setSuggesties] = useState<PDOKSuggestie[]>([]);
  const [loadingSuggesties, setLoadingSuggesties] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    };

    onPerceelGeselecteerd(perceel);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Voer een adres of perceelnummer in..."
          className="pl-9 pr-4 h-12 text-base"
          disabled={isLoading}
        />
        {loadingSuggesties && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggesties.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="py-1">
            {suggesties.map((sug) => (
              <li key={sug.id}>
                <button
                  onClick={() => selecteerSuggestie(sug)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{sug.weergavenaam}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
