// PDOK Locatieserver — geocoding voor Nederlandse adressen
const PDOK_SUGGEST = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest";
const PDOK_LOOKUP = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup";

export interface PDOKSuggestie {
  id: string;
  weergavenaam: string;
  type: string;
  score: number;
}

export interface PDOKLocatie {
  id: string;
  weergavenaam: string;
  adresType?: string;
  straatnaam?: string;
  huisnummer?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  gemeentenaam?: string;
  provincienaam?: string;
  waterschapsnaam?: string;
  centroide_ll?: string; // "POINT(lon lat)"
  adresseerbaarobject_id?: string;
  gekoppeld_perceel?: string[]; // e.g. ["VKV00-G-305"]
}

export async function suggesteerAdres(query: string): Promise<PDOKSuggestie[]> {
  const params = new URLSearchParams({
    q: query,
    fq: "type:(adres OR perceel)",
    rows: "8",
  });
  const res = await fetch(`${PDOK_SUGGEST}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.response?.docs ?? []) as PDOKSuggestie[];
}

export async function lookupLocatie(id: string): Promise<PDOKLocatie | null> {
  const params = new URLSearchParams({ id });
  const res = await fetch(`${PDOK_LOOKUP}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data.response?.docs?.[0];
  if (!doc) return null;
  return doc as PDOKLocatie;
}

export function parseCentroide(centroide_ll?: string): { lat: number; lon: number } | null {
  if (!centroide_ll) return null;
  // format: "POINT(5.1234 52.1234)"
  const match = centroide_ll.match(/POINT\(([0-9.]+) ([0-9.]+)\)/);
  if (!match) return null;
  return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
}
