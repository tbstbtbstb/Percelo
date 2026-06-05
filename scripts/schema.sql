-- Percelo — PostGIS schema voor kansrijke percelen
-- Vereist: PostgreSQL 14+ met PostGIS extensie (bijv. Supabase of Neon + pg_extension)
-- Setup: psql -U postgres -d percelo -f schema.sql

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Hoofdtabel ──────────────────────────────────────────────────────────────

CREATE TABLE kansrijke_percelen (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perceel_id              TEXT NOT NULL UNIQUE,        -- BRK-identificatie, bijv. "HLM00-A-1842"
  gemeente                TEXT NOT NULL,
  provincie               TEXT NOT NULL,
  oppervlakte_m2          INTEGER NOT NULL,

  -- Geometrie (EPSG:4326)
  lat                     DOUBLE PRECISION NOT NULL,
  lon                     DOUBLE PRECISION NOT NULL,
  geometrie               GEOMETRY(POLYGON, 4326),
  centroide               GEOMETRY(POINT, 4326)
                            GENERATED ALWAYS AS (ST_Centroid(geometrie)) STORED,

  -- Bestemmingsplan (van Ruimtelijkeplannen.nl)
  bestemmingsplan_naam    TEXT,
  bestemming_code         TEXT,
  bestemming_naam         TEXT,
  idn                     TEXT,                        -- planidentificatienummer

  -- Scores
  slagingskans            SMALLINT CHECK (slagingskans BETWEEN 0 AND 100),
  natura2000_score        SMALLINT,
  woningdruk_score        SMALLINT,

  -- Financieel
  agrarische_prijs_per_m2 NUMERIC(8, 2),
  geschatte_aankoopprijs  INTEGER,
  bouwgrond_waarde_min    INTEGER,
  bouwgrond_waarde_max    INTEGER,
  proceskosten_min        INTEGER,
  proceskosten_max        INTEGER,
  marge_min               INTEGER,
  marge_max               INTEGER,
  roi_pct                 NUMERIC(6, 1),

  -- Metadata
  score_berekend_op       TIMESTAMPTZ,
  gecreeerd_op            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bijgewerkt_op           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Eigenaarlog (AVG-compliance) ────────────────────────────────────────────

CREATE TABLE eigenaar_opvragingen (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perceel_id      TEXT NOT NULL REFERENCES kansrijke_percelen(perceel_id),
  gebruiker_id    TEXT NOT NULL,                       -- Clerk user ID
  opgev raagd_op  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash         TEXT,                                -- gehashd voor fair-use monitoring
  gdpr_akkoord    BOOLEAN NOT NULL DEFAULT FALSE,
  gdpr_akkoord_op TIMESTAMPTZ
);

-- ─── Indexen ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_kansrijke_gemeente   ON kansrijke_percelen(gemeente);
CREATE INDEX idx_kansrijke_provincie  ON kansrijke_percelen(provincie);
CREATE INDEX idx_kansrijke_score      ON kansrijke_percelen(slagingskans DESC NULLS LAST);
CREATE INDEX idx_kansrijke_marge      ON kansrijke_percelen(marge_max DESC NULLS LAST);
CREATE INDEX idx_kansrijke_roi        ON kansrijke_percelen(roi_pct DESC NULLS LAST);
CREATE INDEX idx_kansrijke_geometrie  ON kansrijke_percelen USING GIST(geometrie);
CREATE INDEX idx_kansrijke_centroide  ON kansrijke_percelen USING GIST(centroide);

-- ─── Top-kandidaten view ──────────────────────────────────────────────────────

CREATE VIEW top_kansrijke_percelen AS
SELECT
  *,
  -- Samengestelde rankscore: 40% slagingskans, 40% marge, 20% ROI (gecapped op 500%)
  ROUND(
    0.40 * COALESCE(slagingskans, 0)
    + 0.40 * LEAST(COALESCE(marge_min, 0) / 5000.0, 100)
    + 0.20 * LEAST(COALESCE(roi_pct, 0) / 5.0, 100)
  , 1) AS rankscore
FROM kansrijke_percelen
WHERE
  slagingskans >= 45
  AND marge_min > 50000
ORDER BY rankscore DESC;

-- ─── Triggerfunction: bijgewerkt_op auto-update ───────────────────────────────

CREATE OR REPLACE FUNCTION set_bijgewerkt_op()
RETURNS TRIGGER AS $$
BEGIN NEW.bijgewerkt_op = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kansrijke_percelen_bijgewerkt
  BEFORE UPDATE ON kansrijke_percelen
  FOR EACH ROW EXECUTE FUNCTION set_bijgewerkt_op();
