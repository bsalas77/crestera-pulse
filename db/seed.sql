-- Executive Dashboard - demo seed data

-- Demo users. Password for all accounts is: password
-- Hash is bcrypt($2b$10, "password") -- verified at login via bcrypt.compare
INSERT INTO users (username, password, role) VALUES
  ('ciso',  '$2b$10$AOXHFzl18mBnjrfLrrxTOeNwKDITqg8ZwYe2iQVJWP3oqWuQYwem6', 'CISO'),
  ('cio',   '$2b$10$AOXHFzl18mBnjrfLrrxTOeNwKDITqg8ZwYe2iQVJWP3oqWuQYwem6', 'CIO'),
  ('cro',   '$2b$10$AOXHFzl18mBnjrfLrrxTOeNwKDITqg8ZwYe2iQVJWP3oqWuQYwem6', 'CRO'),
  ('board', '$2b$10$AOXHFzl18mBnjrfLrrxTOeNwKDITqg8ZwYe2iQVJWP3oqWuQYwem6', 'BOARD');

-- Organizations
INSERT INTO organizations (id, name, type, parent_id) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Retail Banking', 'business_unit', NULL),
  ('11111111-1111-1111-1111-111111111102', 'Commercial Banking', 'business_unit', NULL),
  ('11111111-1111-1111-1111-111111111103', 'Wealth Management', 'business_unit', NULL),
  ('11111111-1111-1111-1111-111111111104', 'IT & Operations', 'business_unit', NULL),
  ('11111111-1111-1111-1111-111111111105', 'Third-Party / Vendor', 'business_unit', NULL);

-- Assets
INSERT INTO assets (id, name, type, criticality, environment, business_unit_id, owner) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Core Banking Mainframe', 'server', 5, 'prod', '11111111-1111-1111-1111-111111111104', 'IT Infrastructure'),
  ('22222222-2222-2222-2222-222222222202', 'Online Banking Web Tier', 'server', 5, 'prod', '11111111-1111-1111-1111-111111111101', 'IT Infrastructure'),
  ('22222222-2222-2222-2222-222222222203', 'Mobile Banking API Gateway', 'application', 5, 'prod', '11111111-1111-1111-1111-111111111101', 'App Engineering'),
  ('22222222-2222-2222-2222-222222222204', 'Customer Data Warehouse', 'database', 5, 'prod', '11111111-1111-1111-1111-111111111104', 'Data Engineering'),
  ('22222222-2222-2222-2222-222222222205', 'ATM Fleet Controller', 'server', 4, 'prod', '11111111-1111-1111-1111-111111111101', 'IT Infrastructure'),
  ('22222222-2222-2222-2222-222222222206', 'Branch Teller Workstations', 'endpoint', 3, 'prod', '11111111-1111-1111-1111-111111111101', 'IT Support'),
  ('22222222-2222-2222-2222-222222222207', 'Legacy Loan Origination System', 'application', 4, 'prod', '11111111-1111-1111-1111-111111111102', 'App Engineering'),
  ('22222222-2222-2222-2222-222222222208', 'Wealth CRM', 'application', 3, 'prod', '11111111-1111-1111-1111-111111111103', 'App Engineering'),
  ('22222222-2222-2222-2222-222222222209', 'Employee Directory Service', 'application', 2, 'dev', '11111111-1111-1111-1111-111111111104', 'IT Infrastructure'),
  ('22222222-2222-2222-2222-222222222210', 'Fraud Detection Engine', 'application', 5, 'prod', '11111111-1111-1111-1111-111111111101', 'Risk Engineering');

-- Applications
INSERT INTO applications (id, name, category, rto_hours, rpo_hours, sla_uptime_target, business_owner, technical_owner, business_unit_id) VALUES
  ('33333333-3333-3333-3333-333333333301', 'Core Banking Platform', 'core_banking', 2, 1, 99.99, 'Retail Banking COO', 'IT Infrastructure Director', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333302', 'Online Banking Portal', 'online_banking', 4, 1, 99.95, 'Digital Banking Lead', 'App Engineering Director', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333303', 'Mobile Banking App', 'mobile', 4, 1, 99.9, 'Digital Banking Lead', 'Mobile Engineering Lead', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333304', 'ATM Network', 'atm', 8, 4, 99.5, 'Retail Ops Director', 'IT Infrastructure Director', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333305', 'Wealth CRM', 'crm', 24, 8, 99.0, 'Wealth Management Director', 'App Engineering Director', '11111111-1111-1111-1111-111111111103');

