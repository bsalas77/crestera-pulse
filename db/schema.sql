-- Executive Dashboard - PostgreSQL schema
-- Shared risk/asset/risk-event model for CISO / CIO / CRO / Board views

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2.1 organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'business_unit', 'region', 'line_of_business'
  parent_id UUID NULL REFERENCES organizations(id)
);

-- 2.2 assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'server', 'application', 'database', 'endpoint', 'user'
  criticality INTEGER NOT NULL CHECK (criticality BETWEEN 1 AND 5),
  environment TEXT NOT NULL, -- 'prod', 'dev', 'test'
  business_unit_id UUID REFERENCES organizations(id),
  owner TEXT
);

-- 2.3 applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'core_banking', 'online_banking', 'mobile', 'atm', 'crm', etc.
  rto_hours INTEGER,
  rpo_hours INTEGER,
  sla_uptime_target NUMERIC,
  business_owner TEXT,
  technical_owner TEXT,
  business_unit_id UUID REFERENCES organizations(id)
);

-- 2.4 risks
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'cyber', 'operational', 'credit', 'market', 'liquidity', 'compliance'
  title TEXT NOT NULL,
  description TEXT,
  inherent_score NUMERIC,
  residual_score NUMERIC,
  status TEXT NOT NULL, -- 'open', 'mitigated', 'closed'
  owner TEXT,
  business_unit_id UUID REFERENCES organizations(id)
);

-- 2.5 controls
CREATE TABLE controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  framework TEXT NOT NULL, -- 'NIST', 'CIS', 'ISO', 'FFIEC'
  type TEXT NOT NULL, -- 'preventive', 'detective', 'corrective'
  effectiveness_score NUMERIC,
  owner TEXT
);

-- 2.6 risk_controls
CREATE TABLE risk_controls (
  risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
  control_id UUID REFERENCES controls(id) ON DELETE CASCADE,
  PRIMARY KEY (risk_id, control_id)
);

-- 2.7 incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'security', 'it', 'operational', 'fraud'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NULL,
  impact_description TEXT,
  impact_financial NUMERIC NULL,
  impact_regulatory BOOLEAN NOT NULL DEFAULT FALSE,
  business_unit_id UUID REFERENCES organizations(id)
);

-- 2.8 incident_assets
CREATE TABLE incident_assets (
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, asset_id)
);

-- 2.9 loss_events
CREATE TABLE loss_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'fraud', 'cyber', 'operational', 'credit'
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  date DATE NOT NULL,
  cause TEXT,
  business_unit_id UUID REFERENCES organizations(id)
);

-- 2.10 metrics
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'security', 'it', 'risk', 'financial'
  role_relevance TEXT[] NOT NULL, -- e.g. ARRAY['CISO','CIO']
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL, -- '%', 'count', 'USD', etc.
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  source_system TEXT
);

-- 2.11 metric_dimensions
CREATE TABLE metric_dimensions (
  metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (metric_id, key, value)
);

-- Application logins. `password` holds a bcrypt hash, never plain text;
-- manage them with the manage-users tool (see README). Sessions issued before
-- password_changed_at stop working, so a password change signs the user out.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CISO', 'CIO', 'CRO', 'BOARD')),
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_business_unit ON assets(business_unit_id);
CREATE INDEX idx_applications_business_unit ON applications(business_unit_id);
CREATE INDEX idx_risks_business_unit ON risks(business_unit_id);
CREATE INDEX idx_risks_category ON risks(category);
CREATE INDEX idx_incidents_business_unit ON incidents(business_unit_id);
CREATE INDEX idx_incidents_type ON incidents(type);
CREATE INDEX idx_loss_events_business_unit ON loss_events(business_unit_id);
CREATE INDEX idx_metrics_category ON metrics(category);
CREATE INDEX idx_metrics_role_relevance ON metrics USING GIN(role_relevance);