-- Risks
INSERT INTO risks (id, category, title, description, inherent_score, residual_score, status, owner, business_unit_id) VALUES
  ('44444444-4444-4444-4444-444444444401', 'cyber', 'Ransomware exposure via unpatched endpoints', 'Branch endpoints running outdated OS versions increase ransomware attack surface.', 8.5, 5.2, 'open', 'CISO', '11111111-1111-1111-1111-111111111101'),
  ('44444444-4444-4444-4444-444444444402', 'cyber', 'Third-party vendor data access', 'Core banking vendor has broad access to customer PII with limited monitoring.', 7.8, 6.1, 'open', 'CISO', '11111111-1111-1111-1111-111111111105'),
  ('44444444-4444-4444-4444-444444444403', 'operational', 'Legacy loan origination system EOL', 'Loan origination system reaches end-of-support in 9 months with no replacement plan.', 6.5, 6.0, 'open', 'CIO', '11111111-1111-1111-1111-111111111102'),
  ('44444444-4444-4444-4444-444444444404', 'operational', 'Single data center for core banking', 'No active-active failover for core banking mainframe.', 7.0, 4.5, 'mitigated', 'CIO', '11111111-1111-1111-1111-111111111104'),
  ('44444444-4444-4444-4444-444444444405', 'credit', 'Concentration risk in commercial loan portfolio', 'High exposure to commercial real estate in a single region.', 7.2, 6.8, 'open', 'CRO', '11111111-1111-1111-1111-111111111102'),
  ('44444444-4444-4444-4444-444444444406', 'compliance', 'Delayed BSA/AML alert review', 'Alert backlog exceeds regulatory review SLA during peak volume periods.', 6.8, 4.9, 'open', 'CRO', '11111111-1111-1111-1111-111111111101'),
  ('44444444-4444-4444-4444-444444444407', 'market', 'Interest rate sensitivity on deposit book', 'Rising rate environment increases deposit repricing risk.', 6.0, 5.5, 'open', 'CRO', '11111111-1111-1111-1111-111111111102'),
  ('44444444-4444-4444-4444-444444444408', 'liquidity', 'Uninsured deposit concentration', 'Elevated share of uninsured deposits among commercial clients.', 6.9, 6.2, 'open', 'CRO', '11111111-1111-1111-1111-111111111102');

-- Controls
INSERT INTO controls (id, name, framework, type, effectiveness_score, owner) VALUES
  ('55555555-5555-5555-5555-555555555501', 'Endpoint Detection & Response (EDR)', 'NIST', 'detective', 82, 'CISO'),
  ('55555555-5555-5555-5555-555555555502', 'Patch Management Program', 'CIS', 'preventive', 68, 'CISO'),
  ('55555555-5555-5555-5555-555555555503', 'Vendor Risk Assessment Program', 'FFIEC', 'preventive', 74, 'CISO'),
  ('55555555-5555-5555-5555-555555555504', 'Data Loss Prevention (DLP)', 'NIST', 'preventive', 71, 'CISO'),
  ('55555555-5555-5555-5555-555555555505', 'Disaster Recovery / Failover Testing', 'ISO', 'corrective', 88, 'CIO'),
  ('55555555-5555-5555-5555-555555555506', 'Change Management Process', 'ISO', 'preventive', 79, 'CIO'),
  ('55555555-5555-5555-5555-555555555507', 'BSA/AML Transaction Monitoring', 'FFIEC', 'detective', 65, 'CRO'),
  ('55555555-5555-5555-5555-555555555508', 'Credit Concentration Limits Policy', 'FFIEC', 'preventive', 77, 'CRO');

-- Risk <-> Control mapping
INSERT INTO risk_controls (risk_id, control_id) VALUES
  ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555504'),
  ('44444444-4444-4444-4444-444444444403', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555505'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555507'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444408', '55555555-5555-5555-5555-555555555508');

-- Dates are relative to the day the database is first created, so the demo
-- always shows the last few months rather than going stale.
-- Incidents
INSERT INTO incidents (id, type, severity, start_time, end_time, impact_description, impact_financial, impact_regulatory, business_unit_id) VALUES
  ('66666666-6666-6666-6666-666666666601', 'security', 'high', (CURRENT_DATE - 100 + TIME '03:14:00'), (CURRENT_DATE - 100 + TIME '07:40:00'), 'Phishing-driven credential compromise on branch workstation, contained by EDR.', 12000, FALSE, '11111111-1111-1111-1111-111111111101'),
  ('66666666-6666-6666-6666-666666666602', 'security', 'critical', (CURRENT_DATE - 61 + TIME '22:05:00'), (CURRENT_DATE - 60 + TIME '05:30:00'), 'Attempted ransomware deployment via vendor VPN access, contained before encryption.', 45000, TRUE, '11111111-1111-1111-1111-111111111105'),
  ('66666666-6666-6666-6666-666666666603', 'it', 'medium', (CURRENT_DATE - 40 + TIME '09:00:00'), (CURRENT_DATE - 40 + TIME '11:15:00'), 'Online banking portal degraded performance following failed deployment.', 8000, FALSE, '11111111-1111-1111-1111-111111111101'),
  ('66666666-6666-6666-6666-666666666604', 'it', 'high', (CURRENT_DATE - 113 + TIME '14:00:00'), (CURRENT_DATE - 113 + TIME '19:45:00'), 'Core banking mainframe outage impacting teller transactions network-wide.', 150000, TRUE, '11111111-1111-1111-1111-111111111104'),
  ('66666666-6666-6666-6666-666666666605', 'fraud', 'high', (CURRENT_DATE - 23 + TIME '00:00:00'), (CURRENT_DATE - 22 + TIME '00:00:00'), 'Card-not-present fraud ring targeting online banking customers.', 92000, FALSE, '11111111-1111-1111-1111-111111111101'),
  ('66666666-6666-6666-6666-666666666606', 'operational', 'medium', (CURRENT_DATE - 43 + TIME '06:00:00'), (CURRENT_DATE - 43 + TIME '09:20:00'), 'ATM fleet controller software error caused regional cash dispense outages.', 15000, FALSE, '11111111-1111-1111-1111-111111111101');

-- Incident <-> Asset mapping
INSERT INTO incident_assets (incident_id, asset_id) VALUES
  ('66666666-6666-6666-6666-666666666601', '22222222-2222-2222-2222-222222222206'),
  ('66666666-6666-6666-6666-666666666602', '22222222-2222-2222-2222-222222222201'),
  ('66666666-6666-6666-6666-666666666603', '22222222-2222-2222-2222-222222222202'),
  ('66666666-6666-6666-6666-666666666604', '22222222-2222-2222-2222-222222222201'),
  ('66666666-6666-6666-6666-666666666605', '22222222-2222-2222-2222-222222222210'),
  ('66666666-6666-6666-6666-666666666606', '22222222-2222-2222-2222-222222222205');

-- Loss events
INSERT INTO loss_events (id, type, amount, currency, date, cause, business_unit_id) VALUES
  ('77777777-7777-7777-7777-777777777701', 'fraud', 92000, 'USD', (CURRENT_DATE - 22), 'Card-not-present fraud ring', '11111111-1111-1111-1111-111111111101'),
  ('77777777-7777-7777-7777-777777777702', 'cyber', 45000, 'USD', (CURRENT_DATE - 60), 'Vendor VPN ransomware attempt remediation', '11111111-1111-1111-1111-111111111105'),
  ('77777777-7777-7777-7777-777777777703', 'operational', 150000, 'USD', (CURRENT_DATE - 113), 'Core banking outage - transaction reprocessing and SLA credits', '11111111-1111-1111-1111-111111111104'),
  ('77777777-7777-7777-7777-777777777704', 'operational', 15000, 'USD', (CURRENT_DATE - 43), 'ATM outage - cash logistics and customer remediation', '11111111-1111-1111-1111-111111111101'),
  ('77777777-7777-7777-7777-777777777705', 'credit', 320000, 'USD', (CURRENT_DATE - 72), 'Commercial real estate loan charge-off', '11111111-1111-1111-1111-111111111102'),
  ('77777777-7777-7777-7777-777777777706', 'fraud', 27500, 'USD', (CURRENT_DATE - 148), 'Check kiting scheme', '11111111-1111-1111-1111-111111111101');

-- Metrics
INSERT INTO metrics (id, name, category, role_relevance, value, unit, period_start, period_end, source_system) VALUES
  ('88888888-8888-8888-8888-888888888801', 'Security Posture Score', 'security', ARRAY['CISO','BOARD'], 78, 'score', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'GRC Platform'),
  ('88888888-8888-8888-8888-888888888802', 'Critical Vulnerabilities Open', 'security', ARRAY['CISO'], 14, 'count', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Vuln Scanner'),
  ('88888888-8888-8888-8888-888888888803', 'High Vulnerabilities Open', 'security', ARRAY['CISO'], 47, 'count', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Vuln Scanner'),
  ('88888888-8888-8888-8888-888888888804', 'Medium Vulnerabilities Open', 'security', ARRAY['CISO'], 132, 'count', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Vuln Scanner'),
  ('88888888-8888-8888-8888-888888888805', 'Low Vulnerabilities Open', 'security', ARRAY['CISO'], 289, 'count', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Vuln Scanner'),
  ('88888888-8888-8888-8888-888888888806', 'Mean Time to Detect', 'security', ARRAY['CISO'], 3.2, 'hours', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'SIEM'),
  ('88888888-8888-8888-8888-888888888807', 'Mean Time to Respond', 'security', ARRAY['CISO'], 6.4, 'hours', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'SIEM'),
  ('88888888-8888-8888-8888-888888888808', 'FFIEC Cybersecurity Maturity', 'security', ARRAY['CISO','BOARD'], 3.4, 'level', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'GRC Platform'),
  ('88888888-8888-8888-8888-888888888809', 'Core Banking Uptime', 'it', ARRAY['CIO','BOARD'], 99.97, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Monitoring'),
  ('88888888-8888-8888-8888-888888888810', 'Online Banking Uptime', 'it', ARRAY['CIO'], 99.92, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Monitoring'),
  ('88888888-8888-8888-8888-888888888811', 'Mobile Banking Uptime', 'it', ARRAY['CIO'], 99.95, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Monitoring'),
  ('88888888-8888-8888-8888-888888888812', 'ATM Availability', 'it', ARRAY['CIO'], 98.7, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Monitoring'),
  ('88888888-8888-8888-8888-888888888813', 'Call Center SLA Adherence', 'it', ARRAY['CIO'], 94.5, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Contact Center'),
  ('88888888-8888-8888-8888-888888888814', 'Change Failure Rate', 'it', ARRAY['CIO'], 8.2, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'CI/CD'),
  ('88888888-8888-8888-8888-888888888815', 'CPU Utilization', 'it', ARRAY['CIO'], 62, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Infra Monitoring'),
  ('88888888-8888-8888-8888-888888888816', 'Memory Utilization', 'it', ARRAY['CIO'], 71, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Infra Monitoring'),
  ('88888888-8888-8888-8888-888888888817', 'Storage Utilization', 'it', ARRAY['CIO'], 58, '%', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Infra Monitoring'),
  ('88888888-8888-8888-8888-888888888818', 'Enterprise Risk Index', 'risk', ARRAY['CRO','BOARD'], 6.1, 'score', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'GRC Platform'),
  ('88888888-8888-8888-8888-888888888819', 'Open Regulatory Issues', 'risk', ARRAY['CRO','BOARD'], 5, 'count', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'GRC Platform'),
  ('88888888-8888-8888-8888-888888888820', 'Upcoming Regulatory Deadlines', 'risk', ARRAY['CRO','BOARD'], 3, 'count', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'GRC Platform'),
  ('88888888-8888-8888-8888-888888888821', 'Trailing 12-Month Loss Total', 'financial', ARRAY['CRO','BOARD'], 649500, 'USD', date_trunc('month', CURRENT_DATE) - INTERVAL '12 months', date_trunc('month', CURRENT_DATE) - INTERVAL '1 second', 'Finance');

-- Five earlier months for the two metrics the dashboards chart as trends.
-- k = months before the latest (last month) period; the uptime dip lines up
-- with the core-banking outage loss event about four months back.
INSERT INTO metrics (name, category, role_relevance, value, unit, period_start, period_end, source_system)
SELECT h.name, h.category, h.roles, h.value, h.unit,
       date_trunc('month', CURRENT_DATE) - make_interval(months => h.k + 1),
       date_trunc('month', CURRENT_DATE) - make_interval(months => h.k) - INTERVAL '1 second',
       h.source
FROM (VALUES
  ('Security Posture Score', 'security', ARRAY['CISO','BOARD'], 70,    'score', 5, 'GRC Platform'),
  ('Security Posture Score', 'security', ARRAY['CISO','BOARD'], 72,    'score', 4, 'GRC Platform'),
  ('Security Posture Score', 'security', ARRAY['CISO','BOARD'], 71,    'score', 3, 'GRC Platform'),
  ('Security Posture Score', 'security', ARRAY['CISO','BOARD'], 74,    'score', 2, 'GRC Platform'),
  ('Security Posture Score', 'security', ARRAY['CISO','BOARD'], 76,    'score', 1, 'GRC Platform'),
  ('Core Banking Uptime',    'it',       ARRAY['CIO','BOARD'],  99.95, '%',     5, 'Monitoring'),
  ('Core Banking Uptime',    'it',       ARRAY['CIO','BOARD'],  99.93, '%',     4, 'Monitoring'),
  ('Core Banking Uptime',    'it',       ARRAY['CIO','BOARD'],  99.61, '%',     3, 'Monitoring'),
  ('Core Banking Uptime',    'it',       ARRAY['CIO','BOARD'],  99.96, '%',     2, 'Monitoring'),
  ('Core Banking Uptime',    'it',       ARRAY['CIO','BOARD'],  99.98, '%',     1, 'Monitoring')
) AS h(name, category, roles, value, unit, k, source);

-- Metric dimensions
INSERT INTO metric_dimensions (metric_id, key, value) VALUES
  ('88888888-8888-8888-8888-888888888802', 'framework', 'FFIEC'),
  ('88888888-8888-8888-8888-888888888808', 'framework', 'FFIEC'),
  ('88888888-8888-8888-8888-888888888809', 'application', 'core_banking'),
  ('88888888-8888-8888-8888-888888888810', 'application', 'online_banking'),
  ('88888888-8888-8888-8888-888888888811', 'application', 'mobile');
